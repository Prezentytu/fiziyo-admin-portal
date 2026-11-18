import { describe, expect, it } from 'vitest';

import { parseRegistrationError } from '../registrationErrors';

const clerk = (code: string, message = 'English text from Clerk') => ({ errors: [{ code, message }] });

describe('parseRegistrationError', () => {
  it('hasło z wycieku: polski komunikat i link do kroku hasła', () => {
    expect(
      parseRegistrationError(clerk('form_password_pwned', 'Password has been found in an online data breach.'))
    ).toEqual({ message: 'To hasło wyciekło kiedyś w internecie.', fix: { step: 2, label: 'Zmień hasło' } });
  });

  it.each(['form_password_length_too_short', 'form_password_not_strong_enough', 'form_password_validation_failed'])(
    '%s prowadzi do kroku hasła',
    (code) => {
      expect(parseRegistrationError(clerk(code)).fix).toEqual({ step: 2, label: 'Zmień hasło' });
    }
  );

  it('zajęty e-mail prowadzi do kroku e-mail', () => {
    expect(parseRegistrationError(clerk('form_identifier_exists')).fix).toEqual({
      step: 1,
      label: 'Zmień adres e-mail',
    });
  });

  it('limit prób nie zmienia kroku', () => {
    expect(parseRegistrationError(clerk('too_many_requests'))).toEqual({
      message: 'Za dużo prób. Odczekaj chwilę i spróbuj ponownie.',
    });
  });

  it('brak sieci rozpoznaje po tekście błędu', () => {
    expect(parseRegistrationError(new TypeError('Failed to fetch')).message).toMatch(/Brak połączenia/);
  });

  it('nieznany błąd nigdy nie pokazuje surowego tekstu Clerk', () => {
    const view = parseRegistrationError(clerk('some_new_code', 'Something exploded in Clerk'));
    expect(view).toEqual({ message: 'Nie udało się założyć konta. Spróbuj ponownie.' });
    expect(view.message).not.toMatch(/Clerk|exploded/);
  });
});
