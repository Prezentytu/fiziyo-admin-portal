import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ExerciseCoreDraft } from '@/features/exercises/useExerciseEditorForm';
import { evaluateParameters, type ParameterValues } from '../utils/parameterRules';
import { ParametersStage } from './ParametersStage';

const core = { side: 'none', tempo: '', loadKg: null, rangeOfMotion: '' } as unknown as ExerciseCoreDraft;
const values: ParameterValues = { sets: 3, reps: 10, repTime: null, hold: null, rest: 60 };

function renderStage(onValueChange = vi.fn()) {
  render(
    <ParametersStage
      core={core}
      mode="reps"
      values={values}
      evaluation={evaluateParameters({ values, mode: 'reps', side: 'none' })}
      descriptionNumbers={[]}
      onModeChange={vi.fn()}
      onValueChange={onValueChange}
      onAcknowledge={vi.fn()}
      onFixDescription={vi.fn()}
      onAcknowledgeDescription={vi.fn()}
      onCoreFieldChange={vi.fn()}
    />
  );
  return onValueChange;
}

describe('ParametersStage', () => {
  it('suwak zmienia wartość parametru', () => {
    const onValueChange = renderStage();

    fireEvent.change(screen.getByTestId('verification-param-reps-slider'), { target: { value: '15' } });

    expect(onValueChange).toHaveBeenCalledWith('reps', 15);
  });

  it('suwak pokazuje wartość z pola, a puste pole jako wartość domyślną', () => {
    renderStage();

    expect(screen.getByTestId('verification-param-sets-slider')).toHaveValue('3');
    expect(screen.getByTestId('verification-param-repTime-slider')).toHaveValue('3');
    expect(screen.getByRole('slider', { name: 'Przerwa między seriami: suwak' })).toHaveValue('60');
  });
});
