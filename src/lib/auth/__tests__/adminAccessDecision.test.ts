import { describe, expect, it } from 'vitest';
import { decideAdminAccess } from '../adminAccessDecision';

describe('decideAdminAccess', () => {
  it('returns patient decision for patient role claim', () => {
    const decision = decideAdminAccess({ role: 'patient' });
    expect(decision).toEqual({ kind: 'patient', reason: 'role_claim' });
  });

  it('returns patient decision for backend 403 code', () => {
    const decision = decideAdminAccess({
      statusCode: 403,
      errorCode: 'PATIENT_NOT_ALLOWED_ON_ADMIN',
    });
    expect(decision).toEqual({ kind: 'patient', reason: 'backend_403' });
  });

  it('returns no-organization for 401 status', () => {
    const decision = decideAdminAccess({ statusCode: 401 });
    expect(decision).toEqual({ kind: 'no-organization', reason: '401' });
  });

  it('returns pending for 404 status', () => {
    const decision = decideAdminAccess({ statusCode: 404 });
    expect(decision).toEqual({ kind: 'pending', reason: '404' });
  });

  it('returns allowed when no known error and non-patient role', () => {
    const decision = decideAdminAccess({ role: 'therapist' });
    expect(decision).toEqual({ kind: 'allowed' });
  });
});
