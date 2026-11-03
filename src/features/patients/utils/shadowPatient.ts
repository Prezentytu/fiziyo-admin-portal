import { GET_ALL_PATIENT_ASSIGNMENTS_QUERY } from '@/graphql/queries/patientAssignments.queries';
import {
  GET_ALL_THERAPIST_PATIENTS_QUERY,
  GET_ORGANIZATION_PATIENTS_QUERY,
  GET_THERAPIST_PATIENTS_QUERY,
} from '@/graphql/queries/therapists.queries';

/** The backend expects a full number: spaces go, a bare Polish number gets +48. */
export function formatPatientPhone(phone: string | null | undefined): string | null {
  const digits = phone?.replace(/\s/g, '');
  if (!digits) return null;
  return digits.startsWith('+') ? digits : `+48${digits}`;
}

/** Every patient list a new patient shows up in: wherever the patient is added, none goes stale. */
export function patientCreateRefetchQueries(organizationId: string, therapistId: string | undefined) {
  return [
    ...(therapistId
      ? [
          { query: GET_THERAPIST_PATIENTS_QUERY, variables: { therapistId, organizationId } },
          { query: GET_ALL_THERAPIST_PATIENTS_QUERY, variables: { therapistId, organizationId } },
        ]
      : []),
    { query: GET_ORGANIZATION_PATIENTS_QUERY, variables: { organizationId, filter: 'all' } },
    { query: GET_ORGANIZATION_PATIENTS_QUERY, variables: { organizationId, filter: 'my' } },
    { query: GET_ALL_PATIENT_ASSIGNMENTS_QUERY },
  ];
}
