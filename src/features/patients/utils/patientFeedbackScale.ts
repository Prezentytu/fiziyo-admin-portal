// The mobile app asks both questions on a 1–5 scale and stores 0 when the
// patient skips the answer (fizjo-app exercise-summary screen):
// pain 1 = lekko … 5 = mocno; difficulty 1 = za trudne … 5 = za łatwe.

export type FeelingType = 'easy' | 'ok' | 'hard';

export const PATIENT_FEEDBACK_SCALE_MAX = 5;

/** Pain at or above this level (4 or 5 of 5) needs the therapist's attention. */
export const DISCOMFORT_PAIN_LEVEL = 4;

/** Difficulty at or below this level (za trudne, trudne) counts as a hard session. */
export const HARD_DIFFICULTY_LEVEL = 2;

function isAnswered(level: number | null | undefined): level is number {
  return typeof level === 'number' && level > 0;
}

export function isDiscomfortPain(level: number | null | undefined): boolean {
  return isAnswered(level) && level >= DISCOMFORT_PAIN_LEVEL;
}

export function isHardDifficulty(level: number | null | undefined): boolean {
  return isAnswered(level) && level <= HARD_DIFFICULTY_LEVEL;
}

export function mapDifficultyToFeeling(level: number | null | undefined): FeelingType | null {
  if (!isAnswered(level)) return null;
  if (level <= HARD_DIFFICULTY_LEVEL) return 'hard';
  if (level < 4) return 'ok';
  return 'easy';
}

export function formatFeedbackLevel(level: number | null | undefined): string | null {
  if (!isAnswered(level)) return null;
  return `${Number.isInteger(level) ? level : level.toFixed(1)}/${PATIENT_FEEDBACK_SCALE_MAX}`;
}
