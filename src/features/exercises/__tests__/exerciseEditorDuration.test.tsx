import { render, renderHook, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ExerciseParametersEditor } from '../ExerciseParametersEditor';
import { useExerciseEditorForm, type ExerciseEditorSource } from '../useExerciseEditorForm';

/** Review #137, runda 2: edycja zapisanego REPS z pozostałym duration liczy jak podgląd i player. */
const savedReps: ExerciseEditorSource = {
  id: 'exercise-reps',
  name: 'Wspięcia',
  type: 'REPS',
  side: 'NONE',
  defaultSets: 1,
  defaultReps: 10,
  defaultDuration: 300,
  defaultRestBetweenSets: 0,
  defaultRestBetweenReps: 0,
  preparationTime: 0,
};

function renderEditor(source: ExerciseEditorSource) {
  const { result } = renderHook(() =>
    useExerciseEditorForm({ source, updateCore: async () => undefined, updateEnrichment: async () => undefined })
  );
  render(
    <ExerciseParametersEditor
      core={result.current.core}
      exerciseType={result.current.exerciseType}
      isDirtyField={() => false}
      onNumberChange={vi.fn()}
      onTextChange={vi.fn()}
      onSideChange={vi.fn()}
      onDifficultyChange={vi.fn()}
    />
  );
  return result.current;
}

describe('edytor parametrów zapisanego ćwiczenia', () => {
  it('formularz edycji niesie zapisany typ', () => {
    const { result } = renderHook(() =>
      useExerciseEditorForm({ source: savedReps, updateCore: async () => undefined, updateEnrichment: async () => undefined })
    );
    expect(result.current.exerciseType).toBe('reps');
  });

  it('REPS z pozostałym duration 300: czas ćwiczenia 30 s, nie 5 min', () => {
    renderEditor(savedReps);
    const total = screen.getByTestId('exercise-param-total-time');
    expect(total).toHaveTextContent('~30 s');
    expect(total).not.toHaveTextContent('5 min');
  });

  it('TIME z duration 300 nadal liczy duration', () => {
    renderEditor({ ...savedReps, id: 'exercise-time', type: 'TIME' });
    expect(screen.getByTestId('exercise-param-total-time')).toHaveTextContent('5 min');
  });
});
