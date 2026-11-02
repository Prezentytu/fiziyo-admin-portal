import type { ExerciseDialogSuccessEvent } from '../ExerciseDialog';

/** Library page: a copy and an exercise picked instead of a duplicate open on their own page. */
export function getExerciseDialogSuccessRoute(event?: ExerciseDialogSuccessEvent): string | null {
  if (!event?.exerciseId) return null;
  if (event.action === 'copied' || event.action === 'existing') return `/exercises/${event.exerciseId}`;
  return null;
}
