import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ExerciseSetBuilder, type ExerciseSetBuilderProps } from './ExerciseSetBuilder';

vi.mock('next/image', () => ({
  default: ({ alt }: { alt?: string }) => <span aria-label={alt ?? 'exercise-image'} />,
}));

function createProps(overrides: Partial<ExerciseSetBuilderProps> = {}): ExerciseSetBuilderProps {
  return {
    name: 'Plan A',
    onNameChange: vi.fn(),
    selectedInstances: [],
    onSelectedInstancesChange: vi.fn(),
    exerciseParams: new Map(),
    onExerciseParamsChange: vi.fn(),
    availableExercises: [],
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
