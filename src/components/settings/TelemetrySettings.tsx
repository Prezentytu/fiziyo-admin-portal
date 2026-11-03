'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useTelemetryConsent } from '@/lib/telemetry/useTelemetryConsent';

export function TelemetrySettings() {
  const { consent, updateConsent, isConfigured } = useTelemetryConsent();

  if (!isConfigured) {
    return null;
  }

  return (
    <Card data-testid="settings-telemetry-card">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold tracking-tight">Statystyki użycia</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Zapisujemy kliknięcia, przejścia między ekranami i błędy, żeby skracać pracę w panelu. Teksty na ekranie, w
          tym dane pacjentów, są zamaskowane.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="settings-telemetry-switch" className="text-[15px] font-medium text-foreground">
            Udostępniaj statystyki użycia
          </Label>
          <Switch
            id="settings-telemetry-switch"
            checked={consent === 'granted'}
            onCheckedChange={(checked) => updateConsent(checked ? 'granted' : 'denied')}
            data-testid="settings-telemetry-switch"
          />
        </div>
      </CardContent>
    </Card>
  );
}
