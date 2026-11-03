'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { readTelemetryConsent, type TelemetryConsent } from './consent';
import { isTelemetryConfigured, setTelemetryConsent } from './client';

const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getServerSnapshot(): TelemetryConsent | null {
  return null;
}

export function useTelemetryConsent() {
  const consent = useSyncExternalStore(subscribe, readTelemetryConsent, getServerSnapshot);

  const updateConsent = useCallback((next: TelemetryConsent) => {
    setTelemetryConsent(next);
    listeners.forEach((listener) => listener());
  }, []);

  return { consent, updateConsent, isConfigured: isTelemetryConfigured() };
}
