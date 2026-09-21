/**
 * Canonical https URLs encoded in patient-facing QR codes.
 * Camera scanners only open http(s); custom schemes show "no usable data".
 * Path matches backend RevenueMutation: `${BaseUrl}/start?token={token}`.
 */

export const PATIENT_JOIN_ORIGIN = 'https://fiziyo.pl';
export const PATIENT_START_PATH = '/start';

export function buildPatientJoinUrl(code: string): string {
  const token = code.trim();
  if (!token) {
    throw new Error('Patient join code is required');
  }
  const url = new URL(PATIENT_START_PATH, PATIENT_JOIN_ORIGIN);
  url.searchParams.set('token', token);
  return url.toString();
}

export function tryBuildPatientJoinUrl(code: string | null | undefined): string | null {
  if (!code?.trim()) return null;
  try {
    return buildPatientJoinUrl(code);
  } catch {
    return null;
  }
}

export interface PatientConnectParams {
  patientId: string;
  organizationId: string;
  therapistId: string;
}

/**
 * App `/connect` rejects the link unless patient, org and therapist are all present.
 * IDs in the URL are routing hints, not authorization.
 */
export function buildPatientConnectUrl(params: PatientConnectParams): string {
  const patientId = params.patientId.trim();
  const organizationId = params.organizationId.trim();
  const therapistId = params.therapistId.trim();
  if (!patientId || !organizationId || !therapistId) {
    throw new Error('Patient connect URL requires patientId, organizationId and therapistId');
  }
  const url = new URL(PATIENT_START_PATH, PATIENT_JOIN_ORIGIN);
  url.searchParams.set('patient', patientId);
  url.searchParams.set('org', organizationId);
  url.searchParams.set('therapist', therapistId);
  return url.toString();
}

export function tryBuildPatientConnectUrl(
  params: Partial<PatientConnectParams> | null | undefined
): string | null {
  const patientId = params?.patientId;
  const organizationId = params?.organizationId;
  const therapistId = params?.therapistId;
  if (!params || !patientId?.trim() || !organizationId?.trim() || !therapistId?.trim()) {
    return null;
  }
  try {
    return buildPatientConnectUrl({
      patientId,
      organizationId,
      therapistId,
    });
  } catch {
    return null;
  }
}

export function withPatientDisplayName(joinUrl: string, name: string): string {
  const trimmedName = name.trim();
  if (!trimmedName) return joinUrl;
  const url = new URL(joinUrl);
  url.searchParams.set('name', trimmedName);
  return url.toString();
}

export function resolvePatientJoinUrlFromInvite(result: {
  token?: string | null;
  fullUrl?: string | null;
}): string | null {
  const fromToken = tryBuildPatientJoinUrl(result.token);
  if (fromToken) return fromToken;
  if (!result.fullUrl) return null;
  try {
    const parsed = new URL(result.fullUrl);
    return tryBuildPatientJoinUrl(parsed.searchParams.get('token'));
  } catch {
    return null;
  }
}

export function isHttpsUrl(value: string | null | undefined): value is string {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export const PATIENT_START_URL = `${PATIENT_JOIN_ORIGIN}${PATIENT_START_PATH}`;
