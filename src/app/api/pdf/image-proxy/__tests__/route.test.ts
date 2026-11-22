import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GET } from '../route';

const IMAGE = 'https://fiziyoimagesdev.z36.web.core.windows.net/exercises/a.png';

function request(url: string) {
  return new NextRequest(`https://portal.fiziyo.pl/api/pdf/image-proxy?url=${encodeURIComponent(url)}`);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('pdf image proxy', () => {
  it('does not follow redirects away from the allowed host', async () => {
    const fetchMock = vi.fn(async (_url: string | URL, init?: RequestInit) => {
      if (init?.redirect !== 'error') {
        return new Response(new Uint8Array([1]), { status: 200, headers: { 'content-type': 'image/png' } });
      }
      throw new TypeError('unexpected redirect');
    });
    vi.stubGlobal('fetch', fetchMock);

    expect((await GET(request(IMAGE))).status).toBe(502);
  });

  it('rejects an upstream image larger than the PDF needs', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(new Uint8Array([1]), {
            status: 200,
            headers: { 'content-type': 'image/png', 'content-length': String(50 * 1024 * 1024) },
          })
      )
    );

    expect((await GET(request(IMAGE))).status).toBe(413);
  });

  it('passes an allowed image through', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(new Uint8Array([1, 2]), { status: 200, headers: { 'content-type': 'image/png' } }))
    );

    const response = await GET(request(IMAGE));
    expect(response.status).toBe(200);
    expect((await response.arrayBuffer()).byteLength).toBe(2);
  });
  it('stops reading a chunked image without Content-Length past the limit', async () => {
    const chunk = new Uint8Array(1024 * 1024);
    let sent = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        sent += 1;
        if (sent > 50) controller.close();
        else controller.enqueue(chunk);
      },
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(stream, { status: 200, headers: { 'content-type': 'image/png' } }))
    );

    expect((await GET(request(IMAGE))).status).toBe(413);
    expect(sent).toBeLessThan(50);
  });
});
