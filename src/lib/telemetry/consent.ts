export type TelemetryConsent = 'granted' | 'denied';

const TELEMETRY_CONSENT_STORAGE_PREFIX = 'fiziyo-telemetry-consent:v2:';

/** One key per person, so the next therapist on a shared reception computer is asked again. */
export function telemetryConsentStorageKey(userId: string): string {
  return `${TELEMETRY_CONSENT_STORAGE_PREFIX}${userId}`;
}

export function parseTelemetryConsent(value: string | null | undefined): TelemetryConsent | null {
  return value === 'granted' || value === 'denied' ? value : null;
}

export function readTelemetryConsent(userId: string): TelemetryConsent | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return parseTelemetryConsent(window.localStorage.getItem(telemetryConsentStorageKey(userId)));
  } catch {
    return null;
  }
}

export function writeTelemetryConsent(userId: string, consent: TelemetryConsent): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(telemetryConsentStorageKey(userId), consent);
  } catch {
    // Storage can be blocked; consent then lasts for this page load only.
  }
}
