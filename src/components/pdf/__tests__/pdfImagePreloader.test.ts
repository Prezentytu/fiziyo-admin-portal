import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { preloadPdfImages } from '../pdfImagePreloader';

const PNG_BLOB = new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], { type: 'image/png' });
const JPEG_BLOB = new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: 'image/jpeg' });

function mockProxyResponse(blob: Blob, ok = true): Response {
  return {
    ok,
    status: ok ? 200 : 502,
    headers: new Headers({ 'content-type': blob.type }),
    blob: async () => blob,
  } as unknown as Response;
}

describe('preloadPdfImages', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('returns empty map when no URLs provided', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const result = await preloadPdfImages([]);
    expect(result.size).toBe(0);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('skips null and undefined entries without fetching', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const result = await preloadPdfImages([null, undefined, '']);
    expect(result.size).toBe(0);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('passes through data URLs without fetching', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const dataUrl = 'data:image/png;base64,AAA';
    const result = await preloadPdfImages([dataUrl]);
    expect(result.get(dataUrl)).toBe(dataUrl);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('builds the proxy URL with encoded source URL', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(mockProxyResponse(PNG_BLOB));
    vi.stubGlobal('fetch', fetchSpy);
    await preloadPdfImages(['https://cdn.example.com/path?x=1&y=2']);
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/pdf/image-proxy?url=https%3A%2F%2Fcdn.example.com%2Fpath%3Fx%3D1%26y%3D2',
      expect.objectContaining({ signal: expect.anything() })
    );
  });

  it('returns null for the failing URL while keeping the others (Promise.allSettled isolation)', async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(mockProxyResponse(PNG_BLOB))
      .mockResolvedValueOnce(mockProxyResponse(JPEG_BLOB, false));
    vi.stubGlobal('fetch', fetchSpy);

    const result = await preloadPdfImages(['https://cdn/ok.png', 'https://cdn/fail.jpg']);

    expect(result.get('https://cdn/ok.png')).toMatch(/^data:/);
    expect(result.get('https://cdn/fail.jpg')).toBeNull();
  });

  it('deduplicates identical URLs', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(mockProxyResponse(PNG_BLOB));
    vi.stubGlobal('fetch', fetchSpy);

    const result = await preloadPdfImages(['https://cdn/same.png', 'https://cdn/same.png']);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(result.size).toBe(1);
  });
});
