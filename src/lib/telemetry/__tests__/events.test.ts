import { describe, expect, it } from 'vitest';
import { isForbiddenPropertyKey, sanitizeProperties, redactUrl } from '../events';

describe('sanitizeProperties', () => {
  it('drops keys that could carry personal or clinical data', () => {
    const result = sanitizeProperties({
      patient_name: 'Jan Kowalski',
      email: 'jan@example.com',
      phone: '600000000',
      clinical_note: 'ból kolana',
      diagnosis: 'ACL',
      step: 'schedule',
      results_count: 0,
    });

    expect(result).toEqual({ step: 'schedule', results_count: 0 });
  });

  it('skips undefined values and truncates long strings', () => {
    const result = sanitizeProperties({ query: 'x'.repeat(500), missing: undefined });

    expect(result.query).toHaveLength(120);
    expect('missing' in result).toBe(false);
  });

  it('returns an empty object without properties', () => {
    expect(sanitizeProperties(undefined)).toEqual({});
  });

  it.each(['firstName', 'last_name', 'E-mail', 'address', 'pesel', 'token'])('treats %s as forbidden', (key) => {
    expect(isForbiddenPropertyKey(key)).toBe(true);
  });
});

describe('redactUrl', () => {
  it('removes query string and hash that can hold search phrases', () => {
    expect(redactUrl('https://portal.fiziyo.pl/patients?search=Kowalski#top')).toBe('https://portal.fiziyo.pl/patients');
    expect(redactUrl('/exercises#x')).toBe('/exercises');
  });

  it('replaces record ids so a pageview never names a patient or exercise', () => {
    expect(redactUrl('https://portal.fiziyo.pl/patients/3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90?tab=plan')).toBe(
      'https://portal.fiziyo.pl/patients/:id',
    );
    expect(redactUrl('/exercises/a1b2c3d4e5f6789012345678901234ab')).toBe('/exercises/:id');
    expect(redactUrl('/verification/organizations/65f1a2b3c4d5e6f708192a3b')).toBe('/verification/organizations/:id');
  });

  it('keeps plain routes untouched', () => {
    expect(redactUrl('/patients')).toBe('/patients');
    expect(redactUrl('https://portal.fiziyo.pl/')).toBe('https://portal.fiziyo.pl/');
  });
});
