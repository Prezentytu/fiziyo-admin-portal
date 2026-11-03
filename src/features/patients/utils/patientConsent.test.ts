import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { describe, expect, it } from 'vitest';

import { getGraphQLErrorCode, getGraphQLErrorMessage, selectPendingPatientInvitations } from './patientConsent';

describe('getGraphQLErrorCode', () => {
  it('reads extensions.code from a CombinedGraphQLErrors', () => {
    const error = new CombinedGraphQLErrors({
      errors: [{ message: 'x' }, { message: 'y', extensions: { code: 'PATIENT_INVITE_REQUIRED' } }],
    });
    expect(getGraphQLErrorCode(error)).toBe('PATIENT_INVITE_REQUIRED');
  });

  it('returns null for a network error and for the Apollo 3 shape', () => {
    expect(getGraphQLErrorCode(new Error('Failed to fetch'))).toBeNull();
    expect(
      getGraphQLErrorCode({ graphQLErrors: [{ message: 'x', extensions: { code: 'PATIENT_INVITE_REQUIRED' } }] })
    ).toBeNull();
  });
});

describe('getGraphQLErrorMessage', () => {
  it('prefers the first server message and falls back otherwise', () => {
    const error = new CombinedGraphQLErrors({ errors: [{ message: 'Komunikat z backendu' }] });
    expect(getGraphQLErrorMessage(error, 'fallback')).toBe('Komunikat z backendu');
    expect(getGraphQLErrorMessage(new Error('Failed to fetch'), 'fallback')).toBe('fallback');
  });
});

describe('selectPendingPatientInvitations', () => {
  const base = { organizationId: 'org-1', createdAt: '2026-10-01T10:00:00Z' };
  const now = new Date('2026-11-01T12:00:00Z');

  it('keeps pending, unexpired invitations, newest first', () => {
    const result = selectPendingPatientInvitations(
      [
        { ...base, id: 'old', email: 'a@x.pl', status: 'pending', expiresAt: '2026-11-10T00:00:00Z' },
        { ...base, id: 'expired', email: 'b@x.pl', status: 'pending', expiresAt: '2026-10-31T00:00:00Z' },
        { ...base, id: 'accepted', email: 'c@x.pl', status: 'accepted', expiresAt: '2026-11-10T00:00:00Z' },
        {
          ...base,
          id: 'new',
          email: 'd@x.pl',
          status: 'pending',
          createdAt: '2026-10-30T10:00:00Z',
          expiresAt: '2026-11-10T00:00:00Z',
        },
      ],
      now
    );
    expect(result.map((invitation) => invitation.id)).toEqual(['new', 'old']);
  });
});
