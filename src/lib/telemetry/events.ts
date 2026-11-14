/**
 * Tracking plan v1 for the therapist panel. Names follow `area:object_action` in snake_case and
 * must match the mobile app and backend (fizjo-app docs/telemetry/tracking-plan.md).
 */
export type TelemetryEventName =
  | 'assignment_wizard:open'
  | 'assignment_wizard:step_view'
  | 'assignment_wizard:complete'
  | 'assignment_wizard:abandon'
  | 'patient:search'
  | 'exercise_catalog:search'
  | 'telemetry:consent_change';

export type TelemetryPropertyValue = string | number | boolean | null;

export type TelemetryProperties = Readonly<Record<string, TelemetryPropertyValue | undefined>>;

const MAX_STRING_LENGTH = 120;

/**
 * Keys that could carry personal or clinical data. Telemetry never sends them, even if a caller
 * passes them by mistake (GDPR art. 9: clinics' patient data must not reach analytics).
 */
const FORBIDDEN_KEY_PATTERN =
  /(e-?mail|name|phone|note|diagnos|message|comment|description|address|pesel|birth|token|password)/i;

export function isForbiddenPropertyKey(key: string): boolean {
  return FORBIDDEN_KEY_PATTERN.test(key);
}

export function sanitizeProperties(
  properties: TelemetryProperties | undefined
): Record<string, TelemetryPropertyValue> {
  const result: Record<string, TelemetryPropertyValue> = {};
  if (!properties) {
    return result;
  }

  for (const [key, value] of Object.entries(properties)) {
    if (value === undefined || isForbiddenPropertyKey(key)) {
      continue;
    }
    result[key] = typeof value === 'string' ? value.slice(0, MAX_STRING_LENGTH) : value;
  }

  return result;
}

/**
 * Query strings and hashes can hold search phrases (patient names), so URLs keep only the path.
 */
const ID_SEGMENT_PATTERN = /^(?:[0-9a-f]{8}-[0-9a-f-]{27,}|[0-9a-f]{32}|[0-9a-f]{24}|\d+)$/i;
const ORIGIN_PATTERN = /^[a-z][a-z0-9+.-]*:\/\/[^/]*/i;

/**
 * Drops query and hash (search phrases) and replaces record ids with `:id`, so `/patients/<id>`
 * groups by route and never ties a therapist to a patient record.
 */
export function redactUrl(url: string): string {
  const cutAt = url.search(/[?#]/);
  const withoutQuery = cutAt === -1 ? url : url.slice(0, cutAt);
  const origin = ORIGIN_PATTERN.exec(withoutQuery)?.[0] ?? '';
  const path = withoutQuery
    .slice(origin.length)
    .split('/')
    .map((segment) => (ID_SEGMENT_PATTERN.test(segment) ? ':id' : segment))
    .join('/');
  return `${origin}${path}`;
}

const URL_LIKE_PATTERN = /^(?:https?:\/\/|\/)/i;

const EMBEDDED_ID_SEGMENT_PATTERN = /\/(?:[0-9a-f]{8}-[0-9a-f-]{27,}|[0-9a-f]{32}|[0-9a-f]{24})(?=$|[/?#\s"'])/gi;

/** Whole URLs lose query and ids; free text (exception messages) loses embedded record ids. */
function redactIfUrl(value: string): string {
  return URL_LIKE_PATTERN.test(value) ? redactUrl(value) : value.replace(EMBEDDED_ID_SEGMENT_PATTERN, '/:id');
}

/**
 * Applies `redactUrl` to every URL-like string and object key, at any depth. The SDK copies the
 * address into fields we do not name ($session_entry_url, $set_once, $heatmap_data keys), so a
 * list of known keys always misses one.
 */
export function redactUrlsDeep(value: unknown): unknown {
  if (typeof value === 'string') {
    return redactIfUrl(value);
  }
  if (Array.isArray(value)) {
    return value.map(redactUrlsDeep);
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, nested]) => [redactIfUrl(key), redactUrlsDeep(nested)]));
  }
  return value;
}

const EMAIL_PATTERN = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const DIGIT_RUN_PATTERN = /\+?\d(?:[ -]?\d){3,}/g;
const MAX_EXCEPTION_MESSAGE_LENGTH = 300;

/**
 * Engine errors describe code (`Cannot read properties of undefined`), so their message stays,
 * sanitized. Every other type (`Error`, `ApolloError`, app errors) can quote a server answer or a
 * record, and so can `SyntaxError` (V8 quotes the input of `JSON.parse`): its message is withheld,
 * like the backend's and the mobile app's. Residual risk: an engine message can still quote a
 * property name taken from data, and a thrown plain object can claim `name: 'TypeError'`.
 */
const MESSAGE_SAFE_TYPES = new Set(['TypeError', 'ReferenceError', 'RangeError', 'URIError', 'EvalError']);
export const WITHHELD_EXCEPTION_MESSAGE = 'message withheld';

function sanitizeExceptionItem(item: unknown): unknown {
  if (item === null || typeof item !== 'object') {
    return item;
  }
  if (!('value' in item)) {
    return item;
  }
  const { type, value } = item as { type?: unknown; value?: unknown };
  if (typeof value !== 'string' || typeof type !== 'string' || !MESSAGE_SAFE_TYPES.has(type)) {
    return { ...item, value: WITHHELD_EXCEPTION_MESSAGE };
  }
  return {
    ...item,
    value: value
      .replace(EMAIL_PATTERN, '[email]')
      .replace(DIGIT_RUN_PATTERN, '[num]')
      .slice(0, MAX_EXCEPTION_MESSAGE_LENGTH),
  };
}

/**
 * `$exception` messages quote what failed (an e-mail, a name, a server answer), and
 * `$exception_steps` are free-text breadcrumbs: only engine errors keep a message, without e-mails
 * and digit runs, and steps are dropped. Ids and URLs are handled by `redactUrlsDeep`.
 */
export function sanitizeExceptionProperties(properties: Record<string, unknown>): Record<string, unknown> {
  const { $exception_steps: _steps, ...rest } = properties;
  const list = rest.$exception_list;
  return Array.isArray(list) ? { ...rest, $exception_list: list.map(sanitizeExceptionItem) } : rest;
}
