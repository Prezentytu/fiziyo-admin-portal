/**
 * Feature Flags - konfiguracja funkcjonalności aplikacji
 * Umożliwia włączanie/wyłączanie funkcji przez zmienne środowiskowe
 */

/**
 * Konfiguracja feedbacku
 */
export const feedbackConfig = {
  /**
   * Czy feedback jest włączony (domyślnie: true)
   * Kontrolowane przez: NEXT_PUBLIC_FEEDBACK_ENABLED
   */
  get enabled(): boolean {
    const envValue = process.env.NEXT_PUBLIC_FEEDBACK_ENABLED;
    // Domyślnie włączony, wyłączony tylko gdy explicit "false"
    return envValue !== 'false';
  },

  /**
   * URL webhooka Discord
   * Kontrolowane przez: NEXT_PUBLIC_DISCORD_WEBHOOK_URL
   */
  get discordWebhookUrl(): string | undefined {
    return process.env.NEXT_PUBLIC_DISCORD_WEBHOOK_URL;
  },
};

/**
 * Sprawdza czy feedback jest włączony i skonfigurowany
 */
export function isFeedbackEnabled(): boolean {
  return feedbackConfig.enabled && Boolean(feedbackConfig.discordWebhookUrl);
}

/**
 * Pobiera URL webhooka Discord
 */
export function getDiscordWebhookUrl(): string | undefined {
  return feedbackConfig.discordWebhookUrl;
}

