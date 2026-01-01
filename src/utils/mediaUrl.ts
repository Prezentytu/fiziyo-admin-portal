/**
 * Konwertuje relative URL obrazu na pełny URL z base URL backendu
 *
 * Przykład:
 * - Input: "/api/exercises/media/tulow-szyja/.../image.jpg"
 * - Output: "https://fizjo-app-api.azurewebsites.net/api/exercises/media/tulow-szyja/.../image.jpg"
 *
 * Jeśli URL jest już pełny (http/https), zwraca bez zmian.
 */
export function getMediaUrl(relativeOrFullUrl: string | null | undefined): string | null {
  if (!relativeOrFullUrl) return null;

  // Jeśli już jest pełny URL - zwróć bez zmian
  if (relativeOrFullUrl.startsWith("http://") || relativeOrFullUrl.startsWith("https://")) {
    return relativeOrFullUrl;
  }

  // Jeśli zaczyna się od /api/ - to jest nasz proxy endpoint
  if (relativeOrFullUrl.startsWith("/api/")) {
    const baseUrl = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
    return `${baseUrl}${relativeOrFullUrl}`;
  }

  // Inne przypadki - zwróć bez zmian
  return relativeOrFullUrl;
}

/**
 * Konwertuje tablicę URL-ów obrazów
 */
export function getMediaUrls(urls: (string | null | undefined)[]): string[] {
  return urls.map((url) => getMediaUrl(url)).filter((url): url is string => url !== null);
}

