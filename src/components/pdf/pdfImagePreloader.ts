/**
 * PDF Image Preloader
 *
 * Pre-fetches remote images via the server-side proxy and converts them to
 * base64 data URLs that `@react-pdf/renderer` can embed without any runtime
 * fetch (which avoids browser CORS + unsupported-format issues).
 *
 * Design principles:
 * - Pure async function (callable from event handlers, no React state).
 * - Per-image isolation via `Promise.allSettled` - one bad URL never breaks
 *   the entire PDF generation.
 * - Per-image timeout (default 5s).
 * - Auto-conversion of unsupported formats (WebP/AVIF/GIF/SVG) to PNG via
 *   `<canvas>` because react-pdf v4 only supports JPG/PNG natively.
 */

const PROXY_PATH = '/api/pdf/image-proxy';
const DEFAULT_TIMEOUT_MS = 5000;

const REACT_PDF_NATIVE_MIME = new Set(['image/jpeg', 'image/png']);

export interface PreloadOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
}

export type PreloadedImageMap = Map<string, string | null>;

/**
 * Pre-loads a list of image URLs and returns a map `originalUrl -> dataUrl | null`.
 * `null` means the image could not be loaded (network/format/timeout) - caller
 * should render a placeholder in that case, not abort the whole PDF.
 */
export async function preloadPdfImages(
  urls: readonly (string | null | undefined)[],
  options: PreloadOptions = {}
): Promise<PreloadedImageMap> {
  const result: PreloadedImageMap = new Map();
  const uniqueUrls = Array.from(new Set(urls.filter((u): u is string => typeof u === 'string' && u.length > 0)));

  if (uniqueUrls.length === 0) return result;

  const settled = await Promise.allSettled(
    uniqueUrls.map((url) => loadSingleImage(url, options))
  );

  uniqueUrls.forEach((url, idx) => {
    const outcome = settled[idx];
    if (outcome.status === 'fulfilled' && outcome.value) {
      result.set(url, outcome.value);
    } else {
      if (process.env.NODE_ENV !== 'production' && outcome.status === 'rejected') {
         
        console.warn('[PDF preloader] Failed to load image:', url, outcome.reason);
      }
      result.set(url, null);
    }
  });

  return result;
}

async function loadSingleImage(url: string, options: PreloadOptions): Promise<string | null> {
  if (url.startsWith('data:')) return url;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  const userSignal = options.signal;
  const onUserAbort = () => controller.abort();
  if (userSignal) {
    if (userSignal.aborted) controller.abort();
    else userSignal.addEventListener('abort', onUserAbort, { once: true });
  }

  try {
    const proxyUrl = buildProxyUrl(url);
    const response = await fetch(proxyUrl, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Proxy returned ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const blob = await response.blob();

    if (REACT_PDF_NATIVE_MIME.has(contentType.toLowerCase().split(';')[0])) {
      return await blobToDataUrl(blob);
    }

    return await convertBlobToPngDataUrl(blob);
  } finally {
    clearTimeout(timeoutId);
    if (userSignal) userSignal.removeEventListener('abort', onUserAbort);
  }
}

function buildProxyUrl(absoluteImageUrl: string): string {
  return `${PROXY_PATH}?url=${encodeURIComponent(absoluteImageUrl)}`;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('FileReader error'));
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('FileReader did not return a string'));
    };
    reader.readAsDataURL(blob);
  });
}

/**
 * Decodes any browser-supported image format (WebP/AVIF/GIF first frame/SVG)
 * and re-encodes it as PNG so react-pdf can embed it.
 */
async function convertBlobToPngDataUrl(blob: Blob): Promise<string> {
  const objectUrl = URL.createObjectURL(blob);
  try {
    const image = await loadHtmlImage(objectUrl);
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('HTMLImage failed to load'));
    img.src = src;
  });
}
