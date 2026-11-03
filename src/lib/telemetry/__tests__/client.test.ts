import { beforeEach, describe, expect, it, vi } from 'vitest';

const sdk = vi.hoisted(() => {
  const state = { optedOut: true, distinctId: 'anonymous', calls: [] as string[] };
  const posthog = {
    init: vi.fn(),
    register: vi.fn(),
    setPersonProperties: vi.fn(),
    get_distinct_id: () => state.distinctId,
    opt_in_capturing: () => {
      state.optedOut = false;
      state.calls.push('opt_in');
    },
    opt_out_capturing: () => {
      state.optedOut = true;
      state.calls.push('opt_out');
    },
    // posthog-js 1.445 reset() also clears the opt-out flag.
    reset: () => {
      state.optedOut = false;
      state.distinctId = 'anonymous';
      state.calls.push('reset');
    },
    identify: (id: string) => {
      state.distinctId = id;
      if (!state.optedOut) {
        state.calls.push(`identify:${id}`);
      }
    },
    capture: (name: string) => {
      if (!state.optedOut) {
        state.calls.push(`capture:${name}`);
      }
    },
  };
  return { state, posthog };
});

vi.mock('posthog-js', () => ({ default: sdk.posthog }));

type TelemetryClient = typeof import('../client');

async function loadClient(): Promise<TelemetryClient> {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test');
  const client = await import('../client');
  client.initTelemetry();
  return client;
}

const therapistA = { userId: 'user-a', role: 'therapist', organizationId: 'org-1' };
const therapistB = { userId: 'user-b', role: 'therapist', organizationId: 'org-1' };

describe('portal telemetry consent', () => {
  beforeEach(() => {
    window.localStorage.clear();
    sdk.state.optedOut = true;
    sdk.state.distinctId = 'anonymous';
    sdk.state.calls.length = 0;
  });

  it('does not track the next therapist on a shared computer after the first one opted in', async () => {
    const telemetry = await loadClient();
    telemetry.setTelemetryUser(therapistA);
    telemetry.setTelemetryConsent('granted');
    telemetry.setTelemetryUser(null);
    telemetry.setTelemetryUser(therapistB);
    sdk.state.calls.length = 0;

    telemetry.trackPageView('/patients');
    telemetry.trackEvent('telemetry:consent_change', { consent: 'granted' });

    expect(telemetry.getTelemetryConsent()).toBeNull();
    expect(sdk.state.calls).toEqual([]);
  });

  it('stops sending after consent is withdrawn, without a reload', async () => {
    const telemetry = await loadClient();
    telemetry.setTelemetryUser(therapistA);
    telemetry.setTelemetryConsent('granted');

    telemetry.setTelemetryConsent('denied');
    sdk.state.calls.length = 0;
    telemetry.trackPageView('/exercises');

    expect(sdk.state.optedOut).toBe(true);
    expect(sdk.state.calls).toEqual([]);
  });

  it('resumes for the therapist who opted in, under their own id', async () => {
    const telemetry = await loadClient();
    telemetry.setTelemetryUser(therapistA);
    telemetry.setTelemetryConsent('granted');
    telemetry.setTelemetryUser(null);
    sdk.state.calls.length = 0;

    telemetry.setTelemetryUser(therapistA);
    telemetry.trackPageView('/patients');

    expect(sdk.state.calls).toEqual(['reset', 'opt_out', 'opt_in', 'identify:user-a', 'capture:$pageview']);
  });
});
