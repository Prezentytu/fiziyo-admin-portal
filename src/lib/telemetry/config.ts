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

/**
 * Events go straight to PostHog EU, not through a same-origin rewrite: a rewrite would forward
 * the portal's cookies (Clerk session) to PostHog. A cross-origin request carries none.
 */
export const TELEMETRY_API_HOST = 'https://eu.i.posthog.com';

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
    apiHost: TELEMETRY_API_HOST,
    uiHost: env.NEXT_PUBLIC_POSTHOG_UI_HOST?.trim() || 'https://eu.posthog.com',
    environment: env.NEXT_PUBLIC_VERCEL_ENV?.trim() || 'development',
  };
}
