import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ExerciseDiscussionCard } from '../ExerciseDiscussionCard';

const state = vi.hoisted(() => ({
  visible: vi.fn(),
  search: vi.fn(),
  appendExchange: vi.fn(),
  markChosen: vi.fn(),
}));
vi.mock('@apollo/client/react', () => ({ useQuery: state.visible }));
vi.mock('@/hooks/useExercisePickerPages', () => ({ useExercisePickerPages: state.search }));
vi.mock('../../ChatSessionContext', () => ({
  useChatActions: () => ({ organizationId: 'org', ...state }),
  useChatBusy: () => false,
}));

const discussion = { topic: 'Ćwiczenie na stopę', search: 'stop', ids: ['hidden', 'foot'] };
const spec = { component: 'CreateExercise' as const, name: 'Ćwiczenie na stopę', discussion };
const entry = { id: 'foot', name: 'Ruch testowy', patientDescription: 'Opis z katalogu gabinetu' };
function show() {
  return render(<ExerciseDiscussionCard spec={spec} discussion={discussion} testId="demo" messageId="m1" />);
}

describe('rozmowa o ćwiczeniu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.visible.mockReturnValue({ data: { firstWindow: [entry] }, loading: false });
    state.search.mockReturnValue({ items: [], loading: false });
  });

  it('omawia wskazany rekord z widocznej biblioteki i nie otwiera zestawu ani formularza', () => {
    show();
    expect(screen.getByText(entry.patientDescription)).toBeInTheDocument();
    expect(screen.queryByText('hidden')).toBeNull();
    expect(state.search).toHaveBeenCalledWith(expect.objectContaining({ organizationId: 'org', skip: true }));
    expect(state.appendExchange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: entry.name }));
    expect(state.appendExchange.mock.calls[0][1].spec.discussion).toMatchObject({ selected: true, ids: ['foot'] });
    expect(screen.queryByRole('button', { name: /zestaw/i })).toBeNull();
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('przeszukuje pełną bibliotekę organizacji, gdy ID modelu są niedostępne', () => {
    state.visible.mockReturnValue({ data: { firstWindow: [] }, loading: false });
    state.search.mockReturnValue({ items: [entry], loading: false });
    show();
    expect(state.search).toHaveBeenCalledWith({
      organizationId: 'org',
      sourceFilter: 'all',
      search: 'stop',
      skip: false,
    });
    expect(screen.getByText(entry.name)).toBeInTheDocument();
  });

  it('rozróżnia błąd od braku dopasowań i otwiera formularz na jawny wybór', () => {
    state.visible.mockReturnValue({ data: {}, loading: false });
    state.search.mockReturnValue({ items: [], error: new Error('offline') });
    show();
    expect(screen.getByText('Nie udało się wczytać katalogu.')).toBeInTheDocument();
    expect(screen.queryByText(/Brak dopasowań/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Utwórz własne ćwiczenie' }));
    expect(state.appendExchange.mock.calls[0][1].spec).toEqual({ component: 'CreateExercise', name: spec.name });
  });
});
