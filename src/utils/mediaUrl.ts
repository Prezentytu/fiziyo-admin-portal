import { urlConfig } from "@/graphql/config/urlConfig";

/**
 * Konwertuje względny URL mediów na pełny URL
 * Dla URL-ów proxy (/api/exercises/media/...) dodaje base URL backendu
 */
export function getMediaUrl(relativeOrFullUrl: string | null | undefined): string | null {
  if (!relativeOrFullUrl) return null;

  // Jeśli to już pełny URL, zwróć bez zmian
  if (relativeOrFullUrl.startsWith("http://") || relativeOrFullUrl.startsWith("https://")) {
    return relativeOrFullUrl;
  }

  // Jeśli to URL proxy, dodaj base URL backendu
  if (relativeOrFullUrl.startsWith("/api/")) {
    const baseUrl = urlConfig.getBaseUrl().replace(/\/$/, "");
    return `${baseUrl}${relativeOrFullUrl}`;
  }

  // Inne przypadki - zwróć bez zmian
  return relativeOrFullUrl;
}

/**
 * Konwertuje tablicę URL-ów mediów
 */
export function getMediaUrls(urls: (string | null | undefined)[]): string[] {
  return urls.map((url) => getMediaUrl(url)).filter((url): url is string => url !== null);
}









