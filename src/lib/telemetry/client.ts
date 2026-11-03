import posthog, { type CaptureResult } from 'posthog-js';
import { readTelemetryConsent, writeTelemetryConsent, type TelemetryConsent } from './consent';
import { getTelemetryConfig, type TelemetryConfig } from './config';
import { sanitizeProperties, redactUrl, type TelemetryEventName, type TelemetryProperties } from './events';

export interface TelemetryUser {
  userId: string;
  role: string | null;
  organizationId: string | null;
}

let activeConfig: TelemetryConfig | null = null;
let initialized = false;
let activeUser: TelemetryUser | null = null;
let consent: TelemetryConsent | null = null;
const listeners = new Set<() => void>();

const URL_PROPERTIES = [
  '$current_url',
  '$referrer',
  '$initial_current_url',
  '$initial_referrer',
  '$pathname',
  '$initial_pathname',
] as const;

function stripUrls(event: CaptureResult | null): CaptureResult | null {
  if (!event) {
    return null;
  }
  for (const key of URL_PROPERTIES) {
    const value = event.properties[key];
    if (typeof value === 'string') {
      event.properties[key] = redactUrl(value);
    }
  }
  return event;
}

/**
 * PostHog is initialised only after the signed-in person grants consent (art. 399 PKE), so nothing
 * is stored on the device or sent before that. Consent belongs to the person, not the browser.
 */
function ensureInitialized(config: TelemetryConfig): void {
  if (initialized) {
    return;
  }
  posthog.init(config.apiKey, {
    api_host: config.apiHost,
    ui_host: config.uiHost,
    // reset() clears the SDK's own opt-in; this keeps it opted out until we opt in again.
    opt_out_capturing_by_default: true,
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
  initialized = true;
}

function isCapturing(): boolean {
  return initialized && activeUser !== null && consent === 'granted';
}

function startCapture(config: TelemetryConfig, user: TelemetryUser): void {
  ensureInitialized(config);
  posthog.opt_in_capturing();
  posthog.register({ environment: config.environment, platform: 'portal' });
  if (posthog.get_distinct_id() !== user.userId) {
    posthog.identify(user.userId);
  }
  registerUserProperties(user);
}

function registerUserProperties(user: TelemetryUser): void {
  posthog.register({ role: user.role, organization_id: user.organizationId });
  posthog.setPersonProperties({ role: user.role, organization_id: user.organizationId });
}

/** reset() first: in posthog-js it clears the opt-out too, so the opt-out has to come after it. */
function stopCapture(): void {
  if (!initialized) {
    return;
  }
  posthog.reset();
  posthog.opt_out_capturing();
}

function notify(): void {
  listeners.forEach((listener) => listener());
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
}

export function isTelemetryConfigured(): boolean {
  return activeConfig !== null;
}

export function subscribeTelemetry(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Consent of the bound person; null while nobody is bound or the person has not decided. */
export function getTelemetryConsent(): TelemetryConsent | null {
  return consent;
}

export function hasTelemetryUser(): boolean {
  return activeUser !== null;
}

/**
 * Binds telemetry to the signed-in person (`sub` of the backend JWT, never e-mail or name).
 * A different person, or none, stops capture first; it resumes only with that person's consent.
 */
export function setTelemetryUser(user: TelemetryUser | null): void {
  if (user && activeUser && user.userId === activeUser.userId) {
    const changed = user.role !== activeUser.role || user.organizationId !== activeUser.organizationId;
    activeUser = user;
    if (changed && isCapturing()) {
      registerUserProperties(user);
    }
    return;
  }
  stopCapture();
  activeUser = user;
  consent = user ? readTelemetryConsent(user.userId) : null;
  if (user && consent === 'granted' && activeConfig) {
    startCapture(activeConfig, user);
  }
  notify();
}

export function setTelemetryConsent(next: TelemetryConsent): void {
  const user = activeUser;
  if (!user) {
    return;
  }
  writeTelemetryConsent(user.userId, next);
  consent = next;
  if (activeConfig) {
    if (next === 'granted') {
      startCapture(activeConfig, user);
      trackEvent('telemetry:consent_change', { consent: next });
    } else {
      stopCapture();
    }
  }
  notify();
}

export function trackEvent(event: TelemetryEventName, properties?: TelemetryProperties): void {
  if (!isCapturing()) {
    return;
  }
  posthog.capture(event, sanitizeProperties(properties));
}

export function trackPageView(path: string): void {
  if (!isCapturing()) {
    return;
  }
  posthog.capture('$pageview', { $current_url: `${window.location.origin}${redactUrl(path)}` });
}
