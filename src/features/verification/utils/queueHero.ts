import { pluralize } from '@/utils/textUtils';

/** Sentence next to the pending count, e.g. „ćwiczenia czekają na Twoją decyzję”. */
export function formatPendingQueueTitle(count: number): string {
  const noun = pluralize(count, 'ćwiczenie', false);
  const verb = noun === 'ćwiczenia' ? 'czekają' : 'czeka';
  return `${noun} ${verb} na Twoją decyzję`;
}
