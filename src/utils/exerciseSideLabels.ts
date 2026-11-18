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

/** Suma powtórzeń w serii, gdy liczba w polu jest na stronę, oraz kolejność stron słowami. */
export interface RepsPerSideSummary {
  total: number;
  order: string;
}

const positiveCount = (reps?: number | null): number => (reps != null && reps > 0 ? Math.floor(reps) : 0);

/**
 * `null`, gdy liczba w polu „Powtórzenia” nie jest na stronę: brak stron, jedna strona albo
 * „naprzemiennie” w rekordzie bez wersji (tam liczba jest łączna).
 */
export function summarizeRepsPerSide(
  reps?: number | null,
  side?: string | null,
  alternatingPerSide = false
): RepsPerSideSummary | null {
  const count = positiveCount(reps);
  if (count === 0) return null;
  const normalized = side?.trim().toLowerCase();
  if (normalized === 'both') {
    return { total: count * 2, order: `najpierw ${count} lewa, potem ${count} prawa` };
  }
  if (normalized === 'alternating' && alternatingPerSide) {
    return { total: count * 2, order: `${count} lewa i ${count} prawa naprzemiennie` };
  }
  return null;
}

/** Druga linijka opcji na liście „Strona ciała”: co wpisana liczba powtórzeń znaczy przy tej stronie. */
export function describeSideOption(
  optionSide: string,
  reps?: number | null,
  alternatingPerSide = false
): string | null {
  const count = positiveCount(reps);
  if (count === 0) return null;
  const summary = summarizeRepsPerSide(count, optionSide, alternatingPerSide);
  if (summary) {
    const order = optionSide === 'alternating' ? `${count} lewa i ${count} prawa` : summary.order;
    return `${order} · łącznie ${summary.total}`;
  }
  if (optionSide === 'alternating') return `${count} w serii, łącznie dla obu stron`;
  return `${count} w serii`;
}

/** Podpowiedź pola „Powtórzenia”, gdy liczba jest na stronę. */
export const REPS_PER_SIDE_HELP: FieldHelp = {
  summary: 'Ile powtórzeń pacjent robi jedną stroną w serii.',
  example: '4 na stronę = 4 lewa i 4 prawa, razem 8 w serii.',
};
