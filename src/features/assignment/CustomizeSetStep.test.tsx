import { render, screen, within } from '@testing-library/react';
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
        library={{
          itemIds: ['exercise-1'],
          popularIds: [],
          counts: { all: 1, organization: 0, fiziyo: 1 },
          loading: false,
          loadingMore: false,
          remaining: 0,
          loadMore: () => {},
          search: '',
          onSearchChange: () => {},
          sourceFilter: 'all',
          onSourceFilterChange: () => {},
        }}
        organizationId="org-1"
      />
    );

    await user.click(screen.getByRole('button', { name: 'Podgląd ćwiczenia: Przysiad testowy' }));

    expect(screen.getByTestId('assign-set-preview-exercise-details-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('assign-set-preview-exercise-details-title')).toHaveTextContent('Przysiad testowy');
  });

  it('„Jak u pacjenta” w planie pokazuje parametry tej pozycji planu, nie katalogu', async () => {
    const exercise = {
      id: 'exercise-1',
      name: 'Przysiad testowy',
      patientDescription: 'Opis dla pacjenta',
      side: 'both',
      defaultSets: 3,
      defaultReps: 12,
      defaultExecutionTime: 8,
      defaultRestBetweenSets: 60,
      images: ['/image-1.jpg'],
    };

    async function patientFlowTime(params: ExerciseParams): Promise<string> {
      const user = userEvent.setup();
      const { unmount } = render(
        <CustomizeSetStep
          planName="Plan testowy"
          onPlanNameChange={() => {}}
          isCreatingNew={false}
          selectedInstances={[{ instanceId: 'i-1', exerciseId: 'exercise-1' }]}
          onSelectedInstancesChange={() => {}}
          exerciseParams={new Map<string, ExerciseParams>([['i-1', params]])}
          onExerciseParamsChange={() => {}}
          availableExercises={[exercise]}
          library={{
            itemIds: [],
            popularIds: [],
            counts: { all: 0, organization: 0, fiziyo: 0 },
            loading: false,
            loadingMore: false,
            remaining: 0,
            loadMore: () => {},
            search: '',
            onSearchChange: () => {},
            sourceFilter: 'all',
            onSourceFilterChange: () => {},
          }}
          organizationId="org-1"
        />
      );
      await user.click(screen.getAllByRole('button', { name: 'Otwórz podgląd ćwiczenia' })[0]);
      const dialog = screen.getByTestId('assign-set-preview-exercise-details-dialog');
      await user.click(within(dialog).getByTestId('assign-set-preview-exercise-details-tab-patient'));
      const time = within(dialog).getByTestId('assign-set-preview-exercise-details-flow-btn').textContent ?? '';
      unmount();
      return time;
    }

    const catalogTime = await patientFlowTime({ sets: 3, reps: 12, executionTime: 8, restSets: 60 });
    const planTime = await patientFlowTime({ sets: 1, reps: 12, executionTime: 8, restSets: 60 });

    expect(planTime).toMatch(/\d+:\d{2}/);
    expect(planTime).not.toBe(catalogTime);
  });
});
