/**
 * Oblicza szacowany czas wykonania ćwiczenia w sekundach.
 *
 * Dla ćwiczeń czasowych (TIME):
 *   serie * czas_trwania + (serie - 1) * przerwa
 *
 * Dla ćwiczeń na powtórzenia (REPS):
 *   serie * (powtórzenia * czas_jednego_powtórzenia) + (serie - 1) * przerwa
 */
export function calculateEstimatedTime(params: {
  sets: number;
  reps?: number;
  duration?: number;
  executionTime?: number;
  rest?: number;
}): number {
  const { sets, reps, duration, executionTime, rest = 60 } = params;

  if (duration && duration > 0) {
    // Ćwiczenie czasowe (TIME): serie * czas + przerwy między seriami
    return sets * duration + Math.max(0, sets - 1) * rest;
  }

  // Ćwiczenie na powtórzenia (REPS)
  // Domyślnie 3 sekundy na powtórzenie jeśli nie podano executionTime
  const repTime = executionTime || 3;
  const exerciseTime = sets * (reps || 10) * repTime;
  const restTime = Math.max(0, sets - 1) * rest;

  return exerciseTime + restTime;
}

/**
 * Formatuje czas w sekundach do czytelnego formatu.
 *
 * Przykłady:
 * - 90 sekund → "~2 min"
 * - 45 sekund → "~1 min"
 * - 180 sekund → "~3 min"
 */
export function formatEstimatedTime(seconds: number): string {
  if (seconds <= 0) return "~0 min";

  const minutes = Math.round(seconds / 60);

  if (minutes < 1) {
    return "~1 min";
  }

  return `~${minutes} min`;
}

/**
 * Mapuje wartość Side na ikonę/label do wyświetlenia.
 *
 * - None / Both → "↔" (obustronne)
 * - Left → "L"
 * - Right → "R"
 * - Alternating → "⟳"
 */
export function getSideIndicator(
  side: string | undefined | null
): { icon: string; label: string; showBadge: boolean } {
  const normalizedSide = side?.toLowerCase() || "none";

  switch (normalizedSide) {
    case "left":
      return { icon: "L", label: "Lewa strona", showBadge: true };
    case "right":
      return { icon: "R", label: "Prawa strona", showBadge: true };
    case "alternating":
      return { icon: "⟳", label: "Naprzemiennie", showBadge: true };
    case "both":
      return { icon: "↔", label: "Obustronne", showBadge: false };
    case "none":
    default:
      return { icon: "↔", label: "Obustronne", showBadge: false };
  }
}

/**
 * Sprawdza czy strona wymaga wyświetlenia badge'a (jest inna niż domyślna).
 */
export function shouldShowSideBadge(side: string | undefined | null): boolean {
  const normalizedSide = side?.toLowerCase() || "none";
  return normalizedSide === "left" || normalizedSide === "right" || normalizedSide === "alternating";
}
