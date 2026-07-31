import { describe, expect, it } from 'vitest';
import { decodeGeneratedImage } from '../decodeGeneratedImage';

function makePngBase64(minBytes = 11_000): string {
  const pngHeader = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  ]);
  const bytes = new Uint8Array(minBytes);
  bytes.set(pngHeader, 0);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

describe('decodeGeneratedImage', () => {
  it('returns empty reason for blank base64', () => {
    const result = decodeGeneratedImage('', 'image/png', 'Plank');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('empty');
    }
  });

  it('returns invalid_base64 for malformed payload', () => {
    const result = decodeGeneratedImage('%%%not-base64%%%', 'image/png', 'Plank');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('invalid_base64');
    }
  });

  it('returns too_small when image is under minimum size', () => {
    const tiny = btoa(String.fromCharCode(0x89, 0x50, 0x4e, 0x47));
    const result = decodeGeneratedImage(tiny, 'image/png', 'Plank');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('too_small');
    }
  });

  it('returns invalid_magic when bytes are not an image', () => {
    const garbage = btoa('x'.repeat(12_000));
    const result = decodeGeneratedImage(garbage, 'image/png', 'Plank');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('invalid_magic');
    }
  });

  it('decodes a valid PNG into a File', () => {
    const result = decodeGeneratedImage(makePngBase64(), 'image/png', 'Landmine Press');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.file.type).toContain('image/');
      expect(result.file.name).toContain('ai-generated-');
      expect(result.file.name).toMatch(/\.png$/);
      expect(result.file.size).toBeGreaterThan(10_000);
    }
  });
});
