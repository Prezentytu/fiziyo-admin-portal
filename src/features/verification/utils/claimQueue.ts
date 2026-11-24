/**
 * Przydział w kolejce globalnej (SPEC-041): porcje „Przydziel następne N” i komunikaty po przydziale.
 */

import { formatExerciseCount } from '@/utils/polishPlural';

/** Porcje do przydziału naraz. Backend przyjmuje do 100. */
export const CLAIM_BATCH_SIZES = [10, 25, 50, 100] as const;

/** Osoba, której przydzielamy: „Ty” albo imię i nazwisko kolegi. */
export interface AssignmentTarget {
  isMe: boolean;
  fullname: string;
}

function forWhom(target: AssignmentTarget): string {
  return target.isMe ? 'Tobie' : target.fullname;
}

/** Komunikat po „Przydziel następne N”: ile i komu, oraz dlaczego mniej, niż proszono. */
export function claimResultMessage(
  claimed: number,
  requested: number,
  target: AssignmentTarget
): { tone: 'success' | 'info'; text: string } {
  if (claimed === 0) return { tone: 'info', text: 'Nie ma już wolnych ćwiczeń w tej kolejce.' };
  const given = `Przydzielono ${formatExerciseCount(claimed)}: ${forWhom(target)}`;
  if (claimed < requested) return { tone: 'info', text: `${given}. Więcej wolnych nie było.` };
  return { tone: 'success', text: `${given}.` };
}

/**
 * Komunikat po przydziale zaznaczonych. `skipped` to ćwiczenia, które ma ktoś inny: panel proponuje wtedy
 * przejęcie (`offerTakeOver`), bo bez potwierdzenia backend cudzych nie rusza.
 */
export function assignResultMessage(
  changed: number,
  skipped: number,
  target: AssignmentTarget | null
): { tone: 'success' | 'warning'; text: string; offerTakeOver: boolean } {
  const done = target ? `Przydzielono ${formatExerciseCount(changed)}: ${forWhom(target)}` : `Zdjęto przydział: ${changed}`;
  if (skipped === 0) return { tone: 'success', text: `${done}.`, offerTakeOver: false };
  return {
    tone: 'warning',
    text: `${done}. ${formatExerciseCount(skipped)} ma ktoś inny.`,
    offerTakeOver: true,
  };
}
