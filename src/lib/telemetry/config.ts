export interface TelemetryConfig {
  apiKey: string;
  apiHost: string;
  uiHost: string;
  environment: string;
}

interface TelemetryEnv {
  NEXT_PUBLIC_POSTHOG_KEY?: string;
  NEXT_PUBLIC_POSTHOG_UI_HOST?: string;
  NEXT_PUBLIC_VERCEL_ENV?: string;
}

/** Same-origin path rewritten to PostHog EU in next.config.ts, so ad blockers do not drop events. */
export const TELEMETRY_INGEST_PATH = '/ingest';

/**
 * Returns null when no key is configured: local runs, tests and preview builds without the
 * variable send nothing.
 */
export function getTelemetryConfig(env: TelemetryEnv): TelemetryConfig | null {
  const apiKey = env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  return {
    apiKey,
    apiHost: TELEMETRY_INGEST_PATH,
    uiHost: env.NEXT_PUBLIC_POSTHOG_UI_HOST?.trim() || 'https://eu.posthog.com',
    environment: env.NEXT_PUBLIC_VERCEL_ENV?.trim() || 'development',
  };
}
