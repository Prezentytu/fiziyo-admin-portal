import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { DISCORD_FIELD_LIMIT, DISCORD_NO_MENTIONS, discordText } from '@/lib/server/discordText';
import { requireSessionAuthor } from '@/lib/server/requestIdentity';

/**
 * API Route do wysyłania feedbacku na Discord
 * Działa jako proxy - omija problemy z CORS
 * Fallback only when the backend is unreachable or fails (5xx); its rejection (4xx, 429) goes back to the client,
 * so the fallback never bypasses backend limits.
 */

const backendApiUrl = () => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const discordWebhookUrl = () => process.env.NEXT_PUBLIC_DISCORD_WEBHOOK_URL;

// Same limits as FeedbackController in the backend.
const MAX_IMAGES = 5;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
// The dialog accepts `image/*`; SVG is rejected, the rest is attached as before.
const IMAGE_DATA_URL = /^data:(image\/(?!svg)[a-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/i;

// Optional fields may be `null` (e.g. organization before it is chosen).
const text = (max: number) =>
  z.string().trim().max(max).nullish().transform((value) => value ?? undefined);

const feedbackSchema = z.object({
  type: z.string().trim().max(50),
  description: z.string().trim().min(1).max(4000),
  screenName: text(200),
  url: text(2000),
  appVersion: text(100),
  browser: text(200),
  environment: text(50),
  userRole: text(50),
  organizationId: text(200),
  images: z
    .array(z.string().max(Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 64))
    .max(MAX_IMAGES)
    .nullish()
    .transform((value) => value ?? undefined),
});

type FeedbackRequest = z.infer<typeof feedbackSchema> & {
  userId: string;
  userEmail: string;
  userName?: string;
};

/** Keep the path for diagnosis; query and hash carry search phrases such as a patient's surname. */
function withoutQuery(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const cutAt = url.search(/[?#]/);
  return cutAt === -1 ? url : url.slice(0, cutAt);
}

/** The backend also rate-limits by IP; without this header everyone shares the portal server's IP limit. */
function clientIpHeader(request: NextRequest): Record<string, string> {
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return clientIp ? { 'X-Forwarded-For': clientIp } : {};
}

export async function POST(request: NextRequest) {
  const session = await requireSessionAuthor();
  if (!session.ok) return session.response;

  try {
    const parsed = feedbackSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: 'Nieprawidłowe zgłoszenie' }, { status: 400 });
    }

    const body: FeedbackRequest = {
      ...parsed.data,
      url: withoutQuery(parsed.data.url),
      userId: session.author.userId,
      userEmail: session.author.email,
      userName: session.author.name,
    };

    // Próbuj wysłać przez backend
    try {
      const backendResponse = await fetch(`${backendApiUrl()}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...clientIpHeader(request) },
        body: JSON.stringify(body),
      });

      if (backendResponse.status < 500) {
        const result = await backendResponse.json().catch(() => ({ success: backendResponse.ok }));
        return NextResponse.json(result, { status: backendResponse.status });
      }
    } catch (backendError) {
      console.warn(
        '[API/feedback] Backend unavailable, falling back to direct Discord:',
        backendError instanceof Error ? backendError.message : 'unknown'
      );
    }

    // Fallback: wyślij bezpośrednio na Discord
    const webhookUrl = discordWebhookUrl();
    if (!webhookUrl) {
      console.error('[API/feedback] No Discord webhook URL configured');
      return NextResponse.json({ success: false, message: 'Serwer feedbacku niedostępny' }, { status: 503 });
    }

    const embed = buildDiscordEmbed(body);
    const discordPayload = {
      username: 'FiziYo Feedback Bot',
      avatar_url: 'https://i.imgur.com/4M34hi2.png',
      allowed_mentions: DISCORD_NO_MENTIONS,
      embeds: [embed],
    };

    const discordResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(discordPayload),
    });

    if (discordResponse.ok) {
      // Wyślij zdjęcia jako osobne wiadomości
      if (body.images && body.images.length > 0) {
        await sendImagesToDiscord(webhookUrl, body.userEmail, body.images);
      }

      return NextResponse.json({ success: true, message: 'Feedback wysłany pomyślnie' });
    }

    console.error('[API/feedback] Discord error:', discordResponse.status);
    return NextResponse.json({ success: false, message: `Błąd Discord: ${discordResponse.status}` }, { status: 500 });
  } catch (error) {
    console.error('[API/feedback] Error:', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ success: false, message: 'Wystąpił błąd podczas wysyłania feedbacku' }, { status: 500 });
  }
}

// ============================================================================
// DISCORD EMBED BUILDER
// ============================================================================

function buildDiscordEmbed(feedback: FeedbackRequest) {
  const typeConfig: Record<string, { emoji: string; label: string; color: number }> = {
    bug: { emoji: '🐛', label: 'BŁĄD', color: 15158332 }, // czerwony
    suggestion: { emoji: '💡', label: 'SUGESTIA', color: 3447003 }, // niebieski
    question: { emoji: '❓', label: 'PYTANIE', color: 5814783 }, // fioletowy
  };

  const config = typeConfig[feedback.type.toLowerCase()] || typeConfig.bug;

  const env = feedback.environment?.toLowerCase();
  let envBadge = '🔵 DEV';
  if (env === 'production') envBadge = '🟢 PROD';
  else if (env === 'staging') envBadge = '🟡 STAGING';

  const roleDisplay: Record<string, string> = {
    patient: '🩺 Pacjent',
    physio: '💪 Fizjoterapeuta',
    therapist: '💪 Fizjoterapeuta',
    company: '🏢 Właściciel',
    owner: '🏢 Właściciel',
    admin: '👑 Administrator',
  };

  const fields = [
    { name: '🌍 Środowisko', value: envBadge, inline: true },
    { name: '👤 Użytkownik', value: discordText(feedback.userEmail, 200), inline: true },
    {
      name: '👔 Rola',
      value: roleDisplay[feedback.userRole || ''] || discordText(feedback.userRole || 'Nieznany', 50),
      inline: true,
    },
    { name: '📝 Opis', value: discordText(feedback.description, DISCORD_FIELD_LIMIT), inline: false },
  ];

  if (feedback.organizationId) {
    fields.push({ name: '🏢 Organizacja', value: discordText(feedback.organizationId, 200), inline: true });
  }

  const details = [
    `• Wersja: ${discordText(feedback.appVersion || 'unknown', 100)}`,
    `• Przeglądarka: ${discordText(feedback.browser || 'unknown', 200)}`,
    `• User ID: ${discordText(feedback.userId, 100)}`,
  ];

  if (feedback.screenName) details.push(`• Ekran: ${discordText(feedback.screenName, 200)}`);
  if (feedback.url) details.push(`• URL: ${discordText(feedback.url, 400)}`);
  if (feedback.images && feedback.images.length > 0) {
    details.push(`• Załączniki: ${feedback.images.length} zdjęć`);
  }

  fields.push({ name: '🌐 Szczegóły', value: details.join('\n').slice(0, DISCORD_FIELD_LIMIT), inline: false });

  return {
    title: `${config.emoji} [${config.label}] ${envBadge}`,
    description: `Zgłoszenie od **${discordText(feedback.userName || 'użytkownika', 200)}**`,
    color: config.color,
    fields,
    footer: { text: 'FiziYo Admin Portal' },
    timestamp: new Date().toISOString(),
  };
}

async function sendImagesToDiscord(webhookUrl: string, userEmail: string, imagesBase64: string[]) {
  for (let i = 0; i < imagesBase64.length; i++) {
    try {
      const match = IMAGE_DATA_URL.exec(imagesBase64[i] ?? '');
      if (!match) continue;

      const [, mimeType, base64Data] = match;
      const imageBuffer = Buffer.from(base64Data, 'base64');
      if (imageBuffer.byteLength > MAX_IMAGE_BYTES) continue;

      let extension = 'jpg';
      if (mimeType === 'image/png') extension = 'png';
      else if (mimeType === 'image/gif') extension = 'gif';
      const fileName = `feedback_${i + 1}.${extension}`;

      const formData = new FormData();
      formData.append('file', new Blob([imageBuffer], { type: mimeType }), fileName);
      formData.append(
        'payload_json',
        JSON.stringify({
          content: `📷 Załącznik ${i + 1}/${imagesBase64.length} od ${discordText(userEmail, 200)}`,
          allowed_mentions: DISCORD_NO_MENTIONS,
        })
      );

      await fetch(webhookUrl, { method: 'POST', body: formData });

      if (i < imagesBase64.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.warn(`[API/feedback] Failed to send image ${i + 1}:`, error instanceof Error ? error.message : 'unknown');
    }
  }
}
