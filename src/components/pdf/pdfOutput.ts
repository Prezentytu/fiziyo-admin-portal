/**
 * Wyjście gotowego PDF w przeglądarce: pobranie, druk, podgląd w nowej karcie.
 * Blob URL żyje dłużej niż wywołanie: karta ładuje go asynchronicznie,
 * więc natychmiastowe `revokeObjectURL` dawało pustą kartę.
 */

const BLOB_URL_TTL_MS = 60_000;

function revokeLater(url: string) {
  setTimeout(() => URL.revokeObjectURL(url), BLOB_URL_TTL_MS);
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  revokeLater(url);
}

/**
 * Otwiera kartę synchronicznie w geście kliknięcia, zanim ruszy generowanie PDF.
 * `window.open` wołane po `await` blokuje popup blocker.
 */
export function openPendingWindow(): Window | null {
  const pending = window.open('', '_blank');
  if (pending) {
    pending.document.title = 'Generowanie PDF…';
    pending.document.body.textContent = 'Generowanie PDF…';
  }
  return pending;
}

const PRINT_POLL_MS = 200;
const PRINT_POLL_LIMIT = 50;

/** Woła `print()`, gdy karta skończy ładować PDF; przy braku dostępu zostawia druk użytkownikowi. */
function printWhenLoaded(target: Window, url: string) {
  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    try {
      if (target.closed || attempts > PRINT_POLL_LIMIT) {
        clearInterval(timer);
        return;
      }
      if (target.location.href === url && target.document.readyState === 'complete') {
        clearInterval(timer);
        target.focus();
        target.print();
      }
    } catch {
      clearInterval(timer);
    }
  }, PRINT_POLL_MS);
}

/**
 * Pokazuje PDF w otwartej wcześniej karcie (`print: true` od razu otwiera okno druku).
 * Bez karty pobiera plik.
 */
export function showPdfInWindow(
  blob: Blob,
  pending: Window | null,
  fileName: string,
  options: { print?: boolean } = {}
): 'opened' | 'downloaded' {
  if (!pending || pending.closed) {
    downloadBlob(blob, fileName);
    return 'downloaded';
  }
  const url = URL.createObjectURL(blob);
  pending.location.href = url;
  if (options.print) printWhenLoaded(pending, url);
  revokeLater(url);
  return 'opened';
}
