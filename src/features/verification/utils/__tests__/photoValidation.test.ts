import { describe, expect, it } from 'vitest';

import { MAX_PHOTO_BYTES, validatePhotoFile } from '../photoValidation';

describe('validatePhotoFile', () => {
  it('przyjmuje obraz w limicie backendu', () => {
    expect(validatePhotoFile({ name: 'a.jpg', type: 'image/jpeg', size: MAX_PHOTO_BYTES })).toBeNull();
  });

  it('odrzuca plik, którego base64 przekroczyłby limit uploadu', () => {
    expect(Math.ceil((MAX_PHOTO_BYTES + 1) / 3) * 4).toBeGreaterThan(6_666_000);
    expect(validatePhotoFile({ name: 'a.jpg', type: 'image/jpeg', size: 6 * 1024 * 1024 })).toBe(
      'Plik a.jpg przekracza limit 5 MB'
    );
  });

  it('odrzuca pliki, które nie są obrazem', () => {
    expect(validatePhotoFile({ name: 'a.pdf', type: 'application/pdf', size: 10 })).toBe('Plik a.pdf nie jest obrazem');
  });
});
