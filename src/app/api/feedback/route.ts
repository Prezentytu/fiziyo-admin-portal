import { NextRequest, NextResponse } from 'next/server';

/**
 * API Route do wysyłania feedbacku na Discord
 * Działa jako proxy - omija problemy z CORS
 * Fallback: jeśli backend nie odpowiada, wysyła bezpośrednio na Discord
 */

const BACKEND_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const DISCORD_WEBHOOK_URL = process.env.NEXT_PUBLIC_DISCORD_WEBHOOK_URL;

interface FeedbackRequest {
  type: string;
  description: string;
  screenName?: string;
  url?: string;
  appVersion?: string;
  browser?: string;
  environment?: string;
  userId: string;
  userEmail: string;
  userName?: string;
  userRole?: string;
  organizationId?: string;
  images?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body: FeedbackRequest = await request.json();

    if (!body.description) {
      return NextResponse.json({ success: false, message: 'Opis jest wymagany' }, { status: 400 });
    }

    // Próbuj wysłać przez backend
    try {
      const backendResponse = await fetch(`${BACKEND_API_URL}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (backendResponse.ok) {
        const result = await backendResponse.json();
        return NextResponse.json(result);
      }
    } catch (backendError) {
      console.warn('[API/feedback] Backend unavailable, falling back to direct Discord:', backendError);
    }

    // Fallback: wyślij bezpośrednio na Discord
    if (!DISCORD_WEBHOOK_URL) {
      console.error('[API/feedback] No Discord webhook URL configured');
      return NextResponse.json({ success: false, message: 'Serwer feedbacku niedostępny' }, { status: 503 });
    }

    const embed = buildDiscordEmbed(body);
    const discordPayload = {
      username: 'FiziYo Feedback Bot',
      avatar_url: 'https://i.imgur.com/4M34hi2.png',
      embeds: [embed],
    };

    const discordResponse = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(discordPayload),
    });

    if (discordResponse.ok) {
      // Wyślij zdjęcia jako osobne wiadomości
      if (body.images && body.images.length > 0) {
        await sendImagesToDiscord(DISCORD_WEBHOOK_URL, body.userEmail, body.images);
      }

      return NextResponse.json({ success: true, message: 'Feedback wysłany pomyślnie' });
    }

    const errorText = await discordResponse.text();
    console.error('[API/feedback] Discord error:', discordResponse.status, errorText);
    return NextResponse.json({ success: false, message: `Błąd Discord: ${discordResponse.status}` }, { status: 500 });
  } catch (error) {
    console.error('[API/feedback] Error:', error);
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

  const config = typeConfig[feedback.type?.toLowerCase()] || typeConfig.bug;

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
    { name: '👤 Użytkownik', value: feedback.userEmail, inline: true },
    { name: '👔 Rola', value: roleDisplay[feedback.userRole || ''] || feedback.userRole || 'Nieznany', inline: true },
    { name: '📝 Opis', value: sanitizeText(feedback.description), inline: false },
  ];

  if (feedback.organizationId) {
    fields.push({ name: '🏢 Organizacja', value: `\`${feedback.organizationId}\``, inline: true });
  }

  const details = [
    `• Wersja: ${feedback.appVersion || 'unknown'}`,
    `• Przeglądarka: ${feedback.browser || 'unknown'}`,
    `• User ID: \`${feedback.userId}\``,
  ];

  if (feedback.screenName) details.push(`• Ekran: ${feedback.screenName}`);
  if (feedback.url) details.push(`• URL: ${feedback.url}`);
  if (feedback.images && feedback.images.length > 0) {
    details.push(`• Załączniki: ${feedback.images.length} zdjęć`);
  }

  fields.push({ name: '🌐 Szczegóły', value: details.join('\n'), inline: false });

  return {
    title: `${config.emoji} [${config.label}] ${envBadge}`,
    description: `Zgłoszenie od **${feedback.userName || 'użytkownika'}**`,
    color: config.color,
    fields,
    footer: { text: 'FiziYo Admin Portal' },
    timestamp: new Date().toISOString(),
  };
}

function sanitizeText(text: string): string {
  if (!text) return 'Brak opisu';
  return text
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('@everyone', '@\u200beveryone')
    .replaceAll('@here', '@\u200bhere')
    .substring(0, 4000);
}

async function sendImagesToDiscord(webhookUrl: string, userEmail: string, imagesBase64: string[]) {
  for (let i = 0; i < imagesBase64.length; i++) {
    try {
      const imageBase64 = imagesBase64[i];
      const parts = imageBase64.split(',');
      if (parts.length !== 2) continue;

      const mimeType = parts[0].replace('data:', '').replace(';base64', '');
      const base64Data = parts[1];
      const imageBuffer = Buffer.from(base64Data, 'base64');

      let extension = 'jpg';
      if (mimeType === 'image/png') extension = 'png';
      else if (mimeType === 'image/gif') extension = 'gif';
      const fileName = `feedback_${i + 1}.${extension}`;

      const formData = new FormData();
      formData.append('file', new Blob([imageBuffer], { type: mimeType }), fileName);
      formData.append(
        'payload_json',
        JSON.stringify({ content: `📷 Załącznik ${i + 1}/${imagesBase64.length} od \`${userEmail}\`` })
      );

      await fetch(webhookUrl, { method: 'POST', body: formData });

      if (i < imagesBase64.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.warn(`[API/feedback] Failed to send image ${i + 1}:`, error);
    }
  }
}
