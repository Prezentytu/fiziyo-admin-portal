/**
 * Soft limit for texts the mobile player shows as hints (`patient.steps`, `patient.cues`, and the
 * patient description when there are no steps). Mirrors fizjo-app `utils/playerHintLayout.ts`:
 * up to 60 chars stay in the large font (2 lines), longer ones drop to body font with 5 lines,
 * and from about 200 chars the hint gets cut on a phone. 120 keeps a hint within roughly
 * 3 body lines, so it still fits on a narrow phone with enlarged system font.
 * The limit is advisory only: saving is never blocked, so older long texts stay editable.
 */
export const PLAYER_HINT_MAX_CHARS = 120;

/** fizjo-app `buildExercisePlayerGuidance` shows only the first 2 steps (or description lines) and 4 cues. */
export const PLAYER_STEP_HINTS = 2;
export const PLAYER_CUE_HINTS = 4;

export type PlayerHintKind = 'step' | 'cue';

const PLAYER_HINT_LIMITS: Record<PlayerHintKind, number> = { step: PLAYER_STEP_HINTS, cue: PLAYER_CUE_HINTS };

/**
 * Whether the item at `index` of an editor list reaches the player. The player drops blank items
 * before taking the first N, so blank rows above do not count.
 */
export function isShownInPlayer(items: readonly string[], index: number, kind: PlayerHintKind): boolean {
  if (!items[index]?.trim()) return false;
  const filledBefore = items.slice(0, index).filter((item) => item.trim().length > 0).length;
  return filledBefore < PLAYER_HINT_LIMITS[kind];
}

/** Items of a list the player actually shows, in order. */
export function getPlayerHints(items: readonly string[], kind: PlayerHintKind): string[] {
  return items
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, PLAYER_HINT_LIMITS[kind]);
}

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

/**
 * Lines of the patient description that the player shows as hints. The player falls back to the
 * description only when the exercise has no steps; it splits it by line and strips list numbering
 * (same rules as fizjo-app `normalizeLines`).
 */
export function getDescriptionPlayerHints(
  description: string | null | undefined,
  steps: readonly string[] | null | undefined
): string[] {
  const hasSteps = (steps ?? []).some((step) => step.trim().length > 0);
  if (hasSteps || !description?.trim()) return [];

  const lines = description.split(/\r?\n/).map((line) => line.replace(/^\s*\d+[.)-]\s*/, ''));

  return getPlayerHints(lines, 'step');
}

/** The description hint that is closest to being cut, so one counter can speak for all of them. */
export function getLongestPlayerHint(hints: readonly string[]): string {
  return hints.reduce((longest, hint) => (hint.trim().length > longest.trim().length ? hint : longest), '');
}
