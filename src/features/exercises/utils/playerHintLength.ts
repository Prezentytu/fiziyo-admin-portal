/**
 * Limity długości tekstów pacjenta (T-0064). Player pokazuje tylko wskazówki (`patient.cues`) w ich fazach;
 * kroki i opis są pełną instrukcją, którą pacjent czyta w szczegółach ćwiczenia (fizjo-app
 * `utils/exercisePlayerGuidance.ts`). Dlatego wskazówka ma być krótkim hasłem, a krok może być dłuższy.
 * Te same wartości podaje asystentowi AI backend (`AIController.CueMaxChars`, `StepMaxChars`).
 * Limity tylko ostrzegają: zapis nie jest blokowany, więc starsze długie teksty da się edytować.
 */

/** Wskazówka w playerze: hasło czytane z odległości. Player mieści dużą czcionką 90 znaków, 60 ma zapas. */
export const PLAYER_HINT_MAX_CHARS = 60;

/** Krok wykonania: jedna czynność, jedno lub dwa zdania. */
export const EXERCISE_STEP_MAX_CHARS = 200;

export type PatientTextKind = 'cue' | 'step';

export const PATIENT_TEXT_MAX_CHARS: Record<PatientTextKind, number> = {
  cue: PLAYER_HINT_MAX_CHARS,
  step: EXERCISE_STEP_MAX_CHARS,
};

export type PlayerHintLengthStatus = 'empty' | 'fits' | 'too-long';

export interface PlayerHintLength {
  readonly length: number;
  readonly max: number;
  readonly status: PlayerHintLengthStatus;
}

export function getPlayerHintLength(text: string | null | undefined, max = PLAYER_HINT_MAX_CHARS): PlayerHintLength {
  const length = (text ?? '').trim().length;
  if (length === 0) return { length, max, status: 'empty' };
  return { length, max, status: length > max ? 'too-long' : 'fits' };
}

/** Najdłuższy niepusty tekst z listy, żeby jeden licznik mówił za całe pole (np. kroki w jednym polu tekstowym). */
export function getLongestText(texts: readonly string[]): string {
  return texts
    .map((text) => text.trim())
    .reduce((longest, text) => (text.length > longest.length ? text : longest), '');
}
