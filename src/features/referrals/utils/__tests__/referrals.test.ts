import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { describe, expect, it } from 'vitest';

import {
  buildReferralLink,
  markReferralBannerSeen,
  normalizeReferralCode,
  REFERRAL_BANNER_SEEN_KEY,
  REFERRAL_CODE_STORAGE_KEY,
  referralErrorMessage,
  referralMetadata,
  referralPersonLabel,
  referralRequestForBanner,
  referralStatusPresentation,
  rememberReferralCode,
  validateReferralEmail,
} from '../referrals';

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
    values,
  };
}

const request = (id: string, createdAt: string) => ({
  id,
  referrerName: 'Anna Kowalska',
  referrerOrganizationName: 'Gabinet Ruch',
  createdAt,
});

describe('normalizeReferralCode', () => {
  it('zapisuje kod wielkimi literami bez spacji', () => {
    expect(normalizeReferralCode(' przem-7k3d ')).toBe('PRZEM-7K3D');
  });

  it('odrzuca pusty, za długi i ze znakami spoza kodu', () => {
    expect(normalizeReferralCode('')).toBeNull();
    expect(normalizeReferralCode(null)).toBeNull();
    expect(normalizeReferralCode('A'.repeat(17))).toBeNull();
    expect(normalizeReferralCode('<script>')).toBeNull();
  });
});

describe('rememberReferralCode', () => {
  it('kod z ?ref= trafia do sessionStorage i do metadanych', () => {
    const storage = memoryStorage();
    const code = rememberReferralCode('przem-7k3d', storage);
    expect(code).toBe('PRZEM-7K3D');
    expect(storage.values.get(REFERRAL_CODE_STORAGE_KEY)).toBe('PRZEM-7K3D');
    expect(referralMetadata(code)).toEqual({ referralCode: 'PRZEM-7K3D' });
  });

  it('bez ?ref= (np. po kroku z kodem e-mail) wraca zapamiętany kod', () => {
    const storage = memoryStorage({ [REFERRAL_CODE_STORAGE_KEY]: 'PRZEM-7K3D' });
    expect(rememberReferralCode(null, storage)).toBe('PRZEM-7K3D');
  });

  it('nowy ?ref= wygrywa z zapamiętanym', () => {
    const storage = memoryStorage({ [REFERRAL_CODE_STORAGE_KEY]: 'STARY-1234' });
    expect(rememberReferralCode('NOWY-5678', storage)).toBe('NOWY-5678');
  });

  it('bez kodu metadane zostają bez pola referralCode', () => {
    expect(rememberReferralCode(null, memoryStorage())).toBeNull();
    expect(referralMetadata(null)).toEqual({});
  });

  it('niedostępna pamięć przeglądarki nie blokuje rejestracji', () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(rememberReferralCode('KOD-1234', broken)).toBe('KOD-1234');
    expect(rememberReferralCode(null, broken)).toBeNull();
  });
});

describe('buildReferralLink', () => {
  it('składa link rejestracji z kodem', () => {
    expect(buildReferralLink('https://devportal.fiziyo.pl/', 'PRZEM-7K3D')).toBe(
      'https://devportal.fiziyo.pl/register?ref=PRZEM-7K3D'
    );
  });
});

describe('referralStatusPresentation', () => {
  it('potwierdzone z pacjentem z planem to Aktywne, bez niego Potwierdzone', () => {
    expect(referralStatusPresentation({ status: 'CONFIRMED', isActive: true }).label).toBe('Aktywne');
    expect(referralStatusPresentation({ status: 'CONFIRMED', isActive: false }).label).toBe('Potwierdzone');
  });

  it('pozostałe statusy ze specu', () => {
    expect(referralStatusPresentation({ status: 'PENDING', isActive: false }).label).toBe('Czeka na potwierdzenie');
    expect(referralStatusPresentation({ status: 'DECLINED', isActive: false }).label).toBe('Odrzucone');
    expect(referralStatusPresentation({ status: 'EXPIRED', isActive: false }).label).toBe('Wygasło');
  });

  it('nieznany status z nowszego backendu nie wywraca listy', () => {
    expect(referralStatusPresentation({ status: 'SOMETHING_NEW', isActive: false }).tone).toBe('secondary');
  });
});

describe('referralPersonLabel', () => {
  it('przed potwierdzeniem pokazuje tylko wpisany e-mail', () => {
    expect(referralPersonLabel({ referredName: null, referredEmail: 'anna@gabinet.pl' })).toBe('anna@gabinet.pl');
  });

  it('po potwierdzeniu nazwę, a link bez danych opisuje ogólnie', () => {
    expect(referralPersonLabel({ referredName: 'Anna Nowak', referredEmail: null })).toBe('Anna Nowak');
    expect(referralPersonLabel({ referredName: null, referredEmail: null })).toBe('Nowe konto z Twojego linku');
  });
});

describe('validateReferralEmail', () => {
  it('pusty i niepoprawny adres', () => {
    expect(validateReferralEmail('  ')).toBe('Wpisz adres e-mail osoby, którą polecasz.');
    expect(validateReferralEmail('anna@')).toBe('Wpisz poprawny adres e-mail.');
  });

  it('własny adres bez względu na wielkość liter', () => {
    expect(validateReferralEmail('Ja@Gabinet.pl ', 'ja@gabinet.pl')).toBe('To Twój własny adres.');
  });

  it('poprawny cudzy adres przechodzi', () => {
    expect(validateReferralEmail('anna@gabinet.pl', 'ja@gabinet.pl')).toBeNull();
  });
});

describe('referralErrorMessage', () => {
  const graphQLError = (code: string) =>
    new CombinedGraphQLErrors({ errors: [{ message: 'raw backend text', extensions: { code } }] });

  it('znany kod backendu daje prosty polski komunikat', () => {
    expect(referralErrorMessage(graphQLError('DAILY_LIMIT'))).toBe('Na dziś to już wszystkie prośby. Spróbuj jutro.');
    expect(referralErrorMessage(graphQLError('ALREADY_REFERRED'))).toBe('Masz już osobę polecającą.');
  });

  it('nieznany kod i błąd sieci nie pokazują surowego tekstu', () => {
    expect(referralErrorMessage(graphQLError('BOOM'))).toBe('Nie udało się. Spróbuj ponownie za chwilę.');
    expect(referralErrorMessage(new Error('Failed to fetch'))).toBe('Nie udało się. Spróbuj ponownie za chwilę.');
  });
});

describe('referralRequestForBanner', () => {
  const context = { pathname: '/', settingsTab: null };

  it('pokazuje najstarszą prośbę, której baner jeszcze nie widział', () => {
    const storage = memoryStorage();
    const requests = [request('b', '2026-11-19T10:00:00Z'), request('a', '2026-11-18T10:00:00Z')];
    expect(referralRequestForBanner(requests, context, storage)?.id).toBe('a');
  });

  it('baner jest jednorazowy: po oznaczeniu przechodzi do następnej, potem znika', () => {
    const storage = memoryStorage();
    const requests = [request('a', '2026-11-18T10:00:00Z'), request('b', '2026-11-19T10:00:00Z')];
    markReferralBannerSeen('a', storage);
    expect(referralRequestForBanner(requests, context, storage)?.id).toBe('b');
    markReferralBannerSeen('b', storage);
    expect(referralRequestForBanner(requests, context, storage)).toBeNull();
    expect(JSON.parse(storage.values.get(REFERRAL_BANNER_SEEN_KEY) ?? '[]')).toEqual(['a', 'b']);
  });

  it('nie nad samą zakładką Polecenia i nie bez próśb', () => {
    const requests = [request('a', '2026-11-18T10:00:00Z')];
    expect(
      referralRequestForBanner(requests, { pathname: '/settings', settingsTab: 'referrals' }, memoryStorage())
    ).toBeNull();
    expect(referralRequestForBanner([], context, memoryStorage())).toBeNull();
    expect(referralRequestForBanner(undefined, context, memoryStorage())).toBeNull();
  });

  it('uszkodzony zapis w pamięci nie blokuje banera', () => {
    const storage = memoryStorage({ [REFERRAL_BANNER_SEEN_KEY]: '{oops' });
    expect(referralRequestForBanner([request('a', '2026-11-18T10:00:00Z')], context, storage)?.id).toBe('a');
  });
});
