export interface ValidationResult {
  valid: boolean;
  error?: string;
}

const NIP_WEIGHTS = [6, 5, 7, 2, 3, 4, 5, 6, 7] as const;

function normalizeNip(rawNip: string): string {
  return rawNip.replaceAll(/[\s-]/g, '');
}

function normalizeIban(rawIban: string): string {
  return rawIban.replaceAll(/\s/g, '').toUpperCase();
}

function calculateMod97(numericValue: string): number {
  let remainder = 0;

  for (const digit of numericValue) {
    remainder = Number(`${remainder}${digit}`) % 97;
  }

  return remainder;
}

export function validateNIP(rawNip: string): ValidationResult {
  const normalizedNip = normalizeNip(rawNip);

  if (!/^\d{10}$/.test(normalizedNip)) {
    return {
      valid: false,
      error: 'NIP musi mieć dokładnie 10 cyfr',
    };
  }

  const checksumSum = NIP_WEIGHTS.reduce((accumulator, weight, index) => {
    const digit = Number.parseInt(normalizedNip[index], 10);
    return accumulator + digit * weight;
  }, 0);

  const controlDigit = Number.parseInt(normalizedNip[9], 10);

  if (checksumSum % 11 !== controlDigit) {
    return {
      valid: false,
      error: 'Nieprawidłowa suma kontrolna NIP',
    };
  }

  return { valid: true };
}

export function validateIban(rawIban: string): ValidationResult {
  const normalizedIban = normalizeIban(rawIban);

  if (!/^PL\d{26}$/.test(normalizedIban)) {
    return {
      valid: false,
      error: 'IBAN musi mieć format PL + 26 cyfr',
    };
  }

  const rearrangedIban = normalizedIban.slice(4) + normalizedIban.slice(0, 4);
  const numericIban = rearrangedIban.replaceAll(/[A-Z]/g, (letter) => String((letter.codePointAt(0) ?? 0) - 55));

  if (calculateMod97(numericIban) !== 1) {
    return {
      valid: false,
      error: 'Nieprawidłowa suma kontrolna IBAN',
    };
  }

  return { valid: true };
}
