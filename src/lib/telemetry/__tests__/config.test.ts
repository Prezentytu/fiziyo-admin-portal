import { describe, expect, it } from 'vitest';
import { getTelemetryConfig } from '../config';
import { parseTelemetryConsent } from '../consent';
import { finishFlow, startFlow } from '../flowTimer';

describe('getTelemetryConfig', () => {
  it('is disabled without a project key', () => {
    expect(getTelemetryConfig({})).toBeNull();
    expect(getTelemetryConfig({ NEXT_PUBLIC_POSTHOG_KEY: '  ' })).toBeNull();
  });

  it('sends through the same-origin proxy to the EU host by default', () => {
    expect(getTelemetryConfig({ NEXT_PUBLIC_POSTHOG_KEY: 'phc_test', NEXT_PUBLIC_VERCEL_ENV: 'production' })).toEqual({
      apiKey: 'phc_test',
      apiHost: 'https://eu.i.posthog.com',
      uiHost: 'https://eu.posthog.com',
      environment: 'production',
    });
  });
});

describe('parseTelemetryConsent', () => {
  it('accepts only explicit decisions', () => {
    expect(parseTelemetryConsent('granted')).toBe('granted');
    expect(parseTelemetryConsent('denied')).toBe('denied');
    expect(parseTelemetryConsent('yes')).toBeNull();
    expect(parseTelemetryConsent(null)).toBeNull();
  });
});

describe('flowTimer', () => {
  it('measures a started flow once', () => {
    startFlow('wizard', 1_000);

    expect(finishFlow('wizard', 4_500)).toBe(3_500);
    expect(finishFlow('wizard', 5_000)).toBeNull();
  });
});
