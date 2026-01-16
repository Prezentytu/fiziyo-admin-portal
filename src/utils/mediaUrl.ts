/**
 * URL bazowy dla Azure CDN
 * Konfiguracja przez zmienną środowiskową NEXT_PUBLIC_CDN_URL
 *
 * Przykłady:
 * - Dev: https://fiziyo-images-dev-bwg5chc5cwbvbngb.z03.azurefd.net
 * - Prod: https://images.fiziyo.com
 */
const CDN_BASE_URL = process.env.NEXT_PUBLIC_CDN_URL || "";

/**
 * Konwertuje URL mediów na pełny URL CDN
 *
 * Backend zawsze zwraca pełny CDN URL dla obrazów.
 * Ta funkcja obsługuje:
 * - Pełne URL-e (http/https) - zwraca bez zmian
 * - Data URL-e (base64) - zwraca bez zmian
 * - Ścieżki relatywne - dodaje base URL CDN
 */
export function getMediaUrl(relativeOrFullUrl: string | null | undefined): string | null {
  if (!relativeOrFullUrl) return null;

  // Pełny URL - zwróć bez zmian
  if (relativeOrFullUrl.startsWith("http://") || relativeOrFullUrl.startsWith("https://")) {
    return relativeOrFullUrl;
  }

  // Data URL (base64) - zwróć bez zmian
  if (relativeOrFullUrl.startsWith("data:")) {
    return relativeOrFullUrl;
  }

  // Ścieżka relatywna - użyj CDN
  if (CDN_BASE_URL) {
    const cleanPath = relativeOrFullUrl.replace(/^\//, "");
    return `${CDN_BASE_URL}/${cleanPath}`;
  }

  // Brak CDN - zwróć bez zmian
  return relativeOrFullUrl;
}

/**
 * Konwertuje tablicę URL-ów mediów i usuwa duplikaty
 */
export function getMediaUrls(urls: (string | null | undefined)[]): string[] {
  const processed = urls
    .map((url) => getMediaUrl(url))
    .filter((url): url is string => url !== null);

  // Usuń duplikaty zachowując kolejność
  return [...new Set(processed)];
}

/**
 * Sprawdza czy CDN jest skonfigurowane
 */
export function isCdnConfigured(): boolean {
  return !!CDN_BASE_URL;
}
