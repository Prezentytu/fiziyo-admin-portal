/**
 * Eksport kodu QR (SVG z qrcode.react) do PNG.
 * SVG wczytany przez <img> nie pobiera zewnętrznych zasobów, więc logo w środku kodu
 * trzeba wcześniej wpisać jako data URL; inaczej w PNG zostaje biała dziura.
 */

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Nie udało się odczytać obrazu'));
    reader.readAsDataURL(blob);
  });
}

async function toDataUrl(href: string): Promise<string> {
  if (href.startsWith('data:')) return href;
  const response = await fetch(href);
  if (!response.ok) throw new Error(`Nie udało się pobrać ${href}`);
  return blobToDataUrl(await response.blob());
}

/** Kopia SVG z obrazami wpisanymi jako data URL. Oryginał w DOM zostaje bez zmian. */
export async function inlineSvgImages(svg: SVGSVGElement): Promise<SVGSVGElement> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const images = Array.from(clone.querySelectorAll('image'));
  await Promise.all(
    images.map(async (image) => {
      const href = image.getAttribute('href') ?? image.getAttribute('xlink:href');
      if (!href) return;
      image.setAttribute('href', await toDataUrl(href));
      image.removeAttribute('xlink:href');
    })
  );
  return clone;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Nie udało się narysować kodu QR'));
    img.src = src;
  });
}

/** Rysuje SVG kodu QR na białym tle i zwraca PNG jako data URL. */
export async function renderQrSvgToPng(svg: SVGSVGElement, size = 400): Promise<string> {
  const inlined = await inlineSvgImages(svg);
  if (!inlined.getAttribute('xmlns')) inlined.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const svgData = new XMLSerializer().serializeToString(inlined);
  const img = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgData)}`);

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Przeglądarka nie obsługuje canvas');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(img, 0, 0, size, size);
  return canvas.toDataURL('image/png');
}

export async function downloadQrSvgAsPng(svg: SVGSVGElement, fileName: string, size = 400): Promise<void> {
  const pngUrl = await renderQrSvgToPng(svg, size);
  const link = document.createElement('a');
  link.href = pngUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
}
