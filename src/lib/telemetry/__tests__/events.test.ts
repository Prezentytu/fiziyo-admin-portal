import { describe, expect, it } from 'vitest';
import { isForbiddenPropertyKey, sanitizeProperties, stripUrlQuery } from '../events';

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

describe('stripUrlQuery', () => {
  it('removes query string and hash that can hold search phrases', () => {
    expect(stripUrlQuery('https://portal.fiziyo.pl/patients?search=Kowalski#top')).toBe('https://portal.fiziyo.pl/patients');
    expect(stripUrlQuery('/exercises#x')).toBe('/exercises');
  });

  it('keeps a URL without query untouched', () => {
    expect(stripUrlQuery('/patients/123')).toBe('/patients/123');
  });
});
