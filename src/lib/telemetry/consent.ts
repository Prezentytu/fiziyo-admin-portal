export type TelemetryConsent = 'granted' | 'denied';

export const TELEMETRY_CONSENT_STORAGE_KEY = 'fiziyo-telemetry-consent';

export function parseTelemetryConsent(value: string | null | undefined): TelemetryConsent | null {
  return value === 'granted' || value === 'denied' ? value : null;
}

export function readTelemetryConsent(): TelemetryConsent | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return parseTelemetryConsent(window.localStorage.getItem(TELEMETRY_CONSENT_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function writeTelemetryConsent(consent: TelemetryConsent): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(TELEMETRY_CONSENT_STORAGE_KEY, consent);
  } catch {
    // Storage can be blocked; consent then lasts for this page load only.
  }
}
