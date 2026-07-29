import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';
import type { CreateExerciseVariables } from '@/graphql/types/exercise.types';
import { composeEnrichmentPayload, isEnrichmentPayloadEmpty } from '../useEnrichmentDraft';
import { buildCreateExerciseVariables, type CreateExerciseDraft } from './buildCreateExerciseVariables';

export interface CreateExerciseSubmitDeps {
  organizationId: string;
  draft: CreateExerciseDraft;
  enrichment: ExerciseEnrichmentData;
  createExercise: (options: {
    variables: CreateExerciseVariables;
  }) => Promise<{ data?: { createExercise?: { id: string } | null } | null }>;
  updateExercise: (options: {
    variables: { exerciseId: string; enrichmentDataJson: string };
  }) => Promise<unknown>;
}

export interface CreateExerciseSubmitResult {
  exerciseId: string;
  enrichmentSaved: boolean;
  enrichmentWarning?: string;
}

/**
 * Canonical create write-path: createExercise → optional updateExercise(enrichmentDataJson).
 * Enrichment failure does not roll back the created exercise (SPEC-021 degradation pattern).
 */
export async function createExerciseSubmit({
  organizationId,
  draft,
  enrichment,
  createExercise,
  updateExercise,
}: CreateExerciseSubmitDeps): Promise<CreateExerciseSubmitResult> {
  const result = await createExercise({
    variables: buildCreateExerciseVariables({ organizationId, draft }),
  });

  const exerciseId = result.data?.createExercise?.id;
  if (!exerciseId) {
    throw new Error('createExercise did not return an id');
  }

  const payload = composeEnrichmentPayload(enrichment);
  if (isEnrichmentPayloadEmpty(payload)) {
    return { exerciseId, enrichmentSaved: true };
  }

  try {
    await updateExercise({
      variables: {
        exerciseId,
        enrichmentDataJson: JSON.stringify(payload),
      },
    });
    return { exerciseId, enrichmentSaved: true };
  } catch {
    return {
      exerciseId,
      enrichmentSaved: false,
      enrichmentWarning:
        'Ćwiczenie zapisane; treść rozszerzona nie zapisała się — dokończ w edycji.',
    };
  }
}
