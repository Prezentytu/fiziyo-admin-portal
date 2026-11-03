import posthog, { type CaptureResult } from 'posthog-js';
import { readTelemetryConsent, writeTelemetryConsent, type TelemetryConsent } from './consent';
import { getTelemetryConfig, type TelemetryConfig } from './config';
import { sanitizeProperties, stripUrlQuery, type TelemetryEventName, type TelemetryProperties } from './events';

interface TelemetryIdentity {
  userId: string;
  role: string | null;
  organizationId: string | null;
}

let activeConfig: TelemetryConfig | null = null;
let started = false;

const URL_PROPERTIES = ['$current_url', '$referrer', '$initial_current_url', '$initial_referrer'] as const;

function stripUrls(event: CaptureResult | null): CaptureResult | null {
  if (!event) {
    return null;
  }
  for (const key of URL_PROPERTIES) {
    const value = event.properties[key];
    if (typeof value === 'string') {
      event.properties[key] = stripUrlQuery(value);
    }
  }
  return event;
}

/**
 * PostHog is initialised only after the user grants consent (art. 399 PKE), so nothing is
 * stored on the device or sent before that.
 */
function start(config: TelemetryConfig): void {
  if (started) {
    posthog.opt_in_capturing();
    return;
  }

  posthog.init(config.apiKey, {
    api_host: config.apiHost,
    ui_host: config.uiHost,
    person_profiles: 'identified_only',
    capture_pageview: false,
    capture_pageleave: true,
    autocapture: true,
    capture_exceptions: true,
    // Element text and attributes can contain patient names; heatmaps and rage clicks still work.
    mask_all_text: true,
    mask_all_element_attributes: true,
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: '*',
    },
    before_send: stripUrls,
  });
  registerBaseProperties(config);
  started = true;
}

function registerBaseProperties(config: TelemetryConfig): void {
  posthog.register({ environment: config.environment, platform: 'portal' });
}

export function initTelemetry(): void {
  if (typeof window === 'undefined') {
    return;
  }
  activeConfig = getTelemetryConfig({
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_UI_HOST: process.env.NEXT_PUBLIC_POSTHOG_UI_HOST,
    NEXT_PUBLIC_VERCEL_ENV: process.env.NEXT_PUBLIC_VERCEL_ENV,
  });
  if (activeConfig && readTelemetryConsent() === 'granted') {
    start(activeConfig);
  }
}

export function isTelemetryConfigured(): boolean {
  return activeConfig !== null;
}

export function setTelemetryConsent(consent: TelemetryConsent): void {
  writeTelemetryConsent(consent);
  if (!activeConfig) {
    return;
  }
  if (consent === 'granted') {
    start(activeConfig);
    trackEvent('telemetry:consent_change', { consent });
    return;
  }
  if (started) {
    posthog.opt_out_capturing();
    posthog.reset();
  }
}

export function trackEvent(event: TelemetryEventName, properties?: TelemetryProperties): void {
  if (!started) {
    return;
  }
  posthog.capture(event, sanitizeProperties(properties));
}

export function trackPageView(path: string): void {
  if (!started) {
    return;
  }
  posthog.capture('$pageview', { $current_url: `${window.location.origin}${stripUrlQuery(path)}` });
}

/** Identity is our internal user id from the backend JWT (`sub`), never e-mail or name. */
export function identifyTelemetryUser(identity: TelemetryIdentity): void {
  if (!started) {
    return;
  }
  if (posthog.get_distinct_id() !== identity.userId) {
    posthog.identify(identity.userId);
  }
  posthog.register({ role: identity.role, organization_id: identity.organizationId });
  posthog.setPersonProperties({ role: identity.role, organization_id: identity.organizationId });
}

export function resetTelemetryUser(): void {
  if (started && activeConfig) {
    posthog.reset();
    registerBaseProperties(activeConfig);
  }
}
