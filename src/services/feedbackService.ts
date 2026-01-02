/**
 * Serwis do wysyłania feedbacku na Discord webhook
 * Umożliwia użytkownikom aplikacji szybkie zgłaszanie uwag
 */

import { getDiscordWebhookUrl, isFeedbackEnabled } from '@/lib/featureFlags';
import type {
  FeedbackData,
  FeedbackSendResult,
  DiscordWebhookPayload,
  DiscordEmbed,
  FeedbackMetadata,
} from '@/types/feedback.types';
import { FEEDBACK_TYPE_CONFIG, DISCORD_COLORS } from '@/types/feedback.types';

// ============================================================================
// RATE LIMITING
// ============================================================================

/**
 * Rate limiting - max 1 zgłoszenie na 30 sekund
 */
let lastFeedbackTime = 0;
const RATE_LIMIT_MS = 30000; // 30 sekund

/**
 * Sprawdza czy rate limit pozwala na wysłanie
 */
function canSendFeedback(): boolean {
  const now = Date.now();
  return now - lastFeedbackTime >= RATE_LIMIT_MS;
}

/**
 * Aktualizuje timestamp ostatniego wysłanego feedbacku
 */
function updateLastFeedbackTime(): void {
  lastFeedbackTime = Date.now();
}

// ============================================================================
// METADATA HELPERS
// ============================================================================

/**
 * Pobiera wersję aplikacji z package.json (ustawiona w build time)
 */
function getAppVersion(): string {
  return process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0';
}

/**
 * Pobiera informacje o przeglądarce
 */
function getBrowserInfo(): { name: string; version: string } {
  if (typeof window === 'undefined') {
    return { name: 'SSR', version: '0' };
  }

  const ua = navigator.userAgent;
  let name = 'Unknown';
  let version = '0';

  if (ua.includes('Firefox/')) {
    name = 'Firefox';
    version = ua.split('Firefox/')[1]?.split(' ')[0] || '0';
  } else if (ua.includes('Chrome/') && !ua.includes('Edg/')) {
    name = 'Chrome';
    version = ua.split('Chrome/')[1]?.split(' ')[0] || '0';
  } else if (ua.includes('Edg/')) {
    name = 'Edge';
    version = ua.split('Edg/')[1]?.split(' ')[0] || '0';
  } else if (ua.includes('Safari/') && !ua.includes('Chrome')) {
    name = 'Safari';
    version = ua.split('Version/')[1]?.split(' ')[0] || '0';
  }

  return { name, version };
}

/**
 * Tworzy obiekt metadanych feedbacku
 */
export function createFeedbackMetadata(screenName?: string): FeedbackMetadata {
  const browser = getBrowserInfo();

  return {
    appVersion: getAppVersion(),
    platform: 'web',
    browser: browser.name,
    browserVersion: browser.version,
    timestamp: new Date().toISOString(),
    screenName,
    url: typeof window !== 'undefined' ? window.location.href : undefined,
  };
}

// ============================================================================
// DISCORD EMBED BUILDER
// ============================================================================

/**
 * Formatuje rolę użytkownika do czytelnej formy
 */
function formatUserRole(role: string): string {
  switch (role) {
    case 'patient':
      return '🩺 Pacjent';
    case 'physio':
      return '💪 Fizjoterapeuta';
    case 'company':
      return '🏢 Właściciel';
    case 'admin':
      return '👑 Administrator';
    default:
      return role;
  }
}

/**
 * Sanityzuje tekst - usuwa potencjalnie niebezpieczne znaki
 */
function sanitizeText(text: string): string {
  return text
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll(/@everyone/gi, '@\u200beveryone')
    .replaceAll(/@here/gi, '@\u200bhere')
    .substring(0, 4000); // Discord limit
}

/**
 * Buduje Discord Embed z danych feedbacku
 */
function buildDiscordEmbed(feedback: FeedbackData): DiscordEmbed {
  const typeConfig = FEEDBACK_TYPE_CONFIG[feedback.type];
  const discordColor = DISCORD_COLORS[feedback.type];

  // Budowanie pól embed
  const fields = [
    {
      name: '👤 Użytkownik',
      value: feedback.user.email,
      inline: true,
    },
    {
      name: '🆔 ID',
      value: `\`${feedback.user.userId}\``,
      inline: true,
    },
    {
      name: '👔 Rola',
      value: formatUserRole(feedback.user.role),
      inline: true,
    },
    {
      name: '📝 Opis',
      value: sanitizeText(feedback.description) || 'Brak opisu',
      inline: false,
    },
  ];

  // Dodaj załączniki jeśli są
  if (feedback.images.length > 0) {
    fields.push({
      name: '📎 Załączniki',
      value: `${feedback.images.length} zdjęć`,
      inline: true,
    });
  }

  // Dodaj organizację jeśli jest
  if (feedback.user.organizationId) {
    fields.push({
      name: '🏢 Organizacja',
      value: `\`${feedback.user.organizationId}\``,
      inline: true,
    });
  }

  // Dodaj metadane
  fields.push({
    name: '🌐 Szczegóły',
    value: [
      `• Wersja: ${feedback.metadata.appVersion}`,
      `• Przeglądarka: ${feedback.metadata.browser} ${feedback.metadata.browserVersion}`,
      feedback.metadata.screenName ? `• Ekran: ${feedback.metadata.screenName}` : null,
      feedback.metadata.url ? `• URL: ${feedback.metadata.url}` : null,
    ]
      .filter(Boolean)
      .join('\n'),
    inline: false,
  });

  const userName = feedback.user.firstName
    ? `${feedback.user.firstName} ${feedback.user.lastName || ''}`.trim()
    : 'użytkownika';

  return {
    title: `${typeConfig.emoji} [${typeConfig.label.toUpperCase()}] Nowe zgłoszenie`,
    description: `Zgłoszenie od **${userName}**`,
    color: discordColor,
    fields,
    footer: {
      text: 'Fiziyo Admin Portal',
    },
    timestamp: feedback.metadata.timestamp,
  };
}

// ============================================================================
// MAIN SEND FUNCTION
// ============================================================================

/**
 * Wysyła feedback na Discord webhook
 */
export async function sendFeedbackToDiscord(
  feedback: FeedbackData
): Promise<FeedbackSendResult> {
  // Sprawdź czy feedback jest włączony
  if (!isFeedbackEnabled()) {
    console.warn('[FeedbackService] Feedback is disabled');
    return { success: false, error: 'Funkcja feedbacku jest wyłączona' };
  }

  // Sprawdź czy webhook URL jest skonfigurowany
  const webhookUrl = getDiscordWebhookUrl();
  if (!webhookUrl) {
    console.error('[FeedbackService] Discord webhook URL not configured');
    return { success: false, error: 'Webhook nie jest skonfigurowany' };
  }

  // Rate limiting
  if (!canSendFeedback()) {
    const remainingSeconds = Math.ceil(
      (RATE_LIMIT_MS - (Date.now() - lastFeedbackTime)) / 1000
    );
    return {
      success: false,
      error: `Poczekaj ${remainingSeconds} sekund przed wysłaniem kolejnego zgłoszenia`,
    };
  }

  try {
    // Buduj payload
    const embed = buildDiscordEmbed(feedback);
    const payload: DiscordWebhookPayload = {
      username: 'Fiziyo Feedback Bot',
      avatar_url: 'https://i.imgur.com/4M34hi2.png',
      embeds: [embed],
    };

    // Wyślij główną wiadomość
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        '[FeedbackService] Discord webhook error:',
        response.status,
        errorText
      );
      return { success: false, error: `Błąd serwera: ${response.status}` };
    }

    // Wyślij zdjęcia jako osobne wiadomości
    if (feedback.images.length > 0) {
      await sendImagesToDiscord(webhookUrl, feedback);
    }

    // Aktualizuj rate limit
    updateLastFeedbackTime();

    console.log('[FeedbackService] Feedback sent successfully');
    return { success: true };
  } catch (error) {
    console.error('[FeedbackService] Error sending feedback:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Nieznany błąd podczas wysyłania',
    };
  }
}

/**
 * Wysyła zdjęcia jako załączniki (follow-up messages)
 */
async function sendImagesToDiscord(
  webhookUrl: string,
  feedback: FeedbackData
): Promise<void> {
  for (let i = 0; i < feedback.images.length; i++) {
    const image = feedback.images[i];

    try {
      const formData = new FormData();

      // Dodaj plik
      formData.append('file', image.file, `feedback_${i + 1}.${getFileExtension(image.file)}`);

      // Dodaj payload JSON
      formData.append(
        'payload_json',
        JSON.stringify({
          content: `📷 Załącznik ${i + 1}/${feedback.images.length} od ${feedback.user.email}`,
        })
      );

      const response = await fetch(webhookUrl, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        console.log(`[FeedbackService] Image ${i + 1} uploaded successfully`);
      } else {
        const errorText = await response.text();
        console.warn(
          `[FeedbackService] Image ${i + 1} upload failed:`,
          response.status,
          errorText
        );
      }

      // Małe opóźnienie między uploadami (rate limit Discord)
      if (i < feedback.images.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.warn(`[FeedbackService] Failed to send image ${i + 1}:`, error);
      // Kontynuuj z pozostałymi zdjęciami
    }
  }
}

/**
 * Pobiera rozszerzenie pliku
 */
function getFileExtension(file: File): string {
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/gif') return 'gif';
  if (file.type === 'image/webp') return 'webp';
  return 'jpg';
}

