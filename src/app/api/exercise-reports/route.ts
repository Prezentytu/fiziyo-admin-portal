import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { resolveExerciseReportRoutingTarget } from '@/features/exercises/utils/exerciseReportRouting';
import { DISCORD_NO_MENTIONS, discordText } from '@/lib/server/discordText';
import { requireExerciseReviewer, requireSessionAuthor } from '@/lib/server/requestIdentity';
import type { ExerciseReport, ExerciseReportAuthor, ExerciseReportStatus } from '@/types/exercise-report.types';

const ADMIN_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://portal.fiziyo.pl';
const discordWebhookUrl = () => process.env.DISCORD_EXERCISE_REPORTS_WEBHOOK_URL;

const MAX_STORED_REPORTS = 500;
const id = z.string().trim().min(1).max(200);
const label = z.string().trim().min(1).max(300);
// A missing patient or exercise name must not reject the whole set report.
const displayName = z.string().trim().max(300);

// Optional fields come from GraphQL data, so they may be `null`.
const optional = <T extends z.ZodType>(schema: T) => schema.nullish().transform((value) => value ?? undefined);

const exerciseReportSchema = z.object({
  type: z.literal('EXERCISE_REPORT'),
  exerciseId: id,
  exerciseName: label,
  exerciseScope: optional(z.string().max(50)),
  exerciseStatus: optional(z.string().max(50)),
  organizationId: optional(id),
  reasonCategory: z.enum([
    'WRONG_DESCRIPTION',
    'WRONG_MEDIA',
    'CLINICAL_RISK',
    'DUPLICATE',
    'OUTDATED_CONTENT',
    'NEEDS_IMPROVEMENT',
    'OTHER',
  ]),
  description: z.string().trim().min(1).max(4000),
  attachments: optional(
    z.array(z.object({ name: z.string().max(255), size: z.number().nonnegative(), type: z.string().max(100) })).max(10)
  ),
});

const legacySetReportSchema = z.object({
  message: z.string().trim().min(1).max(4000),
  exerciseSet: z.object({
    id,
    name: label,
    exercises: z.array(z.object({ id, name: displayName, exerciseId: optional(id) })).max(100),
  }),
  patients: z.array(z.object({ id, name: displayName })).max(100),
  organizationId: z.string().trim().max(200),
});

const resolveSchema = z
  .object({ exerciseId: optional(id), reportId: optional(id), resolutionNote: optional(z.string().max(2000)) })
  .refine((body) => body.exerciseId || body.reportId, 'exerciseId albo reportId jest wymagane');

const badRequest = (error: string) => NextResponse.json({ success: false, error, message: error }, { status: 400 });

type LegacyExerciseReportRequest = z.infer<typeof legacySetReportSchema>;
type ExerciseReportRequest = z.infer<typeof exerciseReportSchema>;

function getReportStore(): ExerciseReport[] {
  const globalStore = globalThis as typeof globalThis & {
    __exerciseReportStore?: ExerciseReport[];
  };

  if (!globalStore.__exerciseReportStore) {
    globalStore.__exerciseReportStore = [];
  }

  return globalStore.__exerciseReportStore;
}

export async function GET(request: NextRequest) {
  const reviewer = await requireExerciseReviewer(request);
  if (!reviewer.ok) return reviewer.response;

  const searchParams = request.nextUrl.searchParams;
  const exerciseId = searchParams.get('exerciseId');
  const status = searchParams.get('status') as ExerciseReportStatus | null;
  const search = searchParams.get('search')?.trim().toLowerCase();
  const pageParam = Number(searchParams.get('page') ?? '1');
  const pageSizeParam = Number(searchParams.get('pageSize') ?? '20');
  const exerciseIdsParam = searchParams.get('exerciseIds');
  const exerciseIds = exerciseIdsParam
    ? new Set(
        exerciseIdsParam
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean)
      )
    : null;
  const page = Number.isFinite(pageParam) ? Math.max(pageParam, 1) : 1;
  const pageSize = Number.isFinite(pageSizeParam) ? Math.min(Math.max(pageSizeParam, 1), 100) : 20;

  const reports = getReportStore().filter((report) => {
    if (exerciseId && report.exerciseId !== exerciseId) {
      return false;
    }
    if (exerciseIds && !exerciseIds.has(report.exerciseId)) {
      return false;
    }
    if (status && report.status !== status) {
      return false;
    }
    if (search) {
      const searchable = `${report.exerciseName} ${report.description} ${report.reasonCategory} ${report.reportedBy.name || ''} ${
        report.reportedBy.email
      }`.toLowerCase();
      if (!searchable.includes(search)) {
        return false;
      }
    }
    return true;
  });

  const totalCount = reports.length;
  const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / pageSize);
  const safePage = totalPages === 0 ? 1 : Math.min(page, totalPages);
  const offset = (safePage - 1) * pageSize;
  const pageReports = reports.slice(offset, offset + pageSize);

  return NextResponse.json({
    success: true,
    reports: pageReports,
    page: {
      reports: pageReports,
      totalCount,
      page: safePage,
      pageSize,
      totalPages,
      hasPreviousPage: safePage > 1 && totalPages > 0,
      hasNextPage: safePage < totalPages,
    },
  });
}

export async function POST(request: NextRequest) {
  const session = await requireSessionAuthor();
  if (!session.ok) return session.response;

  try {
    const body: unknown = await request.json();

    if (isExerciseReportRequest(body)) {
      const parsed = exerciseReportSchema.safeParse(body);
      if (!parsed.success) return badRequest('Nieprawidłowe zgłoszenie ćwiczenia');
      return handleExerciseReport(parsed.data, session.author);
    }

    const parsed = legacySetReportSchema.safeParse(body);
    if (!parsed.success) return badRequest('Nieprawidłowe zgłoszenie zestawu');
    return handleLegacySetReport(parsed.data, session.author);
  } catch (error) {
    console.error('[API/exercise-reports] Error:', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json(
      { success: false, message: 'Wystąpił błąd podczas wysyłania zgłoszenia' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const reviewer = await requireExerciseReviewer(request);
  if (!reviewer.ok) return reviewer.response;

  try {
    const parsed = resolveSchema.safeParse(await request.json());
    if (!parsed.success) return badRequest('exerciseId albo reportId jest wymagane');
    const body = parsed.data;

    const store = getReportStore();
    const now = new Date().toISOString();
    let affectedCount = 0;

    for (const report of store) {
      const matchesById = body.reportId ? report.id === body.reportId : false;
      const matchesByExercise = body.exerciseId ? report.exerciseId === body.exerciseId : false;
      if ((matchesById || matchesByExercise) && report.status === 'OPEN') {
        report.status = 'RESOLVED';
        report.resolvedAt = now;
        report.resolvedByUserId = reviewer.clerkUserId;
        report.resolutionNote = body.resolutionNote;
        affectedCount += 1;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Zamknięto ${affectedCount} zgłoszeń`,
    });
  } catch (error) {
    console.error('[API/exercise-reports] PATCH error:', error);
    return NextResponse.json({ success: false, error: 'Nie udało się zamknąć zgłoszeń' }, { status: 500 });
  }
}

async function handleExerciseReport(body: ExerciseReportRequest, author: ExerciseReportAuthor) {
  const report: ExerciseReport = {
    id: randomUUID(),
    exerciseId: body.exerciseId,
    exerciseName: body.exerciseName,
    exerciseScope: body.exerciseScope,
    exerciseStatus: body.exerciseStatus,
    organizationId: body.organizationId,
    reasonCategory: body.reasonCategory,
    description: body.description,
    attachments: body.attachments ?? [],
    status: 'OPEN',
    routingTarget: resolveExerciseReportRoutingTarget({
      status: body.exerciseStatus,
      scope: body.exerciseScope,
    }),
    reportedBy: author,
    createdAt: new Date().toISOString(),
  };

  const store = getReportStore();
  store.unshift(report);
  store.splice(MAX_STORED_REPORTS);
  await sendDiscordReportNotification(report);

  return NextResponse.json({
    success: true,
    message: 'Zgłoszenie zostało przyjęte do weryfikacji',
    report,
  });
}

async function handleLegacySetReport(body: LegacyExerciseReportRequest, reporter: ExerciseReportAuthor) {
  const webhookUrl = discordWebhookUrl();
  if (!webhookUrl) {
    console.error('[API/exercise-reports] No Discord webhook URL configured');
    return NextResponse.json({ success: false, message: 'Webhook nie jest skonfigurowany' }, { status: 503 });
  }

  const embed = buildDiscordEmbedForSetReport(body, reporter);
  const discordPayload = {
    username: 'FiziYo Exercise Reports',
    avatar_url: 'https://i.imgur.com/AfFp7pu.png',
    allowed_mentions: DISCORD_NO_MENTIONS,
    embeds: [embed],
  };

  const discordResponse = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(discordPayload),
  });

  if (discordResponse.ok) {
    return NextResponse.json({
      success: true,
      message: 'Zgłoszenie wysłane pomyślnie',
    });
  }

  console.error('[API/exercise-reports] Discord error:', discordResponse.status);
  return NextResponse.json({ success: false, message: `Błąd Discord: ${discordResponse.status}` }, { status: 500 });
}

function isExerciseReportRequest(body: unknown): body is ExerciseReportRequest {
  if (!body || typeof body !== 'object') {
    return false;
  }

  return (body as { type?: string }).type === 'EXERCISE_REPORT';
}

function buildDiscordEmbedForSetReport(report: LegacyExerciseReportRequest, reporter: ExerciseReportAuthor) {
  const setUrl = `${ADMIN_BASE_URL}/exercise-sets/${encodeURIComponent(report.exerciseSet.id)}`;

  const exercisesList = report.exerciseSet.exercises
    .map((exercise, index) => {
      const exerciseId = exercise.exerciseId || exercise.id;
      const exerciseUrl = `${ADMIN_BASE_URL}/exercises/${encodeURIComponent(exerciseId)}`;
      return `${index + 1}. **${discordText(exercise.name, 200)}**\n   └ ID: ${discordText(exerciseId, 100)} • [Edytuj](${exerciseUrl})`;
    })
    .join('\n');

  const patientsList = report.patients
    .map((patient) => `• ${discordText(patient.name, 100)} (${discordText(patient.id, 100)})`)
    .join('\n');

  return {
    title: '🚨 Raport błędu w ćwiczeniach',
    description:
      'Terapeuta zgłosił problem z zestawem ćwiczeń.\n\n**Instrukcja obsługi:** Sprawdź ćwiczenia z listy poniżej i oznacz reakcją ✅',
    color: 0xff6b35,
    fields: [
      {
        name: '📝 Treść zgłoszenia',
        value: discordText(report.message),
        inline: false,
      },
      {
        name: '📋 Zestaw ćwiczeń',
        value: `**${discordText(report.exerciseSet.name, 300)}**\nID: ${discordText(report.exerciseSet.id, 100)}\n[🔗 Otwórz w adminie](${setUrl})`,
        inline: false,
      },
      {
        name: `🏋️ Ćwiczenia w zestawie (${report.exerciseSet.exercises.length})`,
        value: (exercisesList || 'Brak ćwiczeń').slice(0, 1024),
        inline: false,
      },
      {
        name: `👤 Pacjenci (${report.patients.length})`,
        value: (patientsList || 'Brak pacjentów').slice(0, 1024),
        inline: true,
      },
      {
        name: '👨‍⚕️ Zgłaszający',
        value: `${discordText(reporter.name || 'Terapeuta', 200)}\n${discordText(reporter.email, 200)}\nUser ID: ${discordText(reporter.userId, 100)}`,
        inline: true,
      },
      {
        name: '🏢 Organizacja',
        value: discordText(report.organizationId || 'brak', 200),
        inline: true,
      },
    ],
    footer: {
      text: 'FiziYo Exercise Reports • Kliknij linki aby edytować',
    },
    timestamp: new Date().toISOString(),
  };
}

async function sendDiscordReportNotification(report: ExerciseReport): Promise<void> {
  const webhookUrl = discordWebhookUrl();
  if (!webhookUrl) {
    return;
  }

  const exerciseUrl = `${ADMIN_BASE_URL}/exercises/${encodeURIComponent(report.exerciseId)}`;
  const payload = {
    username: 'FiziYo Exercise Reports',
    avatar_url: 'https://i.imgur.com/AfFp7pu.png',
    allowed_mentions: DISCORD_NO_MENTIONS,
    embeds: [
      {
        title: '🛠️ Zgłoszenie ćwiczenia do poprawki',
        color: 0xf59e0b,
        fields: [
          {
            name: 'Ćwiczenie',
            value: `**${discordText(report.exerciseName, 300)}**\nID: ${discordText(report.exerciseId, 100)}\n[🔗 Otwórz ćwiczenie](${exerciseUrl})`,
            inline: false,
          },
          {
            name: 'Powód',
            value: report.reasonCategory,
            inline: true,
          },
          {
            name: 'Routing',
            value: report.routingTarget,
            inline: true,
          },
          {
            name: 'Zgłaszający',
            value: `${discordText(report.reportedBy.name || 'Terapeuta', 200)}\n${discordText(report.reportedBy.email, 200)}`,
            inline: true,
          },
          {
            name: 'Opis',
            value: discordText(report.description),
            inline: false,
          },
        ],
        timestamp: report.createdAt,
      },
    ],
  };

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}
