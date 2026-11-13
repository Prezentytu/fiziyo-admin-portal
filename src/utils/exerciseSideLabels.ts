export const EXERCISE_SIDE_LABELS = {
  none: 'Razem',
  left: 'Tylko lewa',
  right: 'Tylko prawa',
  both: 'Na każdą stronę',
  alternating: 'Naprzemiennie',
} as const;

/** Podpowiedź strony dla rekordu bez wersji: „naprzemiennie” to liczba łącznie (jak dotąd). */
export const EXERCISE_SIDE_HELP =
  'Na każdą stronę: w każdej serii lewa, potem prawa, przerwa między seriami. Naprzemiennie: podana liczba łącznie, zmiana strony po każdym powtórzeniu. Razem: jeden przebieg, także gdy obie strony pracują jednocześnie.';

/** Podpowiedź strony dla rekordu 3.3 (KONTRAKT-v3.3 §6.7): „naprzemiennie” to liczba na każdą stronę. */
export const EXERCISE_SIDE_HELP_V33 =
  'Na każdą stronę: w każdej serii lewa, potem prawa, przerwa między seriami. Naprzemiennie: podana liczba na każdą stronę, zmiana strony po każdym powtórzeniu (10 = 20 powtórzeń w serii). Razem: jeden przebieg, także gdy obie strony pracują jednocześnie.';

export function getExerciseSideHelp(alternatingPerSide = false): string {
  return alternatingPerSide ? EXERCISE_SIDE_HELP_V33 : EXERCISE_SIDE_HELP;
}

/**
 * Nazwa strony. Rekord 3.3 dopowiada, że „naprzemiennie” jest na każdą stronę; rekord bez wersji zostaje
 * z samą nazwą (jak dotąd), bo tam liczba jest łączna.
 */
export function formatExerciseSideLabel(side?: string | null, alternatingPerSide = false): string {
  const normalized = side?.trim().toLowerCase() ?? '';
  if (!normalized) return EXERCISE_SIDE_LABELS.none;
  if (normalized === 'alternating' && alternatingPerSide) return `${EXERCISE_SIDE_LABELS.alternating}, na każdą stronę`;
  return EXERCISE_SIDE_LABELS[normalized as keyof typeof EXERCISE_SIDE_LABELS] ?? side ?? EXERCISE_SIDE_LABELS.none;
}
