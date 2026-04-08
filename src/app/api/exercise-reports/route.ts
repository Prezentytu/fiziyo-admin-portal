import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

import { resolveExerciseReportRoutingTarget } from '@/features/exercises/utils/exerciseReportRouting';
import type { CreateExerciseReportInput, ExerciseReport, ExerciseReportStatus } from '@/types/exercise-report.types';

const DISCORD_WEBHOOK_URL = process.env.DISCORD_EXERCISE_REPORTS_WEBHOOK_URL;
const ADMIN_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://admin.fiziyo.com';

interface LegacyExerciseInfo {
  id: string;
  name: string;
  exerciseId?: string;
}

interface LegacyPatientInfo {
  id: string;
  name: string;
}

interface LegacyExerciseReportRequest {
  message: string;
  exerciseSet: {
    id: string;
    name: string;
    exercises: LegacyExerciseInfo[];
  };
  patients: LegacyPatientInfo[];
  reporter: {
    userId: string;
    email: string;
    name?: string;
  };
  organizationId: string;
}

interface ExerciseReportRequest extends CreateExerciseReportInput {
  type: 'EXERCISE_REPORT';
}

interface ResolveReportRequest {
  exerciseId?: string;
  reportId?: string;
  resolvedByUserId: string;
  resolutionNote?: string;
}

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
  try {
    const body = (await request.json()) as LegacyExerciseReportRequest | ExerciseReportRequest;

    if (isExerciseReportRequest(body)) {
      return handleExerciseReport(body);
    }

    return handleLegacySetReport(body);
  } catch (error) {
    console.error('[API/exercise-reports] Error:', error);
    return NextResponse.json(
      { success: false, message: 'Wystąpił błąd podczas wysyłania zgłoszenia' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as ResolveReportRequest;
    if (!body.resolvedByUserId) {
      return NextResponse.json({ success: false, error: 'resolvedByUserId jest wymagane' }, { status: 400 });
    }

    const store = getReportStore();
    const now = new Date().toISOString();
    let affectedCount = 0;

    for (const report of store) {
      const matchesById = body.reportId ? report.id === body.reportId : false;
      const matchesByExercise = body.exerciseId ? report.exerciseId === body.exerciseId : false;
      if ((matchesById || matchesByExercise) && report.status === 'OPEN') {
        report.status = 'RESOLVED';
        report.resolvedAt = now;
        report.resolvedByUserId = body.resolvedByUserId;
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

async function handleExerciseReport(body: ExerciseReportRequest) {
  if (!body.description?.trim()) {
    return NextResponse.json({ success: false, error: 'Treść zgłoszenia jest wymagana' }, { status: 400 });
  }

  const report: ExerciseReport = {
    id: randomUUID(),
    exerciseId: body.exerciseId,
    exerciseName: body.exerciseName,
    exerciseScope: body.exerciseScope,
    exerciseStatus: body.exerciseStatus,
    organizationId: body.organizationId,
    reasonCategory: body.reasonCategory,
    description: body.description.trim(),
    attachments: body.attachments ?? [],
    status: 'OPEN',
    routingTarget: resolveExerciseReportRoutingTarget({
      status: body.exerciseStatus,
      scope: body.exerciseScope,
    }),
    reportedBy: body.reportedBy,
    createdAt: new Date().toISOString(),
  };

  getReportStore().unshift(report);
  await sendDiscordReportNotification(report);

  return NextResponse.json({
    success: true,
    message: 'Zgłoszenie zostało przyjęte do weryfikacji',
    report,
  });
}

async function handleLegacySetReport(body: LegacyExerciseReportRequest) {
  if (!body.message?.trim()) {
    return NextResponse.json({ success: false, message: 'Treść zgłoszenia jest wymagana' }, { status: 400 });
  }

  if (!DISCORD_WEBHOOK_URL) {
    console.error('[API/exercise-reports] No Discord webhook URL configured');
    return NextResponse.json({ success: false, message: 'Webhook nie jest skonfigurowany' }, { status: 503 });
  }

  const embed = buildDiscordEmbedForSetReport(body);
  const discordPayload = {
    username: 'FiziYo Exercise Reports',
    avatar_url: 'https://i.imgur.com/AfFp7pu.png',
    embeds: [embed],
  };

  const discordResponse = await fetch(DISCORD_WEBHOOK_URL, {
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

  const errorText = await discordResponse.text();
  console.error('[API/exercise-reports] Discord error:', discordResponse.status, errorText);
  return NextResponse.json({ success: false, message: `Błąd Discord: ${discordResponse.status}` }, { status: 500 });
}

function isExerciseReportRequest(body: unknown): body is ExerciseReportRequest {
  if (!body || typeof body !== 'object') {
    return false;
  }

  return (body as { type?: string }).type === 'EXERCISE_REPORT';
}

function buildDiscordEmbedForSetReport(report: LegacyExerciseReportRequest) {
  const setUrl = `${ADMIN_BASE_URL}/exercise-sets/${report.exerciseSet.id}`;

  const exercisesList = report.exerciseSet.exercises
    .map((exercise, index) => {
      const exerciseUrl = `${ADMIN_BASE_URL}/exercises/${exercise.exerciseId || exercise.id}`;
      return `${index + 1}. **${exercise.name}**\n   └ ID: \`${exercise.exerciseId || exercise.id}\` • [Edytuj](${exerciseUrl})`;
    })
    .join('\n');

  const patientsList = report.patients.map((patient) => `• ${patient.name} (\`${patient.id}\`)`).join('\n');

  return {
    title: '🚨 Raport błędu w ćwiczeniach',
    description:
      'Terapeuta zgłosił problem z zestawem ćwiczeń.\n\n**Instrukcja obsługi:** Sprawdź ćwiczenia z listy poniżej i oznacz reakcją ✅',
    color: 0xff6b35,
    fields: [
      {
        name: '📝 Treść zgłoszenia',
        value: sanitizeText(report.message),
        inline: false,
      },
      {
        name: '📋 Zestaw ćwiczeń',
        value: `**${report.exerciseSet.name}**\nID: \`${report.exerciseSet.id}\`\n[🔗 Otwórz w adminie](${setUrl})`,
        inline: false,
      },
      {
        name: `🏋️ Ćwiczenia w zestawie (${report.exerciseSet.exercises.length})`,
        value: exercisesList || 'Brak ćwiczeń',
        inline: false,
      },
      {
        name: `👤 Pacjenci (${report.patients.length})`,
        value: patientsList || 'Brak pacjentów',
        inline: true,
      },
      {
        name: '👨‍⚕️ Zgłaszający',
        value: `${report.reporter.name || 'Terapeuta'}\n${report.reporter.email}\nUser ID: \`${report.reporter.userId}\``,
        inline: true,
      },
      {
        name: '🏢 Organizacja',
        value: `\`${report.organizationId}\``,
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
  if (!DISCORD_WEBHOOK_URL) {
    return;
  }

  const exerciseUrl = `${ADMIN_BASE_URL}/exercises/${report.exerciseId}`;
  const payload = {
    username: 'FiziYo Exercise Reports',
    avatar_url: 'https://i.imgur.com/AfFp7pu.png',
    embeds: [
      {
        title: '🛠️ Zgłoszenie ćwiczenia do poprawki',
        color: 0xf59e0b,
        fields: [
          {
            name: 'Ćwiczenie',
            value: `**${report.exerciseName}**\nID: \`${report.exerciseId}\`\n[🔗 Otwórz ćwiczenie](${exerciseUrl})`,
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
            value: `${report.reportedBy.name || 'Terapeuta'}\n${report.reportedBy.email}`,
            inline: true,
          },
          {
            name: 'Opis',
            value: sanitizeText(report.description),
            inline: false,
          },
        ],
        timestamp: report.createdAt,
      },
    ],
  };

  await fetch(DISCORD_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

function sanitizeText(text: string): string {
  return text
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('@everyone', '@\u200beveryone')
    .replaceAll('@here', '@\u200bhere')
    .substring(0, 1000);
}
