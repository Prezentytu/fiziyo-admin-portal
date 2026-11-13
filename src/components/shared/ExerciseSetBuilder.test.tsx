import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { ExercisePickerLibraryView } from '@/hooks/useExercisePickerLibrary';

import { ExerciseSetBuilder, type ExerciseSetBuilderProps } from './ExerciseSetBuilder';

vi.mock('next/image', () => ({
  default: ({ alt }: { alt?: string }) => <span aria-label={alt ?? 'exercise-image'} />,
}));

function createLibrary(overrides: Partial<ExercisePickerLibraryView> = {}): ExercisePickerLibraryView {
  return {
    itemIds: [],
    popularIds: [],
    counts: { all: 0, organization: 0, fiziyo: 0 },
    loading: false,
    loadingMore: false,
    remaining: 0,
    loadMore: vi.fn(),
    search: '',
    onSearchChange: vi.fn(),
    sourceFilter: 'all',
    onSourceFilterChange: vi.fn(),
    ...overrides,
  };
}

function createProps(
  overrides: Partial<ExerciseSetBuilderProps> = {},
  libraryOverrides: Partial<ExercisePickerLibraryView> = {}
): ExerciseSetBuilderProps {
  const availableExercises = overrides.availableExercises ?? [];
  return {
    name: 'Plan A',
    onNameChange: vi.fn(),
    selectedInstances: [],
    onSelectedInstancesChange: vi.fn(),
    exerciseParams: new Map(),
    onExerciseParamsChange: vi.fn(),
    availableExercises,
    library: createLibrary({ itemIds: availableExercises.map((exercise) => exercise.id), ...libraryOverrides }),
    showAI: true,
    onAIClick: vi.fn(),
    ...overrides,
  };
}

describe('ExerciseSetBuilder AI button', () => {
  it('wywołuje callback generowania nazwy', async () => {
    const user = userEvent.setup();
    const onAIClick = vi.fn();

    render(<ExerciseSetBuilder {...createProps({ onAIClick })} />);

    await user.click(screen.getByTestId('set-builder-ai-btn'));

    expect(onAIClick).toHaveBeenCalledTimes(1);
  });

  it('nie propaguje click/pointerdown do rodzica', async () => {
    const user = userEvent.setup();
    const onAIClick = vi.fn();
    const onParentClick = vi.fn();
    const onParentPointerDown = vi.fn();

    render(
      <div
        role="button"
        tabIndex={0}
        onKeyDown={() => {}}
        onClick={onParentClick}
        onPointerDown={onParentPointerDown}
      >
        <ExerciseSetBuilder {...createProps({ onAIClick })} />
      </div>
    );

    const aiButton = screen.getByTestId('set-builder-ai-btn');

    fireEvent.pointerDown(aiButton);
    await user.click(aiButton);

    expect(onAIClick).toHaveBeenCalledTimes(1);
    expect(onParentPointerDown).not.toHaveBeenCalled();
    expect(onParentClick).not.toHaveBeenCalled();
  });
});

describe('ExerciseSetBuilder description field', () => {
  it('renderuje pole opisu tylko gdy przekazano onDescriptionChange', () => {
    const { rerender } = render(<ExerciseSetBuilder {...createProps()} />);
    expect(screen.queryByTestId('set-builder-description-input')).not.toBeInTheDocument();

    rerender(
      <ExerciseSetBuilder
        {...createProps({
          description: 'Opis testowy',
          onDescriptionChange: vi.fn(),
        })}
      />
    );
    expect(screen.getByTestId('set-builder-description-input')).toBeInTheDocument();
  });

  it('wywołuje onDescriptionChange po zmianie opisu', async () => {
    const user = userEvent.setup();
    const onDescriptionChange = vi.fn();

    render(
      <ExerciseSetBuilder
        {...createProps({
          description: '',
          onDescriptionChange,
        })}
      />
    );

    const descriptionInput = screen.getByTestId('set-builder-description-input');
    await user.type(descriptionInput, 'Nowy opis');

    expect(onDescriptionChange).toHaveBeenCalled();
  });
});

describe('ExerciseSetBuilder preview semantics', () => {
  it('keeps picker and repeated-instance controls unique under a custom prefix', async () => {
    const user = userEvent.setup();
    const exercise = { id: 'exercise-1', name: 'Mostek', defaultSets: 3, defaultReps: 10 };
    const onPreviewExercise = vi.fn();
    const onSelectedInstancesChange = vi.fn();

    render(
      <ExerciseSetBuilder
        {...createProps({
          testIdPrefix: 'custom-builder',
          availableExercises: [exercise],
          selectedInstances: [
            { instanceId: 'first-instance', exerciseId: exercise.id },
            { instanceId: 'second-instance', exerciseId: exercise.id },
          ],
          onPreviewExercise,
          onSelectedInstancesChange,
          onCreateExercise: vi.fn(),
        }, { popularIds: [exercise.id] })}
      />
    );

    for (const identifier of [
      'custom-builder-picker-exercise-1',
      'custom-builder-preview-exercise-1',
      'custom-builder-add-exercise-1',
      'custom-builder-drag-first-instance',
      'custom-builder-drag-second-instance',
      'custom-builder-clear-btn',
      'assignment-create-exercise-tile-btn',
    ]) {
      expect(screen.getAllByTestId(identifier)).toHaveLength(1);
    }

    await user.click(screen.getByTestId('custom-builder-preview-exercise-1'));
    expect(onPreviewExercise).toHaveBeenCalledWith(exercise);
    expect(onSelectedInstancesChange).not.toHaveBeenCalled();

    await user.click(screen.getByTestId('custom-builder-add-exercise-1'));
    expect(onSelectedInstancesChange).toHaveBeenCalledTimes(1);
    expect(onSelectedInstancesChange.mock.calls[0][0]).toHaveLength(3);
  });

  it('triggers exercise preview from thumbnails', async () => {
    const user = userEvent.setup();
    const onPreviewExercise = vi.fn();
    const paramsMap = new Map([
      [
        'instance-1',
        {
          sets: 4,
          reps: 12,
          duration: 30,
          restSets: 40,
          restReps: 5,
          preparationTime: 10,
          executionTime: 6,
          exerciseSide: 'both',
          notes: 'Oddychaj',
        },
      ],
    ]);

    const exercise = {
      id: 'exercise-1',
      name: 'Mostek',
      imageUrl: '/image-1.jpg',
      defaultSets: 3,
      defaultReps: 10,
    };

    render(
      <ExerciseSetBuilder
        {...createProps({
          availableExercises: [exercise],
          selectedInstances: [{ instanceId: 'instance-1', exerciseId: 'exercise-1' }],
          exerciseParams: paramsMap,
          onPreviewExercise,
        })}
      />
    );

    await user.click(screen.getByTestId('set-builder-exercise-1-thumbnail-btn'));
    expect(onPreviewExercise).toHaveBeenCalledWith(exercise, paramsMap.get('instance-1'));

    await user.click(screen.getByRole('button', { name: 'Podgląd ćwiczenia: Mostek' }));
    expect(onPreviewExercise).toHaveBeenCalledWith(exercise);
  });
});

describe('ExerciseSetBuilder chosen exercise content', () => {
  const selectedInstances = [{ instanceId: 'i1', exerciseId: 'e1' }];

  it('keeps the card read-only until the exercise content is loaded, then allows editing', () => {
    const { rerender } = render(
      <ExerciseSetBuilder
        {...createProps({ selectedInstances, availableExercises: [{ id: 'e1', name: 'Przysiad' }] })}
      />
    );

    expect(screen.getByText('Wczytywanie treści ćwiczenia…')).toBeInTheDocument();

    rerender(
      <ExerciseSetBuilder
        {...createProps({
          selectedInstances,
          availableExercises: [
            { id: 'e1', name: 'Przysiad', enrichmentData: { $schema: 'fiziyo-exercise-v3', patient: { steps: ['Krok'] } } },
          ],
        })}
      />
    );

    expect(screen.queryByText('Wczytywanie treści ćwiczenia…')).not.toBeInTheDocument();
  });

  it('shows the loaded content with the inherited override applied, not a blank draft', async () => {
    const user = userEvent.setup();
    const onPreviewExercise = vi.fn();
    render(
      <ExerciseSetBuilder
        {...createProps({
          selectedInstances,
          exerciseParams: new Map([['i1', { sets: 3, enrichmentOverride: { patient: { cues: ['Wydech'] } } }]]),
          onPreviewExercise,
          availableExercises: [
            {
              id: 'e1',
              name: 'Przysiad',
              enrichmentData: { $schema: 'fiziyo-exercise-v3', patient: { steps: ['Krok'], cues: ['Wdech'] } },
            },
          ],
        })}
      />
    );

    await user.click(screen.getByTestId('set-builder-e1-thumbnail-btn'));

    expect(onPreviewExercise.mock.calls[0]?.[1]?.enrichment).toMatchObject({
      patient: { steps: ['Krok'], cues: ['Wydech'] },
    });
  });
});

describe('ExerciseSetBuilder total duration', () => {
  it('liczy czas zestawu z tych samych parametrów co karta ćwiczenia', () => {
    // Parametry z mappingu szablonu nie niosą executionTime; karta bierze go z ćwiczenia i nagłówek też musi.
    const exercise = {
      id: 'exercise-1',
      name: 'Przysiad',
      type: 'REPS',
      defaultSets: 3,
      defaultReps: 1,
      defaultExecutionTime: 90,
      defaultRestBetweenSets: 60,
      preparationTime: 10,
      tempo: '3010',
      side: 'NONE',
    };

    render(
      <ExerciseSetBuilder
        {...createProps({
          availableExercises: [exercise],
          selectedInstances: [{ instanceId: 'instance-1', exerciseId: exercise.id }],
          exerciseParams: new Map([
            ['instance-1', { sets: 3, reps: 9, restSets: 60, preparationTime: 10, tempo: '3010', exerciseSide: 'NONE' }],
          ]),
        })}
      />
    );

    expect(screen.getByTestId('set-builder-total-duration')).toHaveTextContent('42 min 40 s');
  });
});

describe('ExerciseSetBuilder library from server pages', () => {
  it('lists only exercises of the loaded page and still shows a chosen exercise from outside it', () => {
    const listed = { id: 'listed', name: 'Na stronie' };
    const chosen = { id: 'chosen', name: 'Wybrane wcześniej' };

    render(
      <ExerciseSetBuilder
        {...createProps(
          {
            availableExercises: [listed, chosen],
            selectedInstances: [{ instanceId: 'chosen-instance', exerciseId: chosen.id }],
          },
          { itemIds: [listed.id], remaining: 120 }
        )}
      />
    );

    expect(screen.getByTestId('set-builder-picker-listed')).toBeInTheDocument();
    expect(screen.queryByTestId('set-builder-picker-chosen')).not.toBeInTheDocument();
    expect(screen.getByTestId('set-builder-exercise-chosen')).toBeInTheDocument();
    expect(screen.getByTestId('set-builder-show-more-btn')).toHaveTextContent('120');
  });

  it('offers for adding only what the library lists or confirms as popular, not every known record', () => {
    const listed = { id: 'listed', name: 'Na stronie' };
    const popular = { id: 'popular', name: 'Popularne z biblioteki' };
    const hidden = { id: 'hidden', name: 'Ukryte w bibliotece, obecne w zestawie' };

    render(
      <ExerciseSetBuilder
        {...createProps(
          {
            availableExercises: [listed, popular, hidden],
            selectedInstances: [{ instanceId: 'hidden-instance', exerciseId: hidden.id }],
          },
          { itemIds: [listed.id], popularIds: [popular.id] }
        )}
      />
    );

    expect(screen.getByTestId('set-builder-picker-listed')).toBeInTheDocument();
    expect(screen.getByTestId('set-builder-picker-popular')).toBeInTheDocument();
    expect(screen.queryByTestId('set-builder-picker-hidden')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: `Dodaj ćwiczenie: ${hidden.name}` })).not.toBeInTheDocument();
    expect(screen.getByTestId('set-builder-exercise-hidden')).toBeInTheDocument();
  });

  it('passes search and source tab to the library instead of filtering locally', async () => {
    const user = userEvent.setup();
    const onSearchChange = vi.fn();
    const onSourceFilterChange = vi.fn();

    render(<ExerciseSetBuilder {...createProps({}, { onSearchChange, onSourceFilterChange })} />);

    await user.type(screen.getByTestId('set-builder-search-input'), 'k');
    await user.click(screen.getByTestId('set-builder-filter-fiziyo'));

    expect(onSearchChange).toHaveBeenCalledWith('k');
    expect(onSourceFilterChange).toHaveBeenCalledWith('fiziyo');
  });
});
