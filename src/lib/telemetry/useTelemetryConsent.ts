'use client';

import { useCallback, useSyncExternalStore } from 'react';
import type { TelemetryConsent } from './consent';
import {
  getTelemetryConsent,
  hasTelemetryUser,
  isTelemetryConfigured,
  setTelemetryConsent,
  subscribeTelemetry,
} from './client';

function getServerConsent(): TelemetryConsent | null {
  return null;
}

function getServerHasUser(): boolean {
  return false;
}

/** Consent of the signed-in person; `TelemetryIdentity` binds the person and loads the choice. */
export function useTelemetryConsent() {
  const consent = useSyncExternalStore(subscribeTelemetry, getTelemetryConsent, getServerConsent);
  const hasUser = useSyncExternalStore(subscribeTelemetry, hasTelemetryUser, getServerHasUser);

  const updateConsent = useCallback((next: TelemetryConsent) => setTelemetryConsent(next), []);

  return { consent, hasUser, updateConsent, isConfigured: isTelemetryConfigured() };
}
