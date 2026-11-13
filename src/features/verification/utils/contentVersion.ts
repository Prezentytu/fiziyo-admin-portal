import { readExerciseContent } from '@/components/shared/exercise/readExerciseContent';
import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';

/** A content document in contract v3.3 or later; the shared reader decides, so every view agrees. */
export function isV33Document(document: ExerciseEnrichmentData | null | undefined): boolean {
  return readExerciseContent({ enrichmentData: document }).version === '3.3';
}
