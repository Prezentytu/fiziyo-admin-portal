import { describe, expect, it } from 'vitest';
import {
  isForbiddenPropertyKey,
  redactUrl,
  redactUrlsDeep,
  sanitizeExceptionProperties,
  sanitizeProperties,
} from '../events';

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
    expect(redactUrl('https://portal.fiziyo.pl/patients?search=Kowalski#top')).toBe(
      'https://portal.fiziyo.pl/patients'
    );
    expect(redactUrl('/exercises#x')).toBe('/exercises');
  });

  it('replaces record ids so a pageview never names a patient or exercise', () => {
    expect(redactUrl('https://portal.fiziyo.pl/patients/3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90?tab=plan')).toBe(
      'https://portal.fiziyo.pl/patients/:id'
    );
    expect(redactUrl('/exercises/a1b2c3d4e5f6789012345678901234ab')).toBe('/exercises/:id');
    expect(redactUrl('/verification/organizations/65f1a2b3c4d5e6f708192a3b')).toBe('/verification/organizations/:id');
  });

  it('keeps plain routes untouched', () => {
    expect(redactUrl('/patients')).toBe('/patients');
    expect(redactUrl('https://portal.fiziyo.pl/')).toBe('https://portal.fiziyo.pl/');
  });
});

describe('redactUrlsDeep', () => {
  it('redacts addresses the SDK copies into session, person and heatmap fields', () => {
    const patientUrl = 'https://portal.fiziyo.pl/patients/3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90?tab=plan';

    const result = redactUrlsDeep({
      $session_entry_url: patientUrl,
      $session_entry_pathname: '/exercises',
      $set_once: { $initial_current_url: 'https://portal.fiziyo.pl/exercises?q=lopatka' },
      $heatmap_data: { [patientUrl]: [{ x: 1, y: 2 }] },
      $exception_list: [{ value: 'Failed at /patients/65f1a2b3c4d5e6f708192a3b' }],
      results_count: 3,
    });

    expect(result).toEqual({
      $session_entry_url: 'https://portal.fiziyo.pl/patients/:id',
      $session_entry_pathname: '/exercises',
      $set_once: { $initial_current_url: 'https://portal.fiziyo.pl/exercises' },
      $heatmap_data: { 'https://portal.fiziyo.pl/patients/:id': [{ x: 1, y: 2 }] },
      $exception_list: [{ value: 'Failed at /patients/:id' }],
      results_count: 3,
    });
  });
});

describe('sanitizeExceptionProperties', () => {
  it('cuts e-mails and digit runs out of exception messages and drops steps', () => {
    const result = sanitizeExceptionProperties({
      $exception_steps: [{ message: 'opened jan@example.com' }],
      $exception_list: [
        { type: 'TypeError', value: 'Failed for jan@example.com phone 600 123 456', stacktrace: { frames: [] } },
        { type: 'TypeError' },
      ],
      $current_url: 'https://portal.fiziyo.pl/patients',
    });

    expect(result).toEqual({
      $exception_list: [
        { type: 'TypeError', value: 'Failed for [email] phone [num]', stacktrace: { frames: [] } },
        { type: 'TypeError' },
      ],
      $current_url: 'https://portal.fiziyo.pl/patients',
    });
  });

  it('caps the message length', () => {
    const result = sanitizeExceptionProperties({ $exception_list: [{ type: 'TypeError', value: 'x'.repeat(500) }] });

    expect((result.$exception_list as { value: string }[])[0].value).toHaveLength(300);
  });

  it('keeps messages only for engine error types; app errors and SyntaxError are withheld', () => {
    const result = sanitizeExceptionProperties({
      $exception_list: [
        { type: 'TypeError', value: "Cannot read properties of undefined (reading 'name')" },
        { type: 'Error', value: 'Pacjent Jan Kowalski nie istnieje' },
        { type: 'ApolloError', value: 'Brak dostępu do organizacji Kowalski' },
        { type: 'SyntaxError', value: 'Unexpected token < in JSON at position 0: "<p>Jan</p>"' },
        { value: 'bez typu' },
      ],
    });

    expect((result.$exception_list as { value: string }[]).map((item) => item.value)).toEqual([
      "Cannot read properties of undefined (reading 'name')",
      'message withheld',
      'message withheld',
      'message withheld',
      'message withheld',
    ]);
  });
});
