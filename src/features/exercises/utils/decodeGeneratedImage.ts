/**
 * Converts a base64 image payload from AI generate-image into a File.
 * Rejects empty / invalid payloads before they reach upload.
 */

const MIN_IMAGE_BYTES = 10_240;

export type DecodeGeneratedImageResult =
  | { ok: true; file: File }
  | { ok: false; reason: 'empty' | 'invalid_base64' | 'too_small' | 'invalid_magic' };

function detectExtensionAndMime(bytes: Uint8Array): { extension: string; mime: string } | null {
  if (bytes.length >= 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return { extension: 'png', mime: 'image/png' };
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { extension: 'jpg', mime: 'image/jpeg' };
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { extension: 'webp', mime: 'image/webp' };
  }
  return null;
}

export function decodeGeneratedImage(
  imageBase64: string,
  contentType: string,
  exerciseName: string
): DecodeGeneratedImageResult {
  if (!imageBase64.trim()) {
    return { ok: false, reason: 'empty' };
  }

  let byteArray: Uint8Array;
  try {
    const byteCharacters = atob(imageBase64);
    byteArray = new Uint8Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteArray[i] = byteCharacters.charCodeAt(i);
    }
  } catch {
    return { ok: false, reason: 'invalid_base64' };
  }

  if (byteArray.length < MIN_IMAGE_BYTES) {
    return { ok: false, reason: 'too_small' };
  }

  const detected = detectExtensionAndMime(byteArray);
  if (!detected) {
    return { ok: false, reason: 'invalid_magic' };
  }

  const mime =
    contentType.includes('png') || contentType.includes('jpeg') || contentType.includes('webp')
      ? contentType
      : detected.mime;

  const extension = mime.includes('jpeg') ? 'jpg' : mime.includes('webp') ? 'webp' : detected.extension;
  const safeName = exerciseName
    .toLowerCase()
    .replace(/[^a-z0-9ąćęłńóśźż\s-]/gi, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60);

  const fileName = `ai-generated-${safeName || 'exercise'}.${extension}`;
  // Copy into a fresh Uint8Array so File/BlobPart gets a concrete ArrayBuffer
  const fileBytes = new Uint8Array(byteArray);
  const file = new File([fileBytes], fileName, { type: mime });
  return { ok: true, file };
}
