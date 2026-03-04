import { describe, expect, it } from 'vitest';
import { validateIban, validateNIP } from '../billing';
import { billingDetailsSchema } from '@/types/billing-details.types';

describe('validateNIP', () => {
  it('accepts valid NIP', () => {
    expect(validateNIP('7681958983').valid).toBe(true);
  });

  it('accepts valid NIP with dashes', () => {
    expect(validateNIP('768-195-89-83').valid).toBe(true);
  });

  it('rejects invalid checksum', () => {
    const result = validateNIP('1234567890');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Nieprawidłowa suma kontrolna NIP');
  });

  it('rejects invalid length', () => {
    expect(validateNIP('768195898').valid).toBe(false);
    expect(validateNIP('76819589830').valid).toBe(false);
  });

  it('rejects empty input', () => {
    expect(validateNIP('').valid).toBe(false);
  });
});

describe('validateIban', () => {
  it('accepts valid IBAN', () => {
    expect(validateIban('PL61109010140000071219812874').valid).toBe(true);
  });

  it('accepts valid IBAN with spaces', () => {
    expect(validateIban('PL61 1090 1014 0000 0712 1981 2874').valid).toBe(true);
  });

  it('rejects invalid checksum', () => {
    const result = validateIban('PL00109010140000071219812874');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Nieprawidłowa suma kontrolna IBAN');
  });

  it('rejects non-polish IBAN', () => {
    expect(validateIban('DE89370400440532013000').valid).toBe(false);
  });

  it('rejects too short IBAN', () => {
    expect(validateIban('PL1234').valid).toBe(false);
  });
});

describe('billingDetailsSchema', () => {
  it('accepts valid payload', () => {
    const result = billingDetailsSchema.safeParse({
      companyName: 'Fizjo Sp. z o.o.',
      nip: '7681958983',
      address: 'ul. Rehabilitacyjna 12/4',
      postalCode: '00-123',
      city: 'Warszawa',
      iban: 'PL61109010140000071219812874',
      billingEmail: 'faktury@fizjo.pl',
    });

    expect(result.success).toBe(true);
  });

  it('rejects missing required fields', () => {
    const result = billingDetailsSchema.safeParse({
      companyName: '',
      nip: '',
      address: '',
      postalCode: '',
      city: '',
      iban: '',
      billingEmail: '',
    });

    expect(result.success).toBe(false);
  });

  it('rejects invalid postal code', () => {
    const result = billingDetailsSchema.safeParse({
      companyName: 'Fizjo Sp. z o.o.',
      nip: '7681958983',
      address: 'ul. Rehabilitacyjna 12/4',
      postalCode: '00123',
      city: 'Warszawa',
      iban: 'PL61109010140000071219812874',
      billingEmail: 'faktury@fizjo.pl',
    });

    expect(result.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const result = billingDetailsSchema.safeParse({
      companyName: 'Fizjo Sp. z o.o.',
      nip: '7681958983',
      address: 'ul. Rehabilitacyjna 12/4',
      postalCode: '00-123',
      city: 'Warszawa',
      iban: 'PL61109010140000071219812874',
      billingEmail: 'faktury-at-fizjo.pl',
    });

    expect(result.success).toBe(false);
  });
});
