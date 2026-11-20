import { normalizeSearchText } from '@/features/exercises/utils/exerciseSearch';
import { matchPatients, type MatchablePatient } from './patientMatch';
import { wordStems } from './textMatch';
import type { ChatViewSpec } from './viewSpec';

export type ExerciseForm = Extract<ChatViewSpec, { component: 'CreateExercise' }>;
export interface ExerciseDiscussion {
  topic: string;
  search: string;
  ids: string[];
  selected?: boolean;
}

export function exerciseSearchTerms(topic: string): string {
  // The library ANDs its search terms. Leave out the request and symptoms („na bolącą stopę” → „stop”).
  const words = normalizeSearchText(topic).match(/[a-z0-9]+/g) ?? [];
  return words
    .filter((word) => word.length >= 3 && !/^(?:cwiczeni\w*|bolac\w*|bol|bolu|zdrow[aye]|dla|przy|bez)$/.test(word))
    .map((word) => (word === 'siadzie' ? 'siad' : word.length >= 4 ? wordStems(word)[0] : word))
    .join(' ');
}

export function opensExerciseForm(text: string): boolean {
  return /^(?:(?:tak[, ]+)?(?:utworz|stworz|zrob)(?:my)?|wole|chce) (?:wlasne|nowe)(?: cwiczenie)?[.!]?$/i.test(
    normalizeSearchText(text.trim())
  );
}

// Strip an explicit exclusion before deciding whether a set was requested. Keep the original Polish wording.
export function withoutDeclinedSet(text: string): string {
  return text
    .replace(/(?:[,;]\s*)?\b(?:bez|nie chc[ęe]|nie (?:tw[óo]rz|uk[łl]adaj))\s+(?:nowego\s+)?zestawu?\b/giu, '')
    .trim();
}

export function continuesExerciseDiscussion(text: string, patients: readonly MatchablePatient[]): boolean {
  const value = normalizeSearchText(withoutDeclinedSet(text));
  if (
    /\b(?:pacjen\w*|zestaw\w*|plan(?:u|em|ie|y)?|program\w*|przypisz|gabinet\w*|ustawieni\w*|organizac\w*|zapros\w*|wizy\w*|otworz|przejdz)\b/.test(
      value
    )
  )
    return false;
  return matchPatients(text, patients).kind === 'none';
}

export function exerciseFormFromDiscussion(spec: ExerciseForm): ExerciseForm {
  const form = { ...spec };
  delete form.discussion;
  return form;
}
