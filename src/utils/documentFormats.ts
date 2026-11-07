import { getClipboardImageFiles } from './clipboardImages';

/**
 * Formats the document analysis (`POST /api/ai/document-analyze`) reads. A photo or a screenshot
 * of a visit note goes to the model as an image; the backend checks the bytes, this only stops a
 * file the backend would reject before it costs an upload.
 */

const DOCUMENT_EXTENSIONS = ['.pdf', '.xlsx', '.xls', '.csv', '.txt', '.md'] as const;
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'] as const;
const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
const HEIF_EXTENSIONS = ['.heic', '.heif'] as const;

/** `accept` of the file inputs: extensions plus image MIME types (a pasted screenshot has no real name). */
export const DOCUMENT_ACCEPT = [...DOCUMENT_EXTENSIONS, ...IMAGE_EXTENSIONS, ...IMAGE_MIME_TYPES].join(',');

/** One line of copy for every place that lists the formats. */
export const SUPPORTED_FORMATS_LABEL = 'PDF, Excel, CSV, TXT albo zdjęcie (JPG, PNG, WEBP)';

interface FileLike {
  readonly name: string;
  readonly type: string;
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot).toLowerCase() : '';
}

function includes(list: readonly string[], value: string): boolean {
  return list.includes(value);
}

export function isImageFile(file: FileLike): boolean {
  return includes(IMAGE_EXTENSIONS, extensionOf(file.name)) || includes(IMAGE_MIME_TYPES, file.type.toLowerCase());
}

export function isHeifFile(file: FileLike): boolean {
  const type = file.type.toLowerCase();
  return includes(HEIF_EXTENSIONS, extensionOf(file.name)) || type === 'image/heic' || type === 'image/heif';
}

export function isSupportedDocument(file: FileLike): boolean {
  if (isHeifFile(file)) return false;
  return includes(DOCUMENT_EXTENSIONS, extensionOf(file.name)) || isImageFile(file);
}

/** Why the file is not read, or null when it is. HEIC (iPhone photo) gets its own way out. */
export function unsupportedFormatMessage(file: FileLike): string | null {
  if (isSupportedDocument(file)) return null;
  if (isHeifFile(file)) return 'Zdjęć HEIC nie odczytam. Zapisz je jako JPG albo zrób zrzut ekranu.';
  return `Tego formatu nie odczytam. Obsługuję ${SUPPORTED_FORMATS_LABEL}.`;
}

const EXTENSION_BY_MIME: Readonly<Record<string, string>> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

interface ClipboardLike {
  readonly items: ArrayLike<{ kind: string; type: string; getAsFile: () => File | null }>;
  getData: (format: string) => string;
}

/**
 * The screenshot in a paste, or null when the paste is text. Word and Excel put a picture of the
 * copied text next to the text itself, so any text in the clipboard wins over the image.
 * The browser names a screenshot "image.png"; the thread shows a readable name instead.
 */
export function getPastedScreenshot(clipboard: ClipboardLike): File | null {
  if (clipboard.getData('text/plain').trim()) return null;
  const [image] = getClipboardImageFiles(clipboard.items);
  if (!image) return null;
  const extension = EXTENSION_BY_MIME[image.type.toLowerCase()] ?? extensionOf(image.name);
  return new File([image], `Zrzut ekranu${extension}`, { type: image.type, lastModified: image.lastModified });
}
