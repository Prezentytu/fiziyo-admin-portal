import { describe, expect, it } from 'vitest';

import {
  DOCUMENT_ACCEPT,
  getPastedScreenshot,
  isSupportedDocument,
  unsupportedFormatMessage,
} from '../documentFormats';

const file = (name: string, type = '') => ({ name, type });

function clipboard(text: string, files: File[]) {
  return {
    getData: (format: string) => (format === 'text/plain' ? text : ''),
    items: files.map((f) => ({ kind: 'file', type: f.type, getAsFile: () => f })),
  };
}

describe('isSupportedDocument', () => {
  it.each([
    ['zalecenia.pdf', ''],
    ['plan.XLSX', ''],
    ['notatka.md', 'text/markdown'],
    ['zdjecie.JPG', ''],
    ['zrzut.jpeg', 'image/jpeg'],
    ['zrzut.png', 'image/png'],
    ['zrzut.webp', ''],
    ['image', 'image/png'],
  ])('reads %s (%s)', (name, type) => {
    expect(isSupportedDocument(file(name, type))).toBe(true);
  });

  it.each([
    ['IMG_0001.HEIC', ''],
    ['zdjecie', 'image/heic'],
    ['zdjecie.heif', 'image/heif'],
    ['animacja.gif', 'image/gif'],
    ['umowa.docx', ''],
    ['bez-rozszerzenia', ''],
  ])('rejects %s (%s)', (name, type) => {
    expect(isSupportedDocument(file(name, type))).toBe(false);
  });
});

describe('unsupportedFormatMessage', () => {
  it('is null for a supported file', () => {
    expect(unsupportedFormatMessage(file('zrzut.png', 'image/png'))).toBeNull();
  });

  it('tells how to get out of HEIC instead of the generic list', () => {
    expect(unsupportedFormatMessage(file('IMG_0001.heic', 'image/heic'))).toMatch(/HEIC.*JPG/);
  });

  it('lists images among the formats', () => {
    expect(unsupportedFormatMessage(file('umowa.docx'))).toMatch(/JPG, PNG, WEBP/);
  });
});

describe('DOCUMENT_ACCEPT', () => {
  it('lets the file picker offer documents and images', () => {
    const accepted = DOCUMENT_ACCEPT.split(',');
    expect(accepted).toEqual(expect.arrayContaining(['.pdf', '.csv', '.jpg', '.png', '.webp', 'image/png']));
    expect(accepted).not.toContain('.heic');
  });
});

describe('getPastedScreenshot', () => {
  const screenshot = new File(['png'], 'image.png', { type: 'image/png' });

  it('returns the screenshot under a readable name with the same bytes type', () => {
    const pasted = getPastedScreenshot(clipboard('', [screenshot]));

    expect(pasted?.name).toBe('Zrzut ekranu.png');
    expect(pasted?.type).toBe('image/png');
    expect(pasted?.size).toBe(screenshot.size);
  });

  it('leaves a text paste alone even when the clipboard also holds a picture of it (Word, Excel)', () => {
    expect(getPastedScreenshot(clipboard('mostki 3x10', [screenshot]))).toBeNull();
  });

  it('is null for a plain text paste', () => {
    expect(getPastedScreenshot(clipboard('mostki 3x10', []))).toBeNull();
  });

  it('finds a screenshot the browser put only in items, with an empty files list', () => {
    const itemsOnly = { ...clipboard('', [screenshot]), files: [] };

    expect(getPastedScreenshot(itemsOnly)?.name).toBe('Zrzut ekranu.png');
  });

  it('ignores non-image files in the clipboard', () => {
    const pdf = new File(['%PDF'], 'zalecenia.pdf', { type: 'application/pdf' });
    expect(getPastedScreenshot(clipboard('', [pdf]))).toBeNull();
  });
});
