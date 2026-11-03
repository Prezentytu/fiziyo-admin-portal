import { CombinedGraphQLErrors } from '@apollo/client/errors';

import type { PatientInvitation } from '@/graphql/types/patientInvitation.types';

export const PATIENT_INVITE_REQUIRED = 'PATIENT_INVITE_REQUIRED';
export const PATIENT_EMAIL_UNAVAILABLE = 'PATIENT_EMAIL_UNAVAILABLE';

/** What the patient sees in the invite step; it must not reveal whether an account exists or promise an email. */
export const PATIENT_INVITE_EXPLANATION =
  'Wyślemy zaproszenie na ten adres. Pacjent dołączy do gabinetu po akceptacji w aplikacji FiziYo.';

/** `extensions.code` of the first GraphQL error that has one (Apollo 4 throws `CombinedGraphQLErrors`). */
export function getGraphQLErrorCode(error: unknown): string | null {
  if (!CombinedGraphQLErrors.is(error)) return null;
  for (const item of error.errors) {
    const code = item.extensions?.code;
    if (typeof code === 'string') return code;
  }
  return null;
}

export function getGraphQLErrorMessage(error: unknown, fallback: string): string {
  if (CombinedGraphQLErrors.is(error)) {
    const message = error.errors[0]?.message;
    if (message) return message;
  }
  return fallback;
}

/** Pending and not yet expired, newest first. */
export function selectPendingPatientInvitations(
  invitations: readonly PatientInvitation[],
  now: Date = new Date()
): PatientInvitation[] {
  return invitations
    .filter((invitation) => invitation.status === 'pending' && new Date(invitation.expiresAt) > now)
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}
