import type { FieldHelp } from '@/utils/fieldHelp';

export const EXERCISE_SIDE_LABELS = {
  none: 'Razem',
  left: 'Tylko lewa',
  right: 'Tylko prawa',
  both: 'Na każdą stronę',
  alternating: 'Naprzemiennie',
} as const;

const SIDE_HELP_SUMMARY = 'Jak pacjent rozkłada pracę na lewą i prawą stronę.';
const SIDE_HELP_PER_SIDE = { term: 'Na każdą stronę', text: 'w każdej serii najpierw lewa, potem prawa; przerwa między seriami.' };
const SIDE_HELP_TOGETHER = { term: 'Razem', text: 'jeden przebieg, także gdy obie strony pracują jednocześnie.' };

/** Podpowiedź strony dla rekordu bez wersji: „naprzemiennie” to liczba łącznie (jak dotąd). */
const EXERCISE_SIDE_HELP: FieldHelp = {
  summary: SIDE_HELP_SUMMARY,
  points: [
    SIDE_HELP_PER_SIDE,
    { term: 'Naprzemiennie', text: 'zmiana strony po każdym powtórzeniu; podana liczba łącznie dla obu stron.' },
    SIDE_HELP_TOGETHER,
  ],
};

/** Podpowiedź strony dla rekordu 3.3 (KONTRAKT-v3.3 §6.7): „naprzemiennie” to liczba na każdą stronę. */
const EXERCISE_SIDE_HELP_V33: FieldHelp = {
  summary: SIDE_HELP_SUMMARY,
  points: [
    SIDE_HELP_PER_SIDE,
    { term: 'Naprzemiennie', text: 'zmiana strony po każdym powtórzeniu; podana liczba na każdą stronę.' },
    SIDE_HELP_TOGETHER,
  ],
  example: '10 naprzemiennie = 20 powtórzeń w serii, po 10 na stronę.',
};

export function getExerciseSideHelp(alternatingPerSide = false): FieldHelp {
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
