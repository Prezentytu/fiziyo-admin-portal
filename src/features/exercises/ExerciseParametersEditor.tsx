'use client';

import { useCallback, useMemo } from 'react';
import {
  ExerciseParametersFields,
  type ExerciseParameterValues,
} from '@/components/shared/exercise/ExerciseParametersFields';
import { buildParamTestId, type ExerciseFieldKey } from '@/components/shared/exercise';
import type { ExerciseCoreDraft } from './useExerciseEditorForm';

type NumericDraftField =
  | 'sets'
  | 'reps'
  | 'executionTime'
  | 'restSets'
  | 'restReps'
  | 'preparationTime'
  | 'loadKg'
  | 'duration';
type TextDraftField = 'tempo' | 'rangeOfMotion';

export type ExerciseParametersEditorVariant = 'full' | 'create';

interface ExerciseParametersEditorProps {
  core: ExerciseCoreDraft;
  isDirtyField: (field: keyof ExerciseCoreDraft) => boolean;
  onNumberChange: (field: NumericDraftField, value: number | null) => void;
  onTextChange: (field: TextDraftField, value: string) => void;
  onSideChange: (value: string) => void;
  onDifficultyChange: (value: string) => void;
  /** Blokuje edycję (np. status weryfikacji), zachowując layout. */
  disabled?: boolean;
  /**
   * `full` — wszystkie parametry (detal / dialog / weryfikacja).
   * `create` — TIER 1–2 widoczne; TIER 3–4 w collapsible (lean create).
   */
  variant?: ExerciseParametersEditorVariant;
}

function coreToValues(core: ExerciseCoreDraft): ExerciseParameterValues {
  return {
    sets: core.sets,
    reps: core.reps,
    executionTime: core.executionTime,
    restSets: core.restSets,
    restReps: core.restReps,
    preparationTime: core.preparationTime,
    duration: core.duration,
    loadKg: core.loadKg,
    tempo: core.tempo,
    rangeOfMotion: core.rangeOfMotion,
    side: core.side,
    difficultyLevel: core.difficultyLevel,
    patientDescription: core.patientDescription,
    clinicalDescription: core.clinicalDescription,
    audioCue: core.audioCue,
    notes: core.notes,
  };
}

export function ExerciseParametersEditor({
  core,
  isDirtyField,
  onNumberChange,
  onTextChange,
  onSideChange,
  onDifficultyChange,
  disabled = false,
  variant = 'full',
}: Readonly<ExerciseParametersEditorProps>) {
  const values = useMemo(() => coreToValues(core), [core]);

  const handleChange = useCallback(
    (patch: Partial<ExerciseParameterValues>) => {
      if ('sets' in patch) onNumberChange('sets', patch.sets ?? null);
      if ('reps' in patch) onNumberChange('reps', patch.reps ?? null);
      if ('executionTime' in patch) onNumberChange('executionTime', patch.executionTime ?? null);
      if ('restSets' in patch) onNumberChange('restSets', patch.restSets ?? null);
      if ('restReps' in patch) onNumberChange('restReps', patch.restReps ?? null);
      if ('preparationTime' in patch) onNumberChange('preparationTime', patch.preparationTime ?? null);
      if ('duration' in patch) onNumberChange('duration', patch.duration ?? null);
      if ('loadKg' in patch) onNumberChange('loadKg', patch.loadKg ?? null);
      if ('tempo' in patch) onTextChange('tempo', patch.tempo ?? '');
      if ('rangeOfMotion' in patch) onTextChange('rangeOfMotion', patch.rangeOfMotion ?? '');
      if ('side' in patch && patch.side != null) onSideChange(patch.side);
      if ('difficultyLevel' in patch && patch.difficultyLevel != null) {
        onDifficultyChange(patch.difficultyLevel);
      }
    },
    [onDifficultyChange, onNumberChange, onSideChange, onTextChange]
  );

  const dirtyForField = useCallback(
    (key: ExerciseFieldKey) => {
      const draftKey = key === 'load' ? 'loadKg' : key;
      return isDirtyField(draftKey as keyof ExerciseCoreDraft);
    },
    [isDirtyField]
  );

  return (
    <ExerciseParametersFields
      surface="template"
      values={values}
      onChange={handleChange}
      isDirtyField={dirtyForField}
      collapseAdvanced={variant === 'create'}
      advancedDefaultOpen={variant === 'full'}
      density="compact"
      disabled={disabled}
      testIdFor={(key, kind) => {
        if (key === 'customName' || key === 'customDescription') {
          return `exercise-param-${key}-${kind === 'info' ? 'info' : 'input'}`;
        }
        return buildParamTestId(key, kind);
      }}
    />
  );
}
