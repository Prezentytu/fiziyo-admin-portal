import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ExerciseParametersFields } from '../ExerciseParametersFields';

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

describe('ExerciseParametersFields execution time hint', () => {
  it('pokazuje podpowiedź pod czasem powtórzenia, a nie jako luźną frazę w sekcji', () => {
    render(
      <ExerciseParametersFields surface="template" values={BASE_VALUES} onChange={vi.fn()} />
    );

    const hint = screen.getByTestId('exercise-param-execution-time-hint');
    expect(hint).toHaveTextContent('Wpisz sekundy tutaj');
    expect(screen.queryByText(/Podaj „Czas powtórzenia”/)).not.toBeInTheDocument();

    const executionInput = screen.getByTestId('exercise-param-executionTime-input');
    expect(hint.compareDocumentPosition(executionInput) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
  });

  it('przy włączonym timerze instruuje, jak go wyłączyć', () => {
    render(
      <ExerciseParametersFields
        surface="template"
        values={{ ...BASE_VALUES, executionTime: 8 }}
        onChange={vi.fn()}
      />
    );

    expect(screen.getByTestId('exercise-param-execution-time-hint')).toHaveTextContent(
      'Wyczyść to pole, aby ćwiczyć bez odliczania'
    );
  });
});
