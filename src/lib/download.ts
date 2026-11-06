/** Pobiera plik spod `href` (blob URL albo data URL) przez kliknięcie tymczasowego linku. */
export function clickDownloadLink(href: string, fileName: string) {
  const link = document.createElement('a');
  link.href = href;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
}
