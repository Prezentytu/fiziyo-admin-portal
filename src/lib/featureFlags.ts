/**
 * Feature Flags - konfiguracja funkcjonalności aplikacji
 * Umożliwia włączanie/wyłączanie funkcji przez zmienne środowiskowe
 *
 * UWAGA: Discord webhook URL jest teraz konfigurowany na backendzie
 * w appsettings.json (Discord:FeedbackWebhookUrl, Discord:SubscriptionWebhookUrl)
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
    return envValue !== "false";
  },
};

/**
 * Sprawdza czy feedback jest włączony
 * UWAGA: Webhook URL jest teraz na backendzie
 */
export function isFeedbackEnabled(): boolean {
  return feedbackConfig.enabled;
}
