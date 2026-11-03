'use client';

import { Button } from '@/components/ui/button';
import { useTelemetryConsent } from '@/lib/telemetry/useTelemetryConsent';

/**
 * One-time question shown until the therapist decides. Analytics is not necessary for the
 * service, so it needs prior consent (art. 399 PKE); the choice can be changed in Settings.
 */
export function TelemetryConsentPrompt() {
  const { consent, updateConsent, isConfigured } = useTelemetryConsent();

  if (!isConfigured || consent !== null) {
    return null;
  }

  return (
    <section
      role="region"
      aria-label="Zgoda na statystyki użycia"
      className="fixed bottom-4 right-4 z-50 w-[min(26rem,calc(100vw-2rem))] rounded-xl border border-border bg-card p-4 shadow-raised"
      data-testid="settings-telemetry-prompt"
    >
      <p className="text-[15px] font-medium text-foreground">Pomóż nam ulepszać FiziYo</p>
      <p className="mt-1 text-[13px] text-muted-foreground">
        Za Twoją zgodą zapisujemy, jak korzystasz z panelu (kliknięcia, przejścia między ekranami, błędy), żeby
        skracać Twoją pracę. Teksty na ekranie, w tym dane pacjentów, są zamaskowane i nie trafiają do statystyk.
        Zmienisz to w Ustawieniach.
      </p>
      <div className="mt-4 flex items-center justify-between gap-3">
        <Button variant="outline" onClick={() => updateConsent('denied')} data-testid="settings-telemetry-prompt-deny-btn">
          Nie, dziękuję
        </Button>
        <Button onClick={() => updateConsent('granted')} data-testid="settings-telemetry-prompt-accept-btn">
          Zgadzam się
        </Button>
      </div>
    </section>
  );
}
