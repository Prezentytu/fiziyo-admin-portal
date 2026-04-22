import { NextRequest, NextResponse } from 'next/server';

/**
 * Server-side image proxy for PDF generation.
 *
 * Why this exists:
 * - `@react-pdf/renderer` v4 fetches remote images from the BROWSER context.
 * - Azure Front Door / Blob Storage typically does NOT send `Access-Control-Allow-Origin`.
 * - The browser then blocks the fetch and react-pdf silently renders an empty box.
 *
 * What this does:
 * - Server-side `fetch()` (no CORS at all - server-to-server).
 * - Whitelisted hostnames only (security against SSRF).
 * - Streams the binary response back so the client can wrap it in a data URL
 *   and feed it directly to `<PdfImage src={dataUrl} />`.
 *
 * NOT a generic image CDN: only used by `usePdfImagePreloader`.
 */

const ALLOWED_HOST_SUFFIXES = ['azurefd.net', 'fiziyo.com', 'blob.core.windows.net'];

const ALLOWED_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
  'image/svg+xml',
];

const FETCH_TIMEOUT_MS = 5000;

export async function GET(request: NextRequest) {
  const sourceUrl = request.nextUrl.searchParams.get('url');
  if (!sourceUrl) {
    return NextResponse.json({ error: 'Missing "url" query parameter' }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(sourceUrl);
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  if (target.protocol !== 'https:' && target.protocol !== 'http:') {
    return NextResponse.json({ error: 'Unsupported protocol' }, { status: 400 });
  }

  const hostname = target.hostname.toLowerCase();
  const isAllowed = ALLOWED_HOST_SUFFIXES.some(
    (suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`)
  );
  if (!isAllowed) {
    return NextResponse.json({ error: 'Host not allowed' }, { status: 403 });
  }

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), FETCH_TIMEOUT_MS);

  try {
    const upstream = await fetch(target, {
      signal: abortController.signal,
      headers: { Accept: ALLOWED_CONTENT_TYPES.join(', ') },
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: 'Upstream error', status: upstream.status },
        { status: 502 }
      );
    }

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    if (!ALLOWED_CONTENT_TYPES.some((allowed) => contentType.startsWith(allowed))) {
      return NextResponse.json({ error: 'Unsupported content type', contentType }, { status: 415 });
    }

    const body = await upstream.arrayBuffer();

    return new NextResponse(body, {
      status: 200,
      headers: {
        'content-type': contentType,
        'cache-control': 'public, max-age=86400, s-maxage=86400, immutable',
        'x-pdf-image-proxy': '1',
      },
    });
  } catch (error) {
    const isAbort = error instanceof Error && error.name === 'AbortError';
    return NextResponse.json(
      { error: isAbort ? 'Upstream timeout' : 'Proxy fetch failed' },
      { status: isAbort ? 504 : 502 }
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
