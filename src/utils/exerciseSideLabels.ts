export const EXERCISE_SIDE_LABELS = {
  none: 'Razem',
  left: 'Tylko lewa',
  right: 'Tylko prawa',
  both: 'Na każdą stronę',
  alternating: 'Naprzemiennie',
} as const;

export const EXERCISE_SIDE_HELP =
  'Na każdą stronę: w każdej serii lewa, potem prawa, przerwa między seriami. Naprzemiennie: podana liczba łącznie, zmiana strony po każdym powtórzeniu. Razem: jeden przebieg, także gdy obie strony pracują jednocześnie.';

export function formatExerciseSideLabel(side?: string | null): string {
  const normalized = side?.trim().toLowerCase() ?? '';
  if (!normalized) return EXERCISE_SIDE_LABELS.none;
  return EXERCISE_SIDE_LABELS[normalized as keyof typeof EXERCISE_SIDE_LABELS] ?? side ?? EXERCISE_SIDE_LABELS.none;
}
