import { describe, expect, it } from 'vitest';

import { bundleHasCopyableMedia, describeMediaNotice } from './catalogBundleMediaNotice';

const withMedia = JSON.stringify({ exercises: [{ id: 'a', media: [{ url: 'https://dev.example.test/a.jpg' }] }] });
const withLegacy = JSON.stringify({ exercises: [{ id: 'a', legacyMedia: { videoUrl: 'https://v.example.test/1' } }] });
const youtube = JSON.stringify({ exercises: [{ id: 'a', media: [{ url: 'https://www.youtube.com/watch?v=abcdefghijk' }] }] });
const youtu = JSON.stringify({ exercises: [{ id: 'a', legacyMedia: { videoUrl: 'https://youtu.be/abcdefghijk' } }] });
const vimeo = JSON.stringify({ exercises: [{ id: 'a', media: [{ url: 'https://player.vimeo.com/video/123' }] }] });
const mixed = JSON.stringify({
  exercises: [{ id: 'a', media: [{ url: 'https://vimeo.com/1' }, { url: 'https://dev.example.test/a.jpg' }] }],
});
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

describe('bundleHasCopyableMedia', () => {
  it('widzi media[].url i legacyMedia spoza hostów osadzanych filmów', () => {
    expect(bundleHasCopyableMedia(withMedia)).toBe(true);
    expect(bundleHasCopyableMedia(withLegacy)).toBe(true);
    expect(bundleHasCopyableMedia(mixed)).toBe(true);
  });
  it('YouTube i Vimeo backend zostawia bez zmian: to nie media do skopiowania', () => {
    for (const bundle of [youtube, youtu, vimeo]) expect(bundleHasCopyableMedia(bundle)).toBe(false);
  });
  it('puste pola, brak ćwiczeń i nieczytelny plik to brak mediów', () => {
    expect(bundleHasCopyableMedia(noMedia)).toBe(false);
    expect(bundleHasCopyableMedia('{"tags":[]}')).toBe(false);
    expect(bundleHasCopyableMedia('nie json')).toBe(false);
  });
});

describe('describeMediaNotice', () => {
  it('REPLACE z mediami do skopiowania i pustym raportem: komunikat mówi, co zostało i co zrobić', () => {
    const message = describeMediaNotice(withMedia, { success: true, mediaCopy: emptyReport });
    expect(message).toContain('mediów nie skopiowano');
    expect(message).toContain('pod adresami z paczki');
    expect(message).toContain('zespół FiziYo');
    expect(message).not.toContain('REPLACE');
  });

  it('API bez raportu (przed #432) z mediami do skopiowania: ten sam komunikat', () => {
    expect(describeMediaNotice(withLegacy, { success: true })).toContain('mediów nie skopiowano');
  });

  it('paczka tylko z YouTube albo Vimeo: bez ostrzeżenia', () => {
    for (const bundle of [youtube, youtu, vimeo]) {
      expect(describeMediaNotice(bundle, { success: true, mediaCopy: emptyReport })).toBeNull();
    }
  });

  it('raport z pozycjami pokazuje karta, komunikat nie dubluje', () => {
    const report = { ...emptyReport, copied: 1, items: [{ sourceUrl: 'u', targetUrl: 't', outcome: 'COPIED', reason: null }] };
    expect(describeMediaNotice(withMedia, { success: true, mediaCopy: report })).toBeNull();
  });

  it('paczka bez mediów: bez komunikatu', () => {
    expect(describeMediaNotice(noMedia, { success: true, mediaCopy: emptyReport })).toBeNull();
  });

  it('success: false: nic (karta pokaże errors[0])', () => {
    expect(describeMediaNotice(withMedia, { success: false })).toBeNull();
  });
});
