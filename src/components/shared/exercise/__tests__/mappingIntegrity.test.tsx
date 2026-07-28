import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ExerciseExecutionCard } from '../ExerciseExecutionCard';
import {
  EXERCISE_FIELD_EDIT_CONFIG,
  getFieldsForSurface,
  getMappingEditableCardFields,
  getMappingInheritedFieldKeys,
} from '../fieldContract';

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt?: string }) => <img src={src} alt={alt ?? ''} />,
}));

describe('mapping surface integrity', () => {
  it('każde pole mapping edit ma input z testid w ExerciseExecutionCard', async () => {
    const user = userEvent.setup();
    render(
      <ExerciseExecutionCard
        mode="edit"
        defaultExpanded
        testIdPrefix="map-card"
        editableFields={getMappingEditableCardFields()}
        exercise={{
          id: 'm1',
          sourceExerciseId: 'ex-1',
          displayName: 'Test',
          sets: 3,
          reps: 10,
          executionTime: 5,
          restSets: 60,
          restReps: 0,
          preparationTime: 5,
          duration: 30,
          tempo: '2-0-2-0',
          loadKg: 5,
          notes: 'n',
          customName: '',
          customDescription: '',
          side: 'both',
          rangeOfMotion: 'pełny',
          difficultyLevel: 'MEDIUM',
        }}
      />
    );

    await user.click(screen.getByTestId('map-card-m1-advanced-toggle'));

    const editKeys = getFieldsForSurface('mapping').map((config) => config.key);
    expect(editKeys.length).toBeGreaterThan(0);

    for (const key of editKeys) {
      const config = EXERCISE_FIELD_EDIT_CONFIG[key];
      expect(config.mappingMode).toBe('edit');
      if (key === 'sets') {
        expect(screen.getAllByTestId('map-card-m1-sets-input').length).toBeGreaterThan(0);
      } else if (key === 'reps') {
        expect(screen.getAllByTestId('map-card-m1-reps-input').length).toBeGreaterThan(0);
      } else if (key === 'executionTime') {
        expect(screen.getByTestId('map-card-m1-execution-time-input')).toBeInTheDocument();
      } else if (key === 'restSets') {
        expect(screen.getByTestId('map-card-m1-rest-sets-input')).toBeInTheDocument();
      } else if (key === 'restReps') {
        expect(screen.getByTestId('map-card-m1-rest-reps-input')).toBeInTheDocument();
      } else if (key === 'load') {
        expect(screen.getByTestId('map-card-m1-load-input')).toBeInTheDocument();
      } else if (key === 'duration') {
        expect(screen.getByTestId('map-card-m1-duration-input')).toBeInTheDocument();
      } else if (key === 'tempo') {
        expect(screen.getByTestId('map-card-m1-tempo-input')).toBeInTheDocument();
      } else if (key === 'preparationTime') {
        expect(screen.getByTestId('map-card-m1-preparation-time-input')).toBeInTheDocument();
      } else if (key === 'notes') {
        expect(screen.getByTestId('map-card-m1-notes-input')).toBeInTheDocument();
      }
    }

    expect(screen.getByTestId('map-card-m1-custom-name-input')).toBeInTheDocument();
    expect(screen.getByTestId('map-card-m1-custom-description-input')).toBeInTheDocument();
  });

  it('pola inherited/none mają wartość readonly w sekcji odziedziczonej (surface=mapping)', async () => {
    const user = userEvent.setup();
    render(
      <ExerciseExecutionCard
        mode="edit"
        surface="mapping"
        defaultExpanded
        testIdPrefix="map-card"
        exercise={{
          id: 'm2',
          sourceExerciseId: 'ex-2',
          displayName: 'Test',
          sets: 3,
          reps: 10,
          side: 'left',
          rangeOfMotion: '90°',
          difficultyLevel: 'HARD',
        }}
      />
    );

    await user.click(screen.getByTestId('map-card-m2-advanced-toggle'));

    expect(getMappingInheritedFieldKeys()).toContain('side');
    expect(screen.getByTestId('map-card-m2-inherited-side')).toBeInTheDocument();
    expect(screen.getByTestId('map-card-m2-inherited-rangeOfMotion')).toBeInTheDocument();
    expect(screen.getByTestId('map-card-m2-inherited-difficultyLevel')).toBeInTheDocument();
    expect(screen.getByTestId('map-card-m2-edit-template-link')).toHaveAttribute('href', '/exercises/ex-2');
  });

  it('surface=patientPlan ukrywa sekcję odziedziczoną i pokazuje edytowalne side/ROM/difficulty', async () => {
    const user = userEvent.setup();
    render(
      <ExerciseExecutionCard
        mode="edit"
        surface="patientPlan"
        defaultExpanded
        testIdPrefix="plan-card"
        exercise={{
          id: 'p1',
          sourceExerciseId: 'ex-3',
          displayName: 'Test',
          sets: 3,
          reps: 10,
          side: 'left',
          rangeOfMotion: '90°',
          difficultyLevel: 'HARD',
          patientDescription: 'Opis',
          clinicalDescription: 'Kliniczny',
          audioCue: 'Cue',
        }}
      />
    );

    await user.click(screen.getByTestId('plan-card-p1-advanced-toggle'));

    expect(screen.queryByTestId('plan-card-p1-inherited-section')).not.toBeInTheDocument();
    expect(screen.getByTestId('plan-card-p1-side-select')).toBeInTheDocument();
    expect(screen.getByTestId('plan-card-p1-difficulty-select')).toBeInTheDocument();
    expect(screen.getByTestId('plan-card-p1-rom-input')).toBeInTheDocument();
    expect(screen.getByTestId('plan-card-p1-patient-description-input')).toBeInTheDocument();
    expect(screen.getByTestId('plan-card-p1-clinical-description-input')).toBeInTheDocument();
    expect(screen.getByTestId('plan-card-p1-audio-cue-input')).toBeInTheDocument();
  });
});
