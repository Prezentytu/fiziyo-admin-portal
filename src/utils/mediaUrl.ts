import { urlConfig } from "@/graphql/config/urlConfig";

/**
 * URL bazowy dla Azure CDN/Blob Storage
 * Konfiguracja przez zmienną środowiskową NEXT_PUBLIC_CDN_URL
 *
 * Przykłady:
 * - Dev: https://fiziyoimages.blob.core.windows.net
 * - Prod: https://images.fiziyo.com (z Azure CDN)
 */
const CDN_BASE_URL = process.env.NEXT_PUBLIC_CDN_URL || "";
// Dla Static Website nie używamy kontenera w URL
// Dla Blob Storage ustaw np. "exercise-images"
const CDN_CONTAINER_NAME = "";

/**
 * Konwertuje URL mediów na pełny URL
 *
 * Obsługuje:
 * - Pełne URL-e (http/https) - zwraca bez zmian
 * - Data URL-e (base64) - zwraca bez zmian (kompatybilność wsteczna)
 * - URL-e proxy (/api/exercises/media/...) - konwertuje na Azure CDN jeśli skonfigurowane
 * - Ścieżki relatywne - dodaje base URL CDN
 */
export function getMediaUrl(relativeOrFullUrl: string | null | undefined): string | null {
  if (!relativeOrFullUrl) return null;

  // Pełny URL (z Azure Blob, CDN, lub inny) - zwróć bez zmian
  if (relativeOrFullUrl.startsWith("http://") || relativeOrFullUrl.startsWith("https://")) {
    return relativeOrFullUrl;
  }

  // Data URL (base64) - zwróć bez zmian (kompatybilność wsteczna)
  if (relativeOrFullUrl.startsWith("data:")) {
    return relativeOrFullUrl;
  }

  // URL proxy (/api/exercises/media/...) - konwertuj na Azure CDN jeśli skonfigurowane
  if (relativeOrFullUrl.startsWith("/api/exercises/media/")) {
    // Jeśli CDN skonfigurowane, użyj go bezpośrednio (szybciej!)
    if (CDN_BASE_URL) {
      const cleanPath = relativeOrFullUrl.replace("/api/exercises/media/", "");
      const containerPart = CDN_CONTAINER_NAME ? `/${CDN_CONTAINER_NAME}` : "";
      return `${CDN_BASE_URL}${containerPart}/${cleanPath}`;
    }

    // Fallback: użyj backendu jako proxy (wolniejsze, ale działa bez CDN)
    const baseUrl = urlConfig.getBaseUrl().replace(/\/$/, "");
    return `${baseUrl}${relativeOrFullUrl}`;
  }

  // URL proxy bez pełnej ścieżki (np. /api/...)
  if (relativeOrFullUrl.startsWith("/api/")) {
    const baseUrl = urlConfig.getBaseUrl().replace(/\/$/, "");
    return `${baseUrl}${relativeOrFullUrl}`;
  }

  // Ścieżka relatywna (np. exercises/123/image.jpg) - użyj CDN jeśli skonfigurowane
  if (CDN_BASE_URL) {
    const cleanPath = relativeOrFullUrl.replace(/^\//, "");
    const containerPart = CDN_CONTAINER_NAME ? `/${CDN_CONTAINER_NAME}` : "";
    return `${CDN_BASE_URL}${containerPart}/${cleanPath}`;
  }

  // Brak CDN - zwróć bez zmian
  return relativeOrFullUrl;
}

/**
 * Konwertuje tablicę URL-ów mediów
 */
export function getMediaUrls(urls: (string | null | undefined)[]): string[] {
  return urls.map((url) => getMediaUrl(url)).filter((url): url is string => url !== null);
}

/**
 * Sprawdza czy CDN jest skonfigurowane
 */
export function isCdnConfigured(): boolean {
  return !!CDN_BASE_URL;
}









