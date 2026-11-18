import { CombinedGraphQLErrors } from '@apollo/client/errors';
import type { ApolloCache } from '@apollo/client';

/** `extensions.code` of `fizjo-app:backend/FizjoApp.Api/Services/PatientCareErrors.cs`. */
export const PATIENT_UNDER_OTHER_THERAPIST = 'PATIENT_UNDER_OTHER_THERAPIST';

/** `spec.notice` of `POST /api/chat/dispatch` for the same refusal. */
export const PATIENT_OTHER_THERAPIST_NOTICE = 'patient_other_therapist';

/** Same sentence as the backend sends; shown when the error carries the code but no message. */
export const PATIENT_UNDER_OTHER_THERAPIST_MESSAGE =
  'Ten pacjent jest już w gabinecie i prowadzi go inny fizjoterapeuta. Poproś właściciela albo administratora gabinetu o przypisanie go do Ciebie.';

export const TAKE_OVER_BLOCKED_HINT =
  'W tym gabinecie pacjentów przypisuje właściciel albo administrator. Poproś o przypisanie pacjenta do Ciebie.';

export const OWN_PATIENTS_ONLY_NOTE =
  'Widzisz pacjentów pod swoją opieką. Pozostałych przypisuje właściciel albo administrator gabinetu.';

/**
 * The patient is in the clinic, but another therapist leads them and the clinic keeps patients private.
 * Any error of the response may carry the code (Apollo 4 throws `CombinedGraphQLErrors`; with
 * `errorPolicy: 'all'` the same object arrives as `error`).
 */
export function isPatientUnderOtherTherapistError(error: unknown): boolean {
  return (
    CombinedGraphQLErrors.is(error) &&
    error.errors.some((item) => item.extensions?.code === PATIENT_UNDER_OTHER_THERAPIST)
  );
}

/** The backend sentence for that refusal; null for every other error. */
export function patientUnderOtherTherapistMessage(error: unknown): string | null {
  if (!CombinedGraphQLErrors.is(error)) return null;
  const refusal = error.errors.find((item) => item.extensions?.code === PATIENT_UNDER_OTHER_THERAPIST);
  if (!refusal) return null;
  return refusal.message?.trim() || PATIENT_UNDER_OTHER_THERAPIST_MESSAGE;
}

/**
 * Mirror of `fizjo-app:backend/FizjoApp.Api/Services/AssignmentVisibilityService.cs` for copy and
 * disabled buttons only; the backend decides. Owner and admin always see the whole clinic. A setting
 * not loaded yet does not restrict the UI, so nothing flashes disabled.
 */
export function isRestrictedToOwnPatients(
  role: string | null | undefined,
  therapistsSeeAllPatients: boolean | null | undefined
): boolean {
  const normalized = role?.toLowerCase();
  return (normalized === 'therapist' || normalized === 'staff') && therapistsSeeAllPatients === false;
}

const PATIENT_LIST_FIELDS = ['organizationPatients', 'therapistPatients', 'organizationMembers'] as const;

/** Patient lists depend on the visibility setting: drop them so every screen reads them again. */
export function evictPatientLists(cache: Pick<ApolloCache, 'evict' | 'gc'>): void {
  for (const fieldName of PATIENT_LIST_FIELDS) {
    cache.evict({ id: 'ROOT_QUERY', fieldName });
  }
  cache.gc();
}
