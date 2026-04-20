/**
 * Powiadomienie o zmianie stanu kredytow AI.
 *
 * MVP (pay-as-you-go AI bez widocznego licznika): UI nie wyswietla stanu kredytow,
 * wiec funkcja jest praktycznie no-op. Pozostaje jako stabilny punkt wpiecia,
 * gdyby w przyszlosci wrocil widget licznika lub panel kredytow.
 *
 * Sygnalizuje przez CustomEvent('ai-credits-changed') dla ewentualnych przyszlych subskrybentow.
 */
export const triggerCreditsRefresh = (): void => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ai-credits-changed'));
  }
};
