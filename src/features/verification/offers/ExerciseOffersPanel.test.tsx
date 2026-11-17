import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ExerciseOffer } from '@/graphql/types/exerciseOffer.types';

const respondMock = vi.fn();
const refetch = vi.fn();
let offers: ExerciseOffer[] = [];
let canManageOrganization = true;

vi.mock('@apollo/client/react', () => ({
  useQuery: (_query: unknown, options: { skip?: boolean }) => ({
    data: options.skip ? undefined : { exerciseOffers: offers },
    loading: false,
    refetch,
  }),
  useMutation: () => [respondMock, { loading: false }],
}));
vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: () => ({ currentOrganization: { organizationId: 'org-1' } }),
}));
vi.mock('@/hooks/useRoleAccess', () => ({
  useRoleAccess: () => ({ canManageOrganization, isLoading: false }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));
vi.mock('@/components/shared/exercise/ExerciseThumbnail', () => ({ ExerciseThumbnail: () => null }));

import { ExerciseOffersPanel } from './ExerciseOffersPanel';

function offer(id: string, mode: 'ADOPT' | 'REVIEW'): ExerciseOffer {
  return {
    id,
    mode,
    status: 'PENDING',
    offeredAt: '2026-11-17T10:00:00Z',
    exercise: { id: `fx-${id}`, name: `Ćwiczenie ${id}`, images: [] },
  };
}

function lastVariables() {
  return respondMock.mock.calls.at(-1)?.[0]?.variables;
}

describe('ExerciseOffersPanel', () => {
  beforeEach(() => {
    respondMock.mockReset();
    respondMock.mockResolvedValue({ data: { respondToExerciseOffer: { id: 'x', status: 'ACCEPTED' } } });
    refetch.mockReset();
    canManageOrganization = true;
    offers = [offer('a', 'ADOPT'), offer('b', 'ADOPT'), offer('r', 'REVIEW')];
  });

  it('renders nothing for other roles or without offers', () => {
    canManageOrganization = false;
    const { container, rerender } = render(<ExerciseOffersPanel />);
    expect(container).toBeEmptyDOMElement();

    canManageOrganization = true;
    offers = [];
    rerender(<ExerciseOffersPanel />);
    expect(container).toBeEmptyDOMElement();
  });

  it('accepts one offer straight away with the organization id', async () => {
    render(<ExerciseOffersPanel />);

    await userEvent.click(screen.getByTestId('exercise-offer-accept-btn-a'));

    await waitFor(() =>
      expect(lastVariables()).toEqual({ organizationId: 'org-1', offerId: 'a', decision: 'ACCEPT', note: null })
    );
    expect(refetch).toHaveBeenCalled();
  });

  it('does not send a change request without a note', async () => {
    render(<ExerciseOffersPanel />);

    await userEvent.click(screen.getByTestId('exercise-offer-changes-btn-a'));
    await userEvent.click(screen.getByTestId('exercise-offer-note-confirm-btn'));
    expect(screen.getByTestId('exercise-offer-note-error')).toBeInTheDocument();
    expect(respondMock).not.toHaveBeenCalled();

    await userEvent.type(screen.getByTestId('exercise-offer-note-input'), 'Dodaj zdjęcie końcowe');
    await userEvent.click(screen.getByTestId('exercise-offer-note-confirm-btn'));

    await waitFor(() =>
      expect(lastVariables()).toEqual({
        organizationId: 'org-1',
        offerId: 'a',
        decision: 'REQUEST_CHANGES',
        note: 'Dodaj zdjęcie końcowe',
      })
    );
  });

  it('accepts all adopt offers and leaves review offers alone', async () => {
    render(<ExerciseOffersPanel />);

    await userEvent.click(screen.getByTestId('exercise-offers-accept-all-btn'));

    await waitFor(() => expect(respondMock).toHaveBeenCalledTimes(2));
    expect(respondMock.mock.calls.map((call) => call[0].variables.offerId)).toEqual(['a', 'b']);
  });
});
