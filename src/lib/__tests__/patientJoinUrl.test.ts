import { describe, expect, it } from 'vitest';
import {
  PATIENT_START_URL,
  buildPatientConnectUrl,
  buildPatientJoinUrl,
  isHttpsUrl,
  resolvePatientJoinUrlFromInvite,
  tryBuildPatientConnectUrl,
  tryBuildPatientJoinUrl,
  withPatientDisplayName,
} from '../patientJoinUrl';

describe('buildPatientJoinUrl', () => {
  it('builds https://fiziyo.pl/start?token= for an invite code', () => {
    expect(buildPatientJoinUrl('abc-123')).toBe('https://fiziyo.pl/start?token=abc-123');
  });

  it('trims whitespace and encodes reserved characters', () => {
    expect(buildPatientJoinUrl('  a b/c  ')).toBe('https://fiziyo.pl/start?token=a+b%2Fc');
  });

  it('throws on empty or whitespace-only code', () => {
    expect(() => buildPatientJoinUrl('')).toThrow('Patient join code is required');
    expect(() => buildPatientJoinUrl('   ')).toThrow('Patient join code is required');
  });
});

describe('tryBuildPatientJoinUrl', () => {
  it('returns null instead of throwing for missing code', () => {
    expect(tryBuildPatientJoinUrl(undefined)).toBeNull();
    expect(tryBuildPatientJoinUrl(null)).toBeNull();
    expect(tryBuildPatientJoinUrl('')).toBeNull();
  });
});

describe('buildPatientConnectUrl', () => {
  it('builds https start URL with patient and org', () => {
    expect(
      buildPatientConnectUrl({
        patientId: 'pat-1',
        organizationId: 'org-9',
        therapistId: 'th-2',
      })
    ).toBe('https://fiziyo.pl/start?patient=pat-1&org=org-9&therapist=th-2');
  });

  it('omits therapist when missing', () => {
    expect(buildPatientConnectUrl({ patientId: 'pat-1', organizationId: 'org-9' })).toBe(
      'https://fiziyo.pl/start?patient=pat-1&org=org-9'
    );
  });

  it('throws when patient or org is empty', () => {
    expect(() => buildPatientConnectUrl({ patientId: '', organizationId: 'org-9' })).toThrow();
    expect(() => buildPatientConnectUrl({ patientId: 'pat-1', organizationId: '  ' })).toThrow();
  });
});

describe('tryBuildPatientConnectUrl', () => {
  it('returns null when ids are missing', () => {
    expect(tryBuildPatientConnectUrl({})).toBeNull();
    expect(tryBuildPatientConnectUrl({ patientId: 'p' })).toBeNull();
    expect(tryBuildPatientConnectUrl(null)).toBeNull();
  });
});

describe('resolvePatientJoinUrlFromInvite', () => {
  it('prefers token over fullUrl host', () => {
    expect(
      resolvePatientJoinUrlFromInvite({
        token: 'tok-1',
        fullUrl: 'https://fiziyo.app/invite?token=other',
      })
    ).toBe('https://fiziyo.pl/start?token=tok-1');
  });

  it('extracts token from backend fullUrl when token field is empty', () => {
    expect(
      resolvePatientJoinUrlFromInvite({
        fullUrl: 'https://fiziyo.pl/start?token=from-url',
      })
    ).toBe('https://fiziyo.pl/start?token=from-url');
  });

  it('returns null when neither token nor parseable URL exist', () => {
    expect(resolvePatientJoinUrlFromInvite({})).toBeNull();
    expect(resolvePatientJoinUrlFromInvite({ fullUrl: 'not-a-url' })).toBeNull();
  });
});

describe('withPatientDisplayName', () => {
  it('appends name query param', () => {
    const base = buildPatientJoinUrl('tok');
    expect(withPatientDisplayName(base, 'Anna')).toBe('https://fiziyo.pl/start?token=tok&name=Anna');
  });
});

describe('isHttpsUrl', () => {
  it('accepts https and rejects custom schemes and empty values', () => {
    expect(isHttpsUrl(PATIENT_START_URL)).toBe(true);
    expect(isHttpsUrl('fiziyo://connect?patient=1')).toBe(false);
    expect(isHttpsUrl('https://fiziyo.app/invite')).toBe(true);
    expect(isHttpsUrl(undefined)).toBe(false);
    expect(isHttpsUrl('')).toBe(false);
  });
});
