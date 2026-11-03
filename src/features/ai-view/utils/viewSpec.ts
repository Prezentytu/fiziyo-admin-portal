import { z } from 'zod';

export const NAVIGATE_ROUTES = {
  patients: { href: '/patients', label: 'Pacjenci' },
  'patient-new': { href: '/patients', label: 'Dodaj pacjenta' },
  'exercise-sets': { href: '/exercise-sets', label: 'Zestawy' },
  exercises: { href: '/exercises', label: 'Ćwiczenia' },
  verification: { href: '/verification', label: 'Weryfikacja' },
  settings: { href: '/settings', label: 'Ustawienia' },
} as const;

export type NavigateRoute = keyof typeof NAVIGATE_ROUTES;

const NAVIGATE_ROUTE_KEYS = Object.keys(NAVIGATE_ROUTES) as [NavigateRoute, ...NavigateRoute[]];
export const MAX_CLARIFY_OPTIONS = 4;
const MAX_IDS = 20;

export type ChatViewSpec =
  | { component: 'SetDraft'; patientId?: string; setId?: string; exerciseIds: string[]; note?: string }
  | { component: 'AssignSummary'; patientId: string; setId: string }
  | { component: 'ExerciseResults'; query: string; exerciseIds: string[]; patientId?: string }
  | { component: 'PatientPeek'; patientId?: string; filter?: 'inactive' }
  | { component: 'Navigate'; route: NavigateRoute }
  | { component: 'Clarify'; question: string; options: string[] }
  | { component: 'AddPatient'; name?: string }
  | { component: 'CreateExercise'; name?: string; description?: string };

export type ChatViewComponent = ChatViewSpec['component'];

const optionalText = z
  .string()
  .nullish()
  .transform((value) => value?.trim() || undefined);

const idList = z
  .array(z.string())
  .nullish()
  .transform((ids) => [...new Set((ids ?? []).map((id) => id.trim()).filter(Boolean))].slice(0, MAX_IDS));

/** Wire shape of `POST /api/chat/dispatch` → `spec`; every field except `component` may be null. */
const RAW_SPEC_SCHEMA = z.object({
  component: z.string(),
  patientId: optionalText,
  setId: optionalText,
  exerciseIds: idList,
  query: optionalText,
  filter: optionalText,
  route: optionalText,
  question: optionalText,
  options: z.array(z.string()).nullish(),
  note: optionalText,
});

const routeSchema = z.enum(NAVIGATE_ROUTE_KEYS);

export const UNSUPPORTED_SPEC: ChatViewSpec = {
  component: 'Clarify',
  question:
    'Tego jeszcze nie umiem. Mogę ułożyć i wysłać zestaw, dodać pacjenta, utworzyć ćwiczenie, znaleźć ćwiczenia albo pokazać, kto nie ćwiczy.',
  options: ['Utwórz zestaw', 'Pokaż, kto nie ćwiczy', 'Dodaj pacjenta'],
};

/**
 * Turns whatever the dispatcher returned into one renderable card. A spec missing the data
 * its card needs degrades to the closest card that can still help, never to free text.
 */
export function toChatViewSpec(input: unknown): ChatViewSpec {
  const parsed = RAW_SPEC_SCHEMA.safeParse(input);
  if (!parsed.success) return UNSUPPORTED_SPEC;
  const raw = parsed.data;

  switch (raw.component) {
    case 'SetDraft':
      if (!raw.setId && raw.exerciseIds.length === 0) {
        return raw.patientId ? { component: 'PatientPeek', patientId: raw.patientId } : UNSUPPORTED_SPEC;
      }
      return {
        component: 'SetDraft',
        patientId: raw.patientId,
        setId: raw.setId,
        exerciseIds: raw.exerciseIds,
        note: raw.note,
      };
    case 'AssignSummary':
      if (raw.patientId && raw.setId) return { component: 'AssignSummary', patientId: raw.patientId, setId: raw.setId };
      if (raw.setId) return { component: 'SetDraft', setId: raw.setId, exerciseIds: [] };
      return raw.patientId ? { component: 'PatientPeek', patientId: raw.patientId } : UNSUPPORTED_SPEC;
    case 'ExerciseResults':
      if (!raw.query && raw.exerciseIds.length === 0) return UNSUPPORTED_SPEC;
      return {
        component: 'ExerciseResults',
        query: raw.query ?? '',
        exerciseIds: raw.exerciseIds,
        patientId: raw.patientId,
      };
    case 'PatientPeek':
      if (raw.patientId) return { component: 'PatientPeek', patientId: raw.patientId };
      return { component: 'PatientPeek', filter: 'inactive' };
    case 'Navigate': {
      const route = routeSchema.safeParse(raw.route);
      return route.success ? { component: 'Navigate', route: route.data } : UNSUPPORTED_SPEC;
    }
    case 'AddPatient':
      return { component: 'AddPatient', name: raw.query };
    case 'CreateExercise':
      return { component: 'CreateExercise', name: raw.query, description: raw.note };
    case 'Clarify': {
      const options = (raw.options ?? [])
        .map((option) => option.trim())
        .filter(Boolean)
        .slice(0, MAX_CLARIFY_OPTIONS);
      return raw.question ? { component: 'Clarify', question: raw.question, options } : UNSUPPORTED_SPEC;
    }
    default:
      return UNSUPPORTED_SPEC;
  }
}

export const MAX_REPLY_LENGTH = 1200;

export interface DispatchReply {
  /** Plain text under which the card renders; React escapes it, so model text never becomes markup. */
  text?: string;
  spec?: ChatViewSpec;
}

/**
 * Whole answer from `POST /api/chat/dispatch`: a sentence like in a conversation, then a card.
 * `Message` is an answer without a card ("co umiesz?"); a Clarify question moves into the text.
 */
export function parseDispatchReply(rawSpec: unknown, rawText: unknown): DispatchReply {
  const text = typeof rawText === 'string' ? rawText.trim().slice(0, MAX_REPLY_LENGTH) || undefined : undefined;
  const component =
    typeof rawSpec === 'object' && rawSpec !== null ? (rawSpec as { component?: unknown }).component : undefined;
  if (component === 'Message') return text ? { text } : { spec: UNSUPPORTED_SPEC };
  return { text, spec: toChatViewSpec(rawSpec) };
}
