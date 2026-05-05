import { describe, expect, it } from 'vitest';

import { getClerkErrorMessagePL, isClerkUnknownParamError, parseClerkError } from '../clerkErrors';

describe('parseClerkError', () => {
  it('extracts code, message and paramName from Clerk error shape', () => {
    const parsed = parseClerkError({
      errors: [
        {
          code: 'form_param_unknown',
          message: 'first_name is not a valid parameter for this request.',
          meta: { paramName: 'first_name' },
        },
      ],
    });

    expect(parsed).toEqual({
      code: 'form_param_unknown',
      message: 'first_name is not a valid parameter for this request.',
      paramName: 'first_name',
    });
  });

  it('returns empty message for unknown input', () => {
    expect(parseClerkError(null)).toEqual({ message: '' });
    expect(parseClerkError('error')).toEqual({ message: '' });
  });
});

describe('isClerkUnknownParamError', () => {
  it('matches unknown param code and concrete param name', () => {
    const error = {
      errors: [
        {
          code: 'form_param_unknown',
          meta: { paramName: 'first_name' },
        },
      ],
    };

    expect(isClerkUnknownParamError(error, 'first_name')).toBe(true);
    expect(isClerkUnknownParamError(error, 'last_name')).toBe(false);
  });
});

describe('getClerkErrorMessagePL', () => {
  it('maps known Clerk codes to polish messages', () => {
    expect(getClerkErrorMessagePL({ errors: [{ code: 'form_identifier_exists' }] }, 'fallback')).toBe(
      'Ten adres email jest już zajęty'
    );
    expect(getClerkErrorMessagePL({ errors: [{ code: 'form_code_incorrect' }] }, 'fallback')).toBe(
      'Nieprawidłowy kod weryfikacyjny'
    );
  });

  it('falls back to message heuristic and fallback text', () => {
    expect(
      getClerkErrorMessagePL({ errors: [{ message: 'Identifier is invalid for this request' }] }, 'fallback')
    ).toBe('Wprowadź prawidłowy adres email');
    expect(getClerkErrorMessagePL({ errors: [{ message: 'unmapped error' }] }, 'fallback')).toBe('fallback');
  });
});
