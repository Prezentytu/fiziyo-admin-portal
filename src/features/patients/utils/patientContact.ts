export type PatientContactType = 'email' | 'phone' | 'unknown';

export const AUTO_ADVANCE_CONTACT_MS = 300;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function detectContactType(value: string): PatientContactType {
  if (value.includes('@')) return 'email';
  const digitsOnly = value.replace(/[\s+\-()]/g, '');
  if (/^\d+$/.test(digitsOnly) && digitsOnly.length >= 7) return 'phone';
  return 'unknown';
}

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email);
}

export function isValidPhone(phone: string): boolean {
  const cleanPhone = phone.replace(/[\s+\-()]/g, '');
  return cleanPhone.length === 9 && /^\d+$/.test(cleanPhone);
}

export function getCleanPhone(phone: string): string {
  return phone.replace(/[\s+\-()]/g, '');
}

export function isCompletePatientContact(value: string): boolean {
  const trimmed = value.trim();
  const type = detectContactType(trimmed);
  if (type === 'email') return isValidEmail(trimmed);
  if (type === 'phone') return isValidPhone(trimmed);
  return false;
}

export function shouldAutoAdvanceContact(value: string, alreadySubmitted: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed === alreadySubmitted.trim()) return false;
  return isCompletePatientContact(trimmed);
}
