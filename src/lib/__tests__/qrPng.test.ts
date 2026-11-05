import { afterEach, describe, expect, it, vi } from 'vitest';

import { inlineSvgImages } from '../qrPng';

function qrSvgWithLogo(href: string): SVGSVGElement {
  const container = document.createElement('div');
  container.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0h1v1H0z"/><image href="${href}" width="26" height="26"/></svg>`;
  return container.querySelector('svg') as SVGSVGElement;
}

describe('inlineSvgImages', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('wpisuje logo jako data URL, bo SVG w <img> nie pobierze /images/icon.png', async () => {
    const fetchMock = vi.fn(async () => new Response(new Blob(['png'], { type: 'image/png' })));
    vi.stubGlobal('fetch', fetchMock);
    const svg = qrSvgWithLogo('/images/icon.png');

    const inlined = await inlineSvgImages(svg);

    expect(fetchMock).toHaveBeenCalledWith('/images/icon.png');
    expect(inlined.querySelector('image')?.getAttribute('href')).toMatch(/^data:image\/png;base64,/);
    expect(svg.querySelector('image')?.getAttribute('href')).toBe('/images/icon.png');
  });

  it('nieudane pobranie logo kończy się błędem zamiast cichego PNG z dziurą', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 404 })));

    await expect(inlineSvgImages(qrSvgWithLogo('/images/icon.png'))).rejects.toThrow('/images/icon.png');
  });
});
