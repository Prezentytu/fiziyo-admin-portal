import { describe, expect, it } from 'vitest';

import { GET_ORGANIZATION_PATIENTS_QUERY, GET_THERAPIST_PATIENTS_QUERY } from '@/graphql/queries/therapists.queries';
import { formatPatientPhone, patientCreateRefetchQueries } from '../shadowPatient';

describe('formatPatientPhone', () => {
  it('sends a full number without spaces, or null when there is none', () => {
    expect(formatPatientPhone('600 100 200')).toBe('+48600100200');
    expect(formatPatientPhone('+49 151 2345678')).toBe('+491512345678');
    expect(formatPatientPhone('  ')).toBeNull();
    expect(formatPatientPhone(undefined)).toBeNull();
  });
});

describe('patientCreateRefetchQueries', () => {
  it("refreshes the organization's and the therapist's patient lists", () => {
    const queries = patientCreateRefetchQueries('org-1', 't-1');
    expect(queries).toContainEqual({ query: GET_ORGANIZATION_PATIENTS_QUERY, variables: { organizationId: 'org-1', filter: 'my' } });
    expect(queries).toContainEqual({ query: GET_THERAPIST_PATIENTS_QUERY, variables: { therapistId: 't-1', organizationId: 'org-1' } });
  });

  it('skips the therapist lists until the therapist is known', () => {
    expect(patientCreateRefetchQueries('org-1', undefined).map((entry) => entry.query)).not.toContain(
      GET_THERAPIST_PATIENTS_QUERY
    );
  });
});
