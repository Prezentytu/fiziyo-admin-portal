import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { ExerciseCoreDraft } from '@/features/exercises/useExerciseEditorForm';
import { evaluateParameters, type ParameterValues } from '../utils/parameterRules';
import { ParametersStage } from './ParametersStage';

const core = { side: 'none', tempo: '', loadKg: null, rangeOfMotion: '' } as unknown as ExerciseCoreDraft;
const values: ParameterValues = { sets: 3, reps: 10, repTime: null, hold: null, rest: 60 };

function renderStage(onValueChange = vi.fn(), onCoreFieldChange = vi.fn(), savedLoadLabel: string | null = null) {
  render(
    <ParametersStage
      core={core}
      mode="reps"
      values={values}
      evaluation={evaluateParameters({ values, mode: 'reps', side: 'none' })}
      descriptionNumbers={[]}
      onValueChange={onValueChange}
      onAcknowledge={vi.fn()}
      onFixDescription={vi.fn()}
      onAcknowledgeDescription={vi.fn()}
      onCoreFieldChange={onCoreFieldChange}
      savedLoadLabel={savedLoadLabel}
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

  it('przerwa między powtórzeniami i czas przygotowania trafiają do pól ćwiczenia', () => {
    const onCoreFieldChange = vi.fn();
    renderStage(vi.fn(), onCoreFieldChange);

    fireEvent.change(screen.getByTestId('verification-param-restReps-input'), { target: { value: '5' } });
    fireEvent.change(screen.getByTestId('verification-param-preparationTime-input'), { target: { value: '10' } });

    expect(onCoreFieldChange).toHaveBeenCalledWith('restReps', 5);
    expect(onCoreFieldChange).toHaveBeenCalledWith('preparationTime', 10);
  });

  it('pokazuje zapisane obciążenie, którego nie da się wpisać w kilogramach', () => {
    renderStage(vi.fn(), vi.fn(), 'guma czerwona');

    expect(screen.getByTestId('verification-param-saved-load-note')).toHaveTextContent('guma czerwona');
    expect(screen.getByTestId('verification-param-load-input')).toHaveAttribute('placeholder', 'guma czerwona');
  });

  it('wyczyszczony czas przygotowania zapisuje 0, bo null backend czyta jako „bez zmian”', () => {
    const onCoreFieldChange = vi.fn();
    render(
      <ParametersStage
        core={{ ...core, preparationTime: 10 }}
        mode="reps"
        values={values}
        evaluation={evaluateParameters({ values, mode: 'reps', side: 'none' })}
        descriptionNumbers={[]}
        onValueChange={vi.fn()}
        onAcknowledge={vi.fn()}
        onFixDescription={vi.fn()}
        onAcknowledgeDescription={vi.fn()}
        onCoreFieldChange={onCoreFieldChange}
      />
    );

    fireEvent.change(screen.getByTestId('verification-param-preparationTime-input'), { target: { value: '' } });

    expect(onCoreFieldChange).toHaveBeenCalledWith('preparationTime', 0);
  });

  it('ułamek z przecinkiem zostaje w polu, zanim padnie kolejna cyfra', () => {
    const onCoreFieldChange = vi.fn();
    const onValueChange = vi.fn();
    function Stateful() {
      const [draft, setDraft] = useState<ExerciseCoreDraft>(core);
      const [current, setCurrent] = useState<ParameterValues>(values);
      return (
        <ParametersStage
          core={draft}
          mode="reps"
          values={current}
          evaluation={evaluateParameters({ values: current, mode: 'reps', side: 'none' })}
          descriptionNumbers={[]}
          onValueChange={(key, value) => {
            onValueChange(key, value);
            setCurrent((previous) => ({ ...previous, [key]: value }));
          }}
          onAcknowledge={vi.fn()}
          onFixDescription={vi.fn()}
          onAcknowledgeDescription={vi.fn()}
          onCoreFieldChange={(field, value) => {
            onCoreFieldChange(field, value);
            setDraft((previous) => ({ ...previous, [field]: value }));
          }}
        />
      );
    }
    render(<Stateful />);

    for (const testId of [
      'verification-param-preparationTime-input',
      'verification-param-load-input',
      'verification-param-repTime-input',
    ]) {
      fireEvent.change(screen.getByTestId(testId), { target: { value: '2,' } });
      expect(screen.getByTestId(testId)).toHaveValue('2,');
      fireEvent.change(screen.getByTestId(testId), { target: { value: '2,5' } });
      expect(screen.getByTestId(testId)).toHaveValue('2,5');
    }

    expect(onCoreFieldChange).toHaveBeenLastCalledWith('loadKg', 2.5);
    expect(onCoreFieldChange).toHaveBeenCalledWith('preparationTime', 2.5);
    expect(onValueChange).toHaveBeenLastCalledWith('repTime', 2.5);
  });

  it('suwak nadpisuje tekst wpisany w polu', () => {
    function Stateful() {
      const [current, setCurrent] = useState<ParameterValues>(values);
      return (
        <ParametersStage
          core={core}
          mode="reps"
          values={current}
          evaluation={evaluateParameters({ values: current, mode: 'reps', side: 'none' })}
          descriptionNumbers={[]}
          onValueChange={(key, value) => setCurrent((previous) => ({ ...previous, [key]: value }))}
          onAcknowledge={vi.fn()}
          onFixDescription={vi.fn()}
          onAcknowledgeDescription={vi.fn()}
          onCoreFieldChange={vi.fn()}
        />
      );
    }
    render(<Stateful />);

    fireEvent.change(screen.getByTestId('verification-param-reps-input'), { target: { value: '12,' } });
    fireEvent.change(screen.getByTestId('verification-param-reps-slider'), { target: { value: '15' } });

    expect(screen.getByTestId('verification-param-reps-input')).toHaveValue('15');
  });

  it('tekst, który nie jest liczbą, nie zmienia szkicu i po wyjściu z pola wraca do zapisanej wartości', () => {
    const onCoreFieldChange = vi.fn();
    render(
      <ParametersStage
        core={{ ...core, loadKg: 10 }}
        mode="reps"
        values={values}
        evaluation={evaluateParameters({ values, mode: 'reps', side: 'none' })}
        descriptionNumbers={[]}
        onValueChange={vi.fn()}
        onAcknowledge={vi.fn()}
        onFixDescription={vi.fn()}
        onAcknowledgeDescription={vi.fn()}
        onCoreFieldChange={onCoreFieldChange}
      />
    );
    const input = screen.getByTestId('verification-param-load-input');

    fireEvent.change(input, { target: { value: '5 kg' } });
    fireEvent.blur(input);

    expect(onCoreFieldChange).not.toHaveBeenCalled();
    expect(input).toHaveValue('10');
  });

  it('serie i powtórzenia przyjmują tylko liczby całkowite, bo player pacjenta liczy całe powtórzenia', () => {
    const onValueChange = renderStage();
    const input = screen.getByTestId('verification-param-reps-input');

    fireEvent.change(input, { target: { value: '10,5' } });
    fireEvent.blur(input);

    expect(onValueChange).not.toHaveBeenCalled();
    expect(input).toHaveValue('10');
  });

  it('ułamek wpisywany znak po znaku w powtórzeniach po wyjściu z pola wraca do liczby sprzed edycji', () => {
    const onValueChange = vi.fn();
    function Stateful() {
      const [current, setCurrent] = useState<ParameterValues>({ ...values, reps: 15 });
      return (
        <ParametersStage
          core={core}
          mode="reps"
          values={current}
          evaluation={evaluateParameters({ values: current, mode: 'reps', side: 'none' })}
          descriptionNumbers={[]}
          onValueChange={(key, value) => {
            onValueChange(key, value);
            setCurrent((previous) => ({ ...previous, [key]: value }));
          }}
          onAcknowledge={vi.fn()}
          onFixDescription={vi.fn()}
          onAcknowledgeDescription={vi.fn()}
          onCoreFieldChange={vi.fn()}
        />
      );
    }
    render(<Stateful />);
    const input = screen.getByTestId('verification-param-reps-input');

    fireEvent.focus(input);
    for (const text of ['1', '10', '10,', '10,5']) fireEvent.change(input, { target: { value: text } });
    expect(onValueChange).not.toHaveBeenCalledWith('reps', 10.5);
    fireEvent.blur(input);

    expect(onValueChange).toHaveBeenLastCalledWith('reps', 15);
    expect(input).toHaveValue('15');
  });
});
