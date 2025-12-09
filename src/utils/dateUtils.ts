import { formatDistanceToNow } from "date-fns";
import { pl } from "date-fns/locale";

/**
 * Formatuje czas względny (np. "2 godziny temu")
 */
export function formatRelativeTime(timestamp?: number): string {
  if (!timestamp) return "Brak daty";

  return formatDistanceToNow(new Date(timestamp), {
    addSuffix: true,
    locale: pl,
  });
}

/**
 * Formatuje datę do formatu lokalnego
 */
export function formatLocalDate(timestamp?: number): string {
  if (!timestamp) return "Brak daty";

  return new Date(timestamp).toLocaleDateString("pl-PL");
}
