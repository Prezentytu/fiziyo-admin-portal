import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ExerciseParametersFields } from '../ExerciseParametersFields';
import {
  EXERCISE_FIELD_EDIT_CONFIG,
  buildParamTestId,
  getFieldsForSurface,
  type ExerciseFieldSurface,
} from '../fieldContract';
import type { ExerciseFieldKey } from '../displayRegistry';

const SURFACES: ExerciseFieldSurface[] = ['template', 'mapping', 'patientOverride', 'patientPlan'];

const EMPTY_VALUES = {
  sets: 3,
  reps: 10,
  executionTime: 5,
  restSets: 60,
  restReps: 0,
  preparationTime: 0,
  duration: null,
  loadKg: null,
  tempo: '',
  rangeOfMotion: '',
  side: 'none',
  difficultyLevel: 'UNKNOWN',
  patientDescription: '',
  clinicalDescription: '',
  audioCue: '',
  notes: '',
  customName: '',
  customDescription: '',
};

describe('parameterSurfaceParity', () => {
  it.each(SURFACES)(
    'każde editable pole getFieldsForSurface(%s) ma input w ExerciseParametersFields',
    async (surface) => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <ExerciseParametersFields
          surface={surface}
          values={EMPTY_VALUES}
          onChange={onChange}
          showContentSection
          showMappingOnlyFields={surface !== 'template'}
          advancedDefaultOpen
          collapseAdvanced={false}
        />
      );

      // Ensure advanced (and thus all sections) is visible when collapsed by default on some surfaces
      const advancedToggle = screen.queryByTestId('exercise-param-advanced-toggle');
      if (advancedToggle) {
        await user.click(advancedToggle);
      }

      const editableKeys = getFieldsForSurface(surface).map((config) => config.key);
      expect(editableKeys.length).toBeGreaterThan(0);

      for (const key of editableKeys) {
        const config = EXERCISE_FIELD_EDIT_CONFIG[key];
        const testId = buildParamTestId(key, config.editor === 'select' ? 'select' : 'input');
        expect(
          screen.getByTestId(testId),
          `Missing input for ${key} on surface ${surface} (testid ${testId})`
        ).toBeInTheDocument();
      }
    }
  );

  it('omitFields ukrywa sets/reps na mapping bez usuwania pozostałych pól', () => {
    render(
      <ExerciseParametersFields
        surface="mapping"
        values={EMPTY_VALUES}
        onChange={vi.fn()}
        omitFields={['sets', 'reps'] as ExerciseFieldKey[]}
        collapseAdvanced={false}
        showContentSection
      />
    );

    expect(screen.queryByTestId(buildParamTestId('sets'))).not.toBeInTheDocument();
    expect(screen.queryByTestId(buildParamTestId('reps'))).not.toBeInTheDocument();
    expect(screen.getByTestId(buildParamTestId('executionTime'))).toBeInTheDocument();
    expect(screen.getByTestId(buildParamTestId('restSets'))).toBeInTheDocument();
  });
});
