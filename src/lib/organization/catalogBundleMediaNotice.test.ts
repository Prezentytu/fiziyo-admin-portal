import { describe, expect, it } from 'vitest';

import { bundleHasMedia, describeMediaNotice } from './catalogBundleMediaNotice';

const withMedia = JSON.stringify({ exercises: [{ id: 'a', media: [{ url: 'https://dev.example.test/a.jpg' }] }] });
const withLegacy = JSON.stringify({ exercises: [{ id: 'a', legacyMedia: { videoUrl: 'https://v.example.test/1' } }] });
const noMedia = JSON.stringify({ exercises: [{ id: 'a', media: [], legacyMedia: { videoUrl: null, images: [] } }] });

// Odpowiedź backendu #432 dla importu w trybie REPLACE: raport bez pozycji.
const emptyReport = {
  copied: 0,
  alreadyPresent: 0,
  planned: 0,
  kept: 0,
  failed: 0,
  deferred: 0,
  notCopied: 0,
  items: [],
};

describe('bundleHasMedia', () => {
  it('widzi media[].url i legacyMedia', () => {
    expect(bundleHasMedia(withMedia)).toBe(true);
    expect(bundleHasMedia(withLegacy)).toBe(true);
  });
  it('puste pola, brak ćwiczeń i nieczytelny plik to brak mediów', () => {
    expect(bundleHasMedia(noMedia)).toBe(false);
    expect(bundleHasMedia('{"tags":[]}')).toBe(false);
    expect(bundleHasMedia('nie json')).toBe(false);
  });
});

describe('describeMediaNotice', () => {
  it('REPLACE z mediami w paczce i pustym raportem: jasny komunikat, że mediów nie skopiowano', () => {
    const notice = describeMediaNotice(withMedia, { success: true, mode: 'REPLACE', mediaCopy: emptyReport });
    expect(notice?.kind).toBe('not-copied');
    expect(notice?.message).toContain('mediów nie skopiowano');
    expect(notice?.message).toContain('REPLACE');
  });

  it('API bez raportu (przed #432) z mediami w paczce: ten sam komunikat', () => {
    expect(describeMediaNotice(withLegacy, { success: true })?.kind).toBe('not-copied');
  });

  it('raport z pozycjami pokazuje karta, komunikat nie dubluje', () => {
    const report = { ...emptyReport, copied: 1, items: [{ sourceUrl: 'u', targetUrl: 't', outcome: 'COPIED', reason: null }] };
    expect(describeMediaNotice(withMedia, { success: true, mediaCopy: report })).toBeNull();
  });

  it('paczka bez mediów: bez komunikatu', () => {
    expect(describeMediaNotice(noMedia, { success: true, mediaCopy: emptyReport })).toBeNull();
  });

  it('success: false z kodami MEDIA_*: komunikat dla użytkownika z powodem', () => {
    const notice = describeMediaNotice(withMedia, {
      success: false,
      items: [
        { id: 'a', name: 'Przysiad', reasonCode: 'MEDIA_DEFERRED', reason: 'x' },
        { id: 'b', name: 'Mostek', reasonCode: 'MEDIA_COPY_FAILED', reason: 'y' },
        { id: 'c', name: 'Skłon', reasonCode: 'OTHER', reason: 'z' },
      ],
    });
    expect(notice?.kind).toBe('rejected');
    expect(notice?.message).toContain('Przysiad: kopia mediów nie zmieściła się');
    expect(notice?.message).toContain('Mostek: nie udało się skopiować');
    expect(notice?.message).not.toContain('Skłon');
  });

  it('success: false bez kodów MEDIA_*: nic (karta pokaże errors[0])', () => {
    expect(describeMediaNotice(withMedia, { success: false, items: [] })).toBeNull();
  });
});
