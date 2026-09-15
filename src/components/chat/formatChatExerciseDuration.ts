import { formatDurationPolish } from '@/utils/durationPolish';

/**
 * Chat HTML `<b>` values are seconds (Exercise.PreparationTime / mapping.Duration).
 */
export function formatChatExerciseDuration(raw: string): string {
  const normalized = raw.replace(',', '.').trim();
  const seconds = Number(normalized);
  if (!Number.isFinite(seconds)) {
    return raw;
  }

  return formatDurationPolish(seconds);
}
