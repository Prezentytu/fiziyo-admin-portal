import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ExerciseParametersFields } from '../ExerciseParametersFields';
import { getTimerModeDescription } from '../timerModeCopy';

const BASE_VALUES = {
  sets: 1,
  reps: 5,
  executionTime: null as number | null,
  restSets: 0,
  restReps: 0,
  preparationTime: 0,
  duration: null,
  loadKg: null,
};

describe('ExerciseParametersFields timer badge', () => {
  it('pokazuje Timer wyłączony, gdy czas powtórzenia jest pusty', () => {
    render(
      <ExerciseParametersFields surface="template" values={BASE_VALUES} onChange={vi.fn()} />
    );

    expect(screen.getByTestId('exercise-param-mode-indicator')).toHaveTextContent('Timer wyłączony');
    expect(screen.queryByText(/BEZ TIMERA/i)).not.toBeInTheDocument();
  });

  it('pokazuje Timer w aplikacji, gdy czas powtórzenia > 0', () => {
    render(
      <ExerciseParametersFields
        surface="template"
        values={{ ...BASE_VALUES, executionTime: 8 }}
        onChange={vi.fn()}
      />
    );

    expect(screen.getByTestId('exercise-param-mode-indicator')).toHaveTextContent('Timer w aplikacji');
    expect(screen.getByTestId('exercise-param-mode-indicator')).toHaveAttribute(
      'aria-label',
      getTimerModeDescription(true)
    );
  });
});
