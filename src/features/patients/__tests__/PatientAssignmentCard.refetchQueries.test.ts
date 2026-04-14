import { describe, expect, it } from 'vitest';

import { GET_ORGANIZATION_EXERCISE_SETS_QUERY } from '@/graphql/queries/exerciseSets.queries';
import { GET_PATIENT_ASSIGNMENTS_BY_USER_QUERY } from '@/graphql/queries/patientAssignments.queries';

import { buildUnassignRefetchQueries } from '../PatientAssignmentCard';

describe('buildUnassignRefetchQueries', () => {
  it('zawsze odswieza przypisania pacjenta', () => {
    const result = buildUnassignRefetchQueries('patient-1');

    expect(result).toEqual([{ query: GET_PATIENT_ASSIGNMENTS_BY_USER_QUERY, variables: { userId: 'patient-1' } }]);
  });

  it('dodaje refetch listy zestawow organizacji gdy organizationId jest dostepne', () => {
    const result = buildUnassignRefetchQueries('patient-1', 'org-1');

    expect(result).toEqual([
      { query: GET_PATIENT_ASSIGNMENTS_BY_USER_QUERY, variables: { userId: 'patient-1' } },
      { query: GET_ORGANIZATION_EXERCISE_SETS_QUERY, variables: { organizationId: 'org-1' } },
    ]);
  });
});
