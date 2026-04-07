import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AddExerciseToSetDialog } from './AddExerciseToSetDialog';

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt?: string }) => <img src={src} alt={alt ?? ''} />,
}));

const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();
vi.mock('@apollo/client/react', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: () => [mockUseMutation(), { loading: false }],
}));

describe('AddExerciseToSetDialog', () => {
  beforeEach(() => {
    mockUseQuery.mockReturnValue({
      data: {
        availableExercises: [],
        exerciseTags: [],
        tagsByOrganizationId: [],
        exerciseSets: [],
        exerciseSetById: { exerciseMappings: [] },
      },
      loading: false,
    });
    mockUseMutation.mockReturnValue(vi.fn().mockResolvedValue({}));
  });

  it('renders dialog when open with title and builder area', () => {
    render(
      <AddExerciseToSetDialog
        open
        onOpenChange={() => {}}
        exerciseSetId="set-1"
        organizationId="org-1"
      />
    );

    expect(screen.getByTestId('set-add-exercise-dialog')).toBeInTheDocument();
    expect(screen.getAllByText('Dodaj ćwiczenia do zestawu').length).toBeGreaterThan(0);
    expect(screen.getByTestId('set-add-exercise-cancel-btn')).toBeInTheDocument();
    expect(screen.getByTestId('set-add-exercise-submit-btn')).toBeInTheDocument();
  });

  it('submit button is disabled when no exercises selected', () => {
    render(
      <AddExerciseToSetDialog
        open
        onOpenChange={() => {}}
        exerciseSetId="set-1"
        organizationId="org-1"
      />
    );

    const submitBtn = screen.getByTestId('set-add-exercise-submit-btn');
    expect(submitBtn).toBeDisabled();
  });

  it('calls onOpenChange when cancel is clicked', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <AddExerciseToSetDialog
        open
        onOpenChange={onOpenChange}
        exerciseSetId="set-1"
        organizationId="org-1"
      />
    );

    await user.click(screen.getByTestId('set-add-exercise-cancel-btn'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('does not render dialog when closed', () => {
    render(
      <AddExerciseToSetDialog
        open={false}
        onOpenChange={() => {}}
        exerciseSetId="set-1"
        organizationId="org-1"
      />
    );

    expect(screen.queryByTestId('set-add-exercise-dialog')).not.toBeInTheDocument();
  });

  it('opens unified exercise preview when thumbnail is clicked', async () => {
    const user = userEvent.setup();

    mockUseQuery.mockReturnValue({
      data: {
        availableExercises: [
          {
            id: 'exercise-1',
            name: 'Mostek',
            imageUrl: '/image-1.jpg',
            images: ['/image-1.jpg', '/image-2.jpg'],
            defaultSets: 3,
            defaultReps: 10,
            scope: 'ORGANIZATION',
          },
        ],
        exerciseTags: [],
        tagsByOrganizationId: [],
        exerciseSets: [],
        exerciseSetById: { exerciseMappings: [] },
      },
      loading: false,
    });

    render(
      <AddExerciseToSetDialog
        open
        onOpenChange={() => {}}
        exerciseSetId="set-1"
        organizationId="org-1"
      />
    );

    await user.click(screen.getByRole('button', { name: 'Podgląd ćwiczenia: Mostek' }));

    expect(screen.getByTestId('set-add-exercise-preview-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('set-add-exercise-preview-params')).toBeInTheDocument();
  });
});
