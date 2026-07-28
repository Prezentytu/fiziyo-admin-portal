import { describe, expect, it } from 'vitest';

import {
  buildEnrichmentUpdateVariables,
  isExerciseSaveAuthError,
} from '../buildEnrichmentUpdateVariables';
import { ENRICHMENT_SCHEMA_V3 } from '@/features/verification/utils/enrichmentToV3';

describe('buildEnrichmentUpdateVariables', () => {
  it('builds updateExercise variables with enrichmentDataJson string (not fieldName)', () => {
    const payload = {
      $schema: ENRICHMENT_SCHEMA_V3,
      equipment: ['mata'],
      ai: { problems: ['ból lędźwiowy'] },
    };

    const variables = buildEnrichmentUpdateVariables('exercise-1', payload);

    expect(variables).toEqual({
      exerciseId: 'exercise-1',
      enrichmentDataJson: JSON.stringify(payload),
    });
    expect(variables).not.toHaveProperty('fieldName');
    expect(variables).not.toHaveProperty('value');
  });

  it('stringifies empty object when payload is null or undefined', () => {
    expect(buildEnrichmentUpdateVariables('exercise-1', null).enrichmentDataJson).toBe('{}');
    expect(buildEnrichmentUpdateVariables('exercise-1', undefined).enrichmentDataJson).toBe('{}');
  });

  it('produces parseable JSON for backend EnrichmentNormalizer', () => {
    const variables = buildEnrichmentUpdateVariables('exercise-1', {
      $schema: ENRICHMENT_SCHEMA_V3,
      patient: { steps: ['Usiądź prosto'] },
    });

    const parsed = JSON.parse(variables.enrichmentDataJson) as {
      $schema: string;
      patient: { steps: string[] };
    };
    expect(parsed.$schema).toBe(ENRICHMENT_SCHEMA_V3);
    expect(parsed.patient.steps).toEqual(['Usiądź prosto']);
  });
});

describe('isExerciseSaveAuthError', () => {
  it('detects unauthorized / permission messages', () => {
    expect(isExerciseSaveAuthError(new Error('UnauthorizedAccessException'))).toBe(true);
    expect(isExerciseSaveAuthError(new Error('Brak uprawnień do weryfikacji'))).toBe(true);
    expect(isExerciseSaveAuthError(new Error('Forbidden'))).toBe(true);
  });

  it('returns false for unrelated errors', () => {
    expect(isExerciseSaveAuthError(new Error('Unexpected Execution Error'))).toBe(false);
    expect(isExerciseSaveAuthError('string')).toBe(false);
    expect(isExerciseSaveAuthError(null)).toBe(false);
  });
});
