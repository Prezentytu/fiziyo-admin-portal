import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ExerciseInstance, ExerciseParams } from '@/components/shared/ExerciseSetBuilder';
import { CustomizeSetStep } from './CustomizeSetStep';

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt?: string }) => <img src={src} alt={alt ?? ''} />,
}));

vi.mock('@apollo/client/react', () => ({
  useQuery: () => ({ data: undefined }),
}));

describe('CustomizeSetStep preview details flow', () => {
  it('opens full exercise details dialog from preview action', async () => {
    const user = userEvent.setup();

    render(
      <CustomizeSetStep
        planName="Plan testowy"
        onPlanNameChange={() => {}}
        isCreatingNew={true}
        selectedInstances={[] as ExerciseInstance[]}
        onSelectedInstancesChange={() => {}}
        exerciseParams={new Map<string, ExerciseParams>()}
        onExerciseParamsChange={() => {}}
        availableExercises={[
          {
            id: 'exercise-1',
            name: 'Przysiad testowy',
            patientDescription: 'Opis dla pacjenta',
            clinicalDescription: 'Opis kliniczny',
            audioCue: 'Oddychaj',
            rangeOfMotion: 'Pełny zakres',
            side: 'both',
            defaultSets: 3,
            defaultReps: 12,
            defaultExecutionTime: 8,
            defaultRestBetweenSets: 60,
            images: ['/image-1.jpg'],
          },
        ]}
        organizationId="org-1"
      />
    );

    await user.click(screen.getByRole('button', { name: 'Podgląd galerii ćwiczenia: Przysiad testowy' }));

    expect(screen.getByTestId('assign-set-preview-exercise-details-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('assign-set-preview-exercise-details-title')).toHaveTextContent('Przysiad testowy');
  });
});

