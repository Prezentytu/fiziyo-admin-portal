/** Backend rejects base64 payloads over 7 000 000 chars, i.e. ~5 MB of raw file. */
export const MAX_PHOTO_BYTES = 5_000_000;
export const MAX_PHOTOS = 5;

export function validatePhotoFile(file: Pick<File, 'name' | 'type' | 'size'>): string | null {
  if (!file.type.startsWith('image/')) return `Plik ${file.name} nie jest obrazem`;
  if (file.size > MAX_PHOTO_BYTES) return `Plik ${file.name} przekracza limit 5 MB`;
  return null;
}
