import { CombinedGraphQLErrors } from '@apollo/client/errors';

import type { ReferralRequest, ReferralView } from '@/graphql/types';

/** Polecenia fizjo (SPEC-054 w fizjo-app): link polecający, prośba po e-mailu i decyzja poleconego. */
export const REFERRALS_TAB = 'referrals';
export const REFERRALS_FEATURE_FLAG = 'referrals';
export const REFERRALS_SETTINGS_HREF = `/settings?tab=${REFERRALS_TAB}`;

/** Kod przeżywa krok z kodem e-mail i powrót z logowania przez dostawcę (SPEC-054, ścieżka A). */
export const REFERRAL_CODE_STORAGE_KEY = 'fiziyo.referralCode';
/** Prośby, których baner już się pokazał; baner jest jednorazowy dla danej prośby. */
export const REFERRAL_BANNER_SEEN_KEY = 'fiziyo.referralBannerSeen';

const CODE_PATTERN = /^[A-Z0-9-]{3,16}$/;

/** Kod z `?ref=` w zapisie kanonicznym (jak `ReferralService.NormalizeCode`) albo null, gdy nie wygląda na kod. */
export function normalizeReferralCode(raw: string | null | undefined): string | null {
  const code = raw?.trim().toUpperCase().replace(/\s+/g, '') ?? '';
  return CODE_PATTERN.test(code) ? code : null;
}

type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem'>;

function sessionStore(): KeyValueStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * Zapamiętuje kod z adresu rejestracji i zwraca kod, który trafi do `unsafeMetadata`. Nowy `?ref=` wygrywa
 * z zapisanym; bez parametru zostaje kod zapamiętany wcześniej w tej karcie.
 */
export function rememberReferralCode(
  refParam: string | null | undefined,
  storage: KeyValueStorage | null = sessionStore()
): string | null {
  const fromUrl = normalizeReferralCode(refParam);
  try {
    if (fromUrl) {
      storage?.setItem(REFERRAL_CODE_STORAGE_KEY, fromUrl);
      return fromUrl;
    }
    return normalizeReferralCode(storage?.getItem(REFERRAL_CODE_STORAGE_KEY));
  } catch {
    return fromUrl;
  }
}

/** Pole `unsafeMetadata` z kodem, puste bez kodu (backend pomija brak kodu po cichu). */
export function referralMetadata(code: string | null): { referralCode?: string } {
  return code ? { referralCode: code } : {};
}

/** Link do rejestracji z kodem; `origin` to adres portalu, z którego fizjo kopiuje link. */
export function buildReferralLink(origin: string, code: string): string {
  return `${origin.replace(/\/+$/, '')}/register?ref=${encodeURIComponent(code)}`;
}

export type ReferralStatusTone = 'success' | 'info' | 'warning' | 'secondary' | 'destructive';

export interface ReferralStatusPresentation {
  label: string;
  tone: ReferralStatusTone;
}

/** Status z listy „Twoje polecenia”. „Aktywne” to potwierdzone z pacjentem z planem (R-6), liczone przez backend. */
export function referralStatusPresentation(
  referral: Pick<ReferralView, 'status' | 'isActive'>
): ReferralStatusPresentation {
  switch (referral.status) {
    case 'CONFIRMED':
      return referral.isActive ? { label: 'Aktywne', tone: 'success' } : { label: 'Potwierdzone', tone: 'info' };
    case 'PENDING':
      return { label: 'Czeka na potwierdzenie', tone: 'warning' };
    case 'DECLINED':
      return { label: 'Odrzucone', tone: 'secondary' };
    case 'EXPIRED':
      return { label: 'Wygasło', tone: 'secondary' };
    case 'REVOKED':
      return { label: 'Cofnięte', tone: 'destructive' };
    default:
      return { label: 'Nieznany status', tone: 'secondary' };
  }
}

export function referralSourceLabel(source: string): string {
  return source === 'EMAIL' ? 'E-mail' : 'Link';
}

/** Kto na liście: nazwa dopiero po potwierdzeniu, wcześniej wyłącznie e-mail wpisany przez polecającego. */
export function referralPersonLabel(referral: Pick<ReferralView, 'referredName' | 'referredEmail'>): string {
  return referral.referredName?.trim() || referral.referredEmail?.trim() || 'Nowe konto z Twojego linku';
}

export function formatReferralDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Walidacja przed wysłaniem prośby; komunikat stoi przy polu. Własny adres sprawdza też backend. */
export function validateReferralEmail(email: string, ownEmail?: string | null): string | null {
  const value = email.trim().toLowerCase();
  if (!value) return 'Wpisz adres e-mail osoby, którą polecasz.';
  if (!EMAIL_PATTERN.test(value)) return 'Wpisz poprawny adres e-mail.';
  if (ownEmail && value === ownEmail.trim().toLowerCase()) return 'To Twój własny adres.';
  return null;
}

/**
 * Komunikat z backendu (`ReferralException`, prosty polski) albo ogólny. Kody spoza listy i błędy sieci
 * nie pokazują surowego tekstu.
 */
const KNOWN_CODES: Record<string, string> = {
  INVALID_EMAIL: 'Wpisz poprawny adres e-mail.',
  SELF_REFERRAL: 'To Twój własny adres.',
  DAILY_LIMIT: 'Na dziś to już wszystkie prośby. Spróbuj jutro.',
  ALREADY_REFERRED: 'Masz już osobę polecającą.',
  NOT_FOUND: 'Ta prośba nie czeka już na decyzję.',
  EXPIRED: 'Ta prośba wygasła.',
  NOT_THERAPIST: 'Polecenia są dostępne dla kont fizjoterapeutów.',
};

export function referralErrorCode(error: unknown): string | null {
  if (!CombinedGraphQLErrors.is(error)) return null;
  const code = error.errors.map((item) => item.extensions?.code).find((value) => typeof value === 'string');
  return typeof code === 'string' ? code : null;
}

export function referralErrorMessage(error: unknown, fallback = 'Nie udało się. Spróbuj ponownie za chwilę.'): string {
  const code = referralErrorCode(error);
  return (code && KNOWN_CODES[code]) || fallback;
}

/** Komunikat po wysłaniu prośby: zawsze ten sam, żeby formularz nie zdradzał, czy adres ma konto. */
export const REFERRAL_REQUEST_SENT = 'Wysłaliśmy prośbę. Polecenie zaliczymy, gdy ta osoba potwierdzi.';

function readSeen(storage: KeyValueStorage | null): string[] {
  try {
    const parsed: unknown = JSON.parse(storage?.getItem(REFERRAL_BANNER_SEEN_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function localStore(): KeyValueStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** Najstarsza prośba, dla której baner jeszcze się nie pokazał; null, gdy nie ma czego pokazać. */
export function referralRequestForBanner(
  requests: readonly ReferralRequest[] | null | undefined,
  context: { pathname: string; settingsTab: string | null },
  storage: KeyValueStorage | null = localStore()
): ReferralRequest | null {
  if (!requests?.length) return null;
  if (context.pathname === '/settings' && context.settingsTab === REFERRALS_TAB) return null;
  const seen = new Set(readSeen(storage));
  return [...requests].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).find((r) => !seen.has(r.id)) ?? null;
}

export function markReferralBannerSeen(requestId: string, storage: KeyValueStorage | null = localStore()): void {
  try {
    const seen = readSeen(storage);
    if (!seen.includes(requestId)) {
      storage?.setItem(REFERRAL_BANNER_SEEN_KEY, JSON.stringify([...seen, requestId].slice(-50)));
    }
  } catch {
    // Brak pamięci przeglądarki: baner pokaże się przy następnym wejściu, decyzja i tak czeka w zakładce.
  }
}
