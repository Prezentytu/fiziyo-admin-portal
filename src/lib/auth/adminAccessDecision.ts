interface DecideAdminAccessInput {
  role?: string | null;
  statusCode?: number | null;
  errorCode?: string | null;
  errorMessage?: string;
}

type PatientDecisionReason = 'role_claim' | 'backend_403';
type NoOrganizationReason = '401' | 'not_belonging';

export type AdminAccessDecision =
  | { kind: 'allowed' }
  | { kind: 'patient'; reason: PatientDecisionReason }
  | { kind: 'no-organization'; reason: NoOrganizationReason }
  | { kind: 'pending'; reason: '404' }
  | { kind: 'error'; reason: string };

const PATIENT_ROLE = 'patient';
const PATIENT_NOT_ALLOWED_CODE = 'PATIENT_NOT_ALLOWED_ON_ADMIN';

export function decideAdminAccess({
  role,
  statusCode,
  errorCode,
  errorMessage = '',
}: DecideAdminAccessInput): AdminAccessDecision {
  const normalizedRole = role?.trim().toLowerCase();
  if (normalizedRole === PATIENT_ROLE) {
    return { kind: 'patient', reason: 'role_claim' };
  }

  if (statusCode === 403 && errorCode === PATIENT_NOT_ALLOWED_CODE) {
    return { kind: 'patient', reason: 'backend_403' };
  }

  if (statusCode === 404) {
    return { kind: 'pending', reason: '404' };
  }

  if (statusCode === 401 || errorMessage.includes('401')) {
    return { kind: 'no-organization', reason: '401' };
  }

  if (errorMessage.includes('does not belong') || errorMessage.includes('organization')) {
    return { kind: 'no-organization', reason: 'not_belonging' };
  }

  if (statusCode !== null && statusCode !== undefined) {
    return { kind: 'error', reason: `status_${statusCode}` };
  }

  return { kind: 'allowed' };
}
