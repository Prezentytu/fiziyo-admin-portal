import { print } from 'graphql';
import { describe, expect, it } from 'vitest';

import {
  GET_ORGANIZATION_BY_ID_QUERY,
  GET_ORGANIZATION_PATIENT_VISIBILITY_QUERY,
} from '../queries/organizations.queries';

describe('patient visibility setting in organization documents', () => {
  // The shared fragment feeds PDF, QR and billing screens; a backend without the field rejects the whole document.
  it('stays out of the shared organization document', () => {
    expect(print(GET_ORGANIZATION_BY_ID_QUERY)).not.toContain('therapistsSeeAllPatients');
  });

  it('is read by its own small query', () => {
    expect(print(GET_ORGANIZATION_PATIENT_VISIBILITY_QUERY)).toContain('therapistsSeeAllPatients');
  });
});
