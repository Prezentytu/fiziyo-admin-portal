import { Badge } from '@/components/ui/badge';
import { exerciseReviewBadge, type ExerciseReviewFields } from '../utils/exerciseReviewBadge';

/** Znaczek „W weryfikacji” / „Do poprawy” przy ćwiczeniu gabinetu na kartach czatu; nic dla zaakceptowanych. */
export function ExerciseReviewBadge({
  exercise,
  testId,
}: {
  exercise: ExerciseReviewFields | undefined;
  testId: string;
}) {
  const badge = exerciseReviewBadge(exercise);
  if (!badge) return null;
  return (
    <Badge variant={badge.tone} className="shrink-0" data-testid={testId}>
      {badge.label}
    </Badge>
  );
}
