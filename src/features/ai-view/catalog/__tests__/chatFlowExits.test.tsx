import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FLOW_CANCELLED_TEXT } from '../../utils/schedulePlan';
import { ExerciseCreatedCard } from '../ExerciseCreatedCard';
import { ScheduleCard } from '../ScheduleCard';
import { SetSavedCard } from '../SetSavedCard';

const appendExchange = vi.hoisted(() => vi.fn());
const markChosen = vi.hoisted(() => vi.fn());

vi.mock('../../ChatSessionContext', () => ({
  useChatActions: () => ({ appendExchange, markChosen }),
}));
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href} data-testid="mock-link">
      {children}
    </a>
  ),
}));

const DRAFT = {
  name: 'Ból karku · 17.11',
  items: [
    {
      exerciseId: 'e1',
      sets: 2,
      reps: 10,
      duration: 0,
      executionTime: 3,
      restSets: 30,
      restReps: 0,
      preparationTime: 0,
    },
  ],
};

/** Zgłoszenia 17.11: z każdego kroku jest wyjście albo dalsza droga, bez zostawania w miejscu. */
describe('wyjścia z kroków czatu', () => {
  beforeEach(() => {
    appendExchange.mockClear();
    markChosen.mockClear();
  });

  it('„Anuluj” na harmonogramie kończy przepływ: nic nie idzie do podsumowania wysyłki', () => {
    render(<ScheduleCard spec={{ component: 'Schedule', draft: DRAFT }} testId="schedule" messageId="m1" />);

    fireEvent.click(screen.getByRole('button', { name: 'Anuluj' }));

    expect(markChosen).toHaveBeenCalledWith('m1', 'Anuluj');
    expect(appendExchange).toHaveBeenCalledWith('Anuluj', { text: FLOW_CANCELLED_TEXT });
  });

  it('zapisany zestaw da się od razu przypisać pacjentowi, z tym samym szkicem i zestawem źródłowym', () => {
    render(
      <SetSavedCard
        spec={{ component: 'SetSaved', setId: 'set-9', name: DRAFT.name, draft: DRAFT }}
        testId="saved"
        messageId="m2"
      />
    );

    fireEvent.click(screen.getByTestId('saved-assign-btn'));

    expect(appendExchange).toHaveBeenCalledWith(
      `Przypisz: ${DRAFT.name}`,
      expect.objectContaining({ spec: { component: 'PickPatient', draft: { ...DRAFT, sourceSetId: 'set-9' } } })
    );
  });

  it('starsza karta zapisu bez szkicu zostaje z podpowiedzią, bez przycisku przypisania', () => {
    render(
      <SetSavedCard spec={{ component: 'SetSaved', setId: 'set-9', name: 'Stary' }} testId="old" messageId="m3" />
    );

    expect(screen.queryByTestId('old-assign-btn')).toBeNull();
  });

  it.each(['Dodaj do zestawu', 'Gotowe'])('pyta po zapisie i respektuje odpowiedź „%s”', (choice) => {
    render(
      <ExerciseCreatedCard
        spec={{ component: 'ExerciseCreated', exerciseId: 'e1', name: 'Test' }}
        testId="created"
        messageId="m1"
      />
    );
    expect(screen.getByText(/Czy dodać to ćwiczenie do zestawu/)).toBeInTheDocument();
    expect(appendExchange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: choice }));
    if (choice === 'Gotowe') expect(appendExchange.mock.calls[0][1].spec).toBeUndefined();
    else expect(appendExchange.mock.calls[0][1].spec).toMatchObject({ component: 'SetDraft', exerciseIds: ['e1'] });
  });

  it('ćwiczenie utworzone z propozycji zestawu wraca do niej z dawkami pozostałych ćwiczeń', () => {
    render(
      <ExerciseCreatedCard
        spec={{
          component: 'ExerciseCreated',
          exerciseId: 'e-new',
          name: 'Mostek z hantlem',
          addToSet: { exerciseIds: ['e1'], note: 'ból karku', doses: { e1: { sets: 2, reps: 10 } } },
        }}
        testId="created"
        messageId="m4"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Dodaj do zestawu' }));

    expect(appendExchange).toHaveBeenCalledWith(
      'Dodaj do zestawu',
      expect.objectContaining({
        spec: {
          component: 'SetDraft',
          patientId: undefined,
          exerciseIds: ['e1', 'e-new'],
          note: 'ból karku',
          doses: { e1: { sets: 2, reps: 10 } },
          addedExerciseId: 'e-new',
        },
      })
    );
  });
});
