'use client';

import { useEffect, useState } from 'react';

import { fetchMeFeatures, type MeFeatures } from '@/lib/meFeatures';
import { getBackendToken } from '@/lib/tokenCache';

const TOKEN_RETRY_MS = 1_000;
const TOKEN_RETRIES = 10;

// Keyed by the backend token: another user in the same tab gets a new token and a fresh read.
let cached: { token: string; features: MeFeatures } | null = null;
let inFlight: Promise<MeFeatures | null> | null = null;

function cachedForCurrentToken(): MeFeatures | null {
  const token = getBackendToken();
  return cached && token && cached.token === token ? cached.features : null;
}

function loadOnce(): Promise<MeFeatures | null> {
  const token = getBackendToken();
  inFlight ??= fetchMeFeatures(undefined, token).then((features) => {
    if (features && token) cached = { token, features };
    inFlight = null;
    return features;
  });
  return inFlight;
}

/** One SPEC-052 flag for the signed-in user; false until known, so gated UI never flashes. */
export function useMeFeature(key: string): boolean {
  const [features, setFeatures] = useState<MeFeatures | null>(cachedForCurrentToken);

  useEffect(() => {
    if (features) return;
    let cancelled = false;
    let attempt = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tryLoad = () => {
      void loadOnce().then((loaded) => {
        if (cancelled) return;
        if (loaded) {
          setFeatures(loaded);
        } else if (attempt++ < TOKEN_RETRIES) {
          timer = setTimeout(tryLoad, TOKEN_RETRY_MS);
        }
      });
    };
    tryLoad();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [features]);

  return features?.[key] === true;
}
