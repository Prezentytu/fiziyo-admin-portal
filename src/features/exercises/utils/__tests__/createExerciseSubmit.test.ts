import { describe, expect, it, vi } from 'vitest';
import { createExerciseSubmit } from '../createExerciseSubmit';
import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';

describe('createExerciseSubmit', () => {
  it('tworzy ćwiczenie bez enrichment gdy draft pusty', async () => {
    const createExercise = vi.fn().mockResolvedValue({
      data: { createExercise: { id: 'ex-1' } },
    });
    const updateExercise = vi.fn();

    const result = await createExerciseSubmit({
      organizationId: 'org-1',
      draft: { name: 'Przysiad', patientDescription: 'Opis' },
      enrichment: {},
      createExercise,
      updateExercise,
    });

    expect(result).toEqual({ exerciseId: 'ex-1', enrichmentSaved: true });
    expect(createExercise).toHaveBeenCalledTimes(1);
    expect(updateExercise).not.toHaveBeenCalled();
  });

  it('zapisuje enrichment drugim krokiem gdy draft niepusty', async () => {
    const createExercise = vi.fn().mockResolvedValue({
      data: { createExercise: { id: 'ex-2' } },
    });
    const updateExercise = vi.fn().mockResolvedValue({});
    const enrichment: ExerciseEnrichmentData = {
      safety: { stop_if: 'ostry ból' },
    };

    const result = await createExerciseSubmit({
      organizationId: 'org-1',
      draft: { name: 'Przysiad' },
      enrichment,
      createExercise,
      updateExercise,
    });

    expect(result.exerciseId).toBe('ex-2');
    expect(result.enrichmentSaved).toBe(true);
    expect(updateExercise).toHaveBeenCalledTimes(1);
    expect(updateExercise.mock.calls[0][0].variables.exerciseId).toBe('ex-2');
    expect(typeof updateExercise.mock.calls[0][0].variables.enrichmentDataJson).toBe('string');
  });

  it('zwraca warning gdy enrichment failuje, ale ćwiczenie zostaje', async () => {
    const createExercise = vi.fn().mockResolvedValue({
      data: { createExercise: { id: 'ex-3' } },
    });
    const updateExercise = vi.fn().mockRejectedValue(new Error('network'));

    const result = await createExerciseSubmit({
      organizationId: 'org-1',
      draft: { name: 'Przysiad' },
      enrichment: { safety: { stop_if: 'ból' } },
      createExercise,
      updateExercise,
    });

    expect(result.exerciseId).toBe('ex-3');
    expect(result.enrichmentSaved).toBe(false);
    expect(result.enrichmentWarning).toContain('treść rozszerzona nie zapisała się');
  });
});
