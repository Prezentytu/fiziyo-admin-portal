import { useSyncExternalStore } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ExerciseBuilderFAB } from './ExerciseBuilderFAB';

const { builderStore, routerPush } = vi.hoisted(() => {
  const listeners = new Set<() => void>();
  let exercises: Array<{ id: string; name: string }> = [];
  return {
    routerPush: vi.fn(),
    builderStore: {
      subscribe: (listener: () => void) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      get: () => exercises,
      set: (next: Array<{ id: string; name: string }>) => {
        exercises = next;
        listeners.forEach((listener) => listener());
      },
    },
  };
});

vi.mock('@/contexts/ExerciseBuilderContext', () => ({
  useExerciseBuilder: () => {
    const selectedExercises = useSyncExternalStore(builderStore.subscribe, builderStore.get);
    return {
      selectedExercises,
      hasExercises: selectedExercises.length > 0,
      exerciseCount: selectedExercises.length,
      totalSetDuration: { seconds: 0, isEstimate: false },
      clearBuilder: () => builderStore.set([]),
      removeExercise: vi.fn(),
      updateExercise: vi.fn(),
      reorderExercises: vi.fn(),
      setIsChatOpen: vi.fn(),
    };
  },
}));

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: () => ({ currentOrganization: { organizationId: 'org-1' } }),
}));

vi.mock('@apollo/client/react', () => ({
  useMutation: () => [vi.fn()] as const,
}));

vi.mock('@/features/exercise-sets/utils/createSetSubmit', () => ({
  submitCreateTemplateSet: vi.fn(async () => 'set-1'),
}));

vi.mock('./buildBuilderExerciseMapping', () => ({
  buildBuilderExerciseMapping: (exercise: { id: string }) => ({ exerciseId: exercise.id }),
}));

vi.mock('./BuilderExerciseItem', () => ({
  BuilderExerciseItem: ({ exercise }: { exercise: { name: string } }) => <div>{exercise.name}</div>,
}));

vi.mock('@/services/aiService', () => ({ aiService: {} }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPush }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe('ExerciseBuilderFAB', () => {
  beforeEach(() => {
    routerPush.mockReset();
    builderStore.set([{ id: 'ex-1', name: 'Przysiad' }]);
  });

  it('po zapisie z koszyka pokazuje okno „co dalej”, choć koszyk jest już pusty', async () => {
    const user = userEvent.setup();
    render(<ExerciseBuilderFAB />);

    await user.click(screen.getByTestId('exercise-builder-fab'));
    await user.click(await screen.findByTestId('exercise-builder-sheet-create-btn'));
    await user.type(await screen.findByTestId('create-set-name-input'), 'Kolano');
    await user.click(screen.getByTestId('create-set-submit-btn'));

    expect(await screen.findByTestId('set-created-dialog')).toBeInTheDocument();
    expect(builderStore.get()).toEqual([]);
    expect(screen.queryByTestId('exercise-builder-fab')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('set-created-assign-btn'));
    expect(routerPush).toHaveBeenCalledWith('/exercise-sets/set-1?assign=1');
    await waitFor(() => expect(screen.queryByTestId('set-created-dialog')).not.toBeInTheDocument());
  });
});
