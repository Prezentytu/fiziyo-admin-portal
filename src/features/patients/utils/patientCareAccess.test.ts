import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { describe, expect, it, vi } from 'vitest';

import {
  PATIENT_UNDER_OTHER_THERAPIST,
  PATIENT_UNDER_OTHER_THERAPIST_MESSAGE,
  evictPatientLists,
  isPatientUnderOtherTherapistError,
  isRestrictedToOwnPatients,
  patientUnderOtherTherapistMessage,
} from './patientCareAccess';

function graphQLError(...errors: Array<{ message: string; code?: string }>) {
  return new CombinedGraphQLErrors({
    data: null,
    errors: errors.map(({ message, code }) => ({ message, ...(code ? { extensions: { code } } : {}) })),
  });
}

describe('isPatientUnderOtherTherapistError', () => {
  it('recognises the backend code on any error of the response', () => {
    expect(isPatientUnderOtherTherapistError(graphQLError({ message: 'x', code: PATIENT_UNDER_OTHER_THERAPIST }))).toBe(true);
    expect(
      isPatientUnderOtherTherapistError(
        graphQLError({ message: 'inny', code: 'HC0018' }, { message: 'x', code: PATIENT_UNDER_OTHER_THERAPIST })
      )
    ).toBe(true);
  });

  it('ignores other codes, the same sentence without the code and non-GraphQL errors', () => {
    expect(isPatientUnderOtherTherapistError(graphQLError({ message: 'x', code: 'PATIENT_INVITE_REQUIRED' }))).toBe(false);
    expect(isPatientUnderOtherTherapistError(graphQLError({ message: PATIENT_UNDER_OTHER_THERAPIST_MESSAGE }))).toBe(false);
    expect(isPatientUnderOtherTherapistError(new Error(PATIENT_UNDER_OTHER_THERAPIST))).toBe(false);
    expect(isPatientUnderOtherTherapistError(undefined)).toBe(false);
  });
});

describe('patientUnderOtherTherapistMessage', () => {
  it('returns the sentence of the error that carries the code', () => {
    const error = graphQLError(
      { message: 'Nieoczekiwany błąd', code: 'HC0018' },
      { message: 'Pacjenta prowadzi ktoś inny.', code: PATIENT_UNDER_OTHER_THERAPIST }
    );
    expect(patientUnderOtherTherapistMessage(error)).toBe('Pacjenta prowadzi ktoś inny.');
  });

  it('falls back to the known sentence when the backend sent none', () => {
    expect(patientUnderOtherTherapistMessage(graphQLError({ message: ' ', code: PATIENT_UNDER_OTHER_THERAPIST }))).toBe(
      PATIENT_UNDER_OTHER_THERAPIST_MESSAGE
    );
  });

  it('is null for every other failure, so callers keep their own error path', () => {
    expect(patientUnderOtherTherapistMessage(graphQLError({ message: 'Brak dostępu', code: 'AUTH_NOT_AUTHORIZED' }))).toBeNull();
    expect(patientUnderOtherTherapistMessage(new TypeError('Failed to fetch'))).toBeNull();
  });
});

describe('isRestrictedToOwnPatients', () => {
  it.each([
    ['owner', false, false],
    ['admin', false, false],
    ['therapist', false, true],
    ['staff', false, true],
    ['THERAPIST', false, true],
    ['therapist', true, false],
    ['staff', true, false],
  ])('%s with the setting %s -> restricted %s', (role, setting, expected) => {
    expect(isRestrictedToOwnPatients(role, setting)).toBe(expected);
  });

  it('does not restrict the UI before the role or the setting is known', () => {
    expect(isRestrictedToOwnPatients('therapist', undefined)).toBe(false);
    expect(isRestrictedToOwnPatients('therapist', null)).toBe(false);
    expect(isRestrictedToOwnPatients(null, false)).toBe(false);
  });
});

describe('evictPatientLists', () => {
  it('drops every cached read that depends on patient visibility, the patient card included', () => {
    const cache = { evict: vi.fn(), gc: vi.fn() };
    evictPatientLists(cache);
    // userById and patientAssignments: /patients/[id] reads them cache-first, so a card opened before the
    // owner turned the setting off would otherwise render from cache instead of the refusal.
    expect(cache.evict.mock.calls.map(([options]) => options)).toEqual([
      { id: 'ROOT_QUERY', fieldName: 'organizationPatients' },
      { id: 'ROOT_QUERY', fieldName: 'therapistPatients' },
      { id: 'ROOT_QUERY', fieldName: 'organizationMembers' },
      { id: 'ROOT_QUERY', fieldName: 'userById' },
      { id: 'ROOT_QUERY', fieldName: 'patientAssignments' },
    ]);
    expect(cache.gc).toHaveBeenCalledTimes(1);
  });
});
