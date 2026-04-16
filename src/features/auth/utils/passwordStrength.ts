export interface PasswordCriteria {
  minLength: boolean;
  hasNumber: boolean;
  hasUppercase: boolean;
  hasSpecial: boolean;
}

export type PasswordStrengthScore = 0 | 1 | 2 | 3 | 4;

export interface PasswordStrength {
  score: PasswordStrengthScore;
  criteria: PasswordCriteria;
}

export const PASSWORD_STRENGTH_LABELS: Record<PasswordStrengthScore, string> = {
  0: 'Bardzo słabe',
  1: 'Słabe',
  2: 'Średnie',
  3: 'Dobre',
  4: 'Silne',
};

const SPECIAL_CHAR_REGEX = /[^A-Za-z0-9]/;
const UPPERCASE_REGEX = /[A-Z]/;
const NUMBER_REGEX = /\d/;

const PASSWORD_MIN_LENGTH = 8;

export function calculatePasswordStrength(password: string): PasswordStrength {
  const criteria: PasswordCriteria = {
    minLength: password.length >= PASSWORD_MIN_LENGTH,
    hasNumber: NUMBER_REGEX.test(password),
    hasUppercase: UPPERCASE_REGEX.test(password),
    hasSpecial: SPECIAL_CHAR_REGEX.test(password),
  };

  if (password.length === 0) {
    return { score: 0, criteria };
  }

  const metCount = Object.values(criteria).filter(Boolean).length;
  const score = Math.min(metCount, 4) as PasswordStrengthScore;

  return { score, criteria };
}

export function maskEmail(email: string): string {
  const trimmed = email.trim();
  const atIndex = trimmed.lastIndexOf('@');
  if (atIndex <= 0) return trimmed;

  const local = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex);

  if (local.length <= 2) {
    return `${local.charAt(0)}•••${domain}`;
  }

  if (local.length <= 5) {
    return `${local.charAt(0)}•••${local.at(-1) ?? ''}${domain}`;
  }

  const first = local.charAt(0);
  const lastFour = local.slice(-4);
  return `${first}•••••${lastFour}${domain}`;
}
