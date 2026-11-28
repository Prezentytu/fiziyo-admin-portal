import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ExerciseResultsCard } from '../ExerciseResultsCard';
import { PatientPlanSection } from '../PatientPlanSection';
import { SetDraftCard } from '../SetDraftCard';

const mockState = vi.hoisted(() => ({
  pickerItems: [] as Array<Record<string, unknown>>,
  assignments: [] as Array<Record<string, unknown>>,
  previewProps: null as null | { exercise: { displayName: string; sets: number }; testIdPrefix: string },
}));

vi.mock('@apollo/client/react', () => ({
  useQuery: () => ({
    data: {
      availableExercisesPage: {
        items: mockState.pickerItems,
        totalCount: mockState.pickerItems.length,
        page: 1,
        hasNextPage: false,
        counts: { all: mockState.pickerItems.length, organization: 0, fiziyo: mockState.pickerItems.length },
      },
      exerciseTags: [],
      patientAssignments: mockState.assignments,
      patientWeeklyAdherence: [],
    },
    loading: false,
    error: undefined,
    refetch: vi.fn(),
  }),
  useMutation: () => [vi.fn(), { loading: false }],
  useApolloClient: () => ({
    query: vi.fn().mockResolvedValue({
      data: { exerciseById: { id: 'e1', updatedAt: 't1', enrichmentData: {} } },
    }),
  }),
}));

vi.mock('@/components/shared/exercise/patient-preview/PatientPreviewTab', () => ({
  PatientPreviewTab: ({
    exercise,
    testIdPrefix,
  }: {
    exercise: { displayName: string; sets: number };
    testIdPrefix: string;
  }) => {
    mockState.previewProps = { exercise, testIdPrefix };
    return (
      <div data-testid={`${testIdPrefix}-mock-phone`}>
        {exercise.displayName} · serie:{exercise.sets}
      </div>
    );
  },
}));

vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }) }));
vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt?: string }) => <img src={src} alt={alt ?? ''} />,
}));
vi.mock('../../ChatSessionContext', () => ({
  useChatActions: () => ({
    organizationId: 'org-1',
    patients: [{ id: 'p1', name: 'Anna Nowak' }],
    organizationSets: [],
    setsReady: true,
    appendExchange: vi.fn(),
    markChosen: vi.fn(),
    openCreateSet: vi.fn(),
    reportLiveDraft: vi.fn(),
    restoreDraft: vi.fn(),
  }),
  toWizardPatient: () => undefined,
}));

const EX_1 = {
  id: 'e1',
  name: 'Mostek biodrowy',
  type: 'REPS',
  side: 'NONE',
  defaultSets: 3,
  defaultReps: 10,
  defaultExecutionTime: 3,
  defaultRestBetweenSets: 30,
  defaultRestBetweenReps: 0,
  preparationTime: 5,
  updatedAt: 't1',
};

const EX_2 = {
  ...EX_1,
  id: 'e2',
  name: 'Clamshell bokiem',
  defaultSets: 2,
};

describe('SPEC-070: symulator telefonu „Jak u pacjenta” w kartach czatu', () => {
  beforeEach(() => {
    mockState.pickerItems = [EX_1, EX_2];
    mockState.assignments = [];
    mockState.previewProps = null;
  });

  it('SetDraftCard: po edycji serii na 4 podgląd otwiera się z aktualną wartością sets=4 i działa też na karcie locked', async () => {
    const { unmount } = render(
      <SetDraftCard
        spec={{ component: 'SetDraft', exerciseIds: ['e1', 'e2'] } as never}
        testId="draft"
        messageId="m1"
      />
    );
    await screen.findByTestId('draft-item-e1');

    // Edycja serii z domyślnych 3 na 4 w panelu parametrów (NumberField zatwierdza wartość przy blur).
    fireEvent.click(screen.getByTestId('draft-edit-e1-btn'));
    const setsInput = screen.getByTestId('draft-param-e1-sets-input');
    fireEvent.change(setsInput, { target: { value: '4' } });
    fireEvent.blur(setsInput);

    fireEvent.click(screen.getByTestId('draft-preview-e1-btn'));
    expect(screen.getByTestId('chat-phone-preview-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('chat-phone-preview-mock-phone')).toHaveTextContent('Mostek biodrowy · serie:4');
    expect(screen.getByTestId('chat-phone-preview-counter')).toHaveTextContent('1 / 2');

    // Przejście do kolejnego ćwiczenia w zestawie.
    fireEvent.click(screen.getByTestId('chat-phone-preview-next-btn'));
    expect(screen.getByTestId('chat-phone-preview-counter')).toHaveTextContent('2 / 2');
    expect(screen.getByTestId('chat-phone-preview-mock-phone')).toHaveTextContent('Clamshell bokiem · serie:2');
    unmount();

    // Karta zablokowana (chosen='superseded') nadal pozwala otworzyć podgląd telefonu.
    render(
      <SetDraftCard
        spec={{ component: 'SetDraft', exerciseIds: ['e1'] } as never}
        testId="draft-locked"
        messageId="m2"
        chosen="superseded"
      />
    );
    await screen.findByTestId('draft-locked-item-e1');
    fireEvent.click(screen.getByTestId('draft-locked-preview-e1-btn'));
    expect(screen.getByTestId('chat-phone-preview-dialog')).toBeInTheDocument();
  });

  it('SetDraftCard: przycisk „Podgląd na telefonie” otwiera zestaw od pierwszego ćwiczenia', async () => {
    render(
      <SetDraftCard
        spec={{ component: 'SetDraft', exerciseIds: ['e1', 'e2'] } as never}
        testId="draft"
        messageId="m1"
      />
    );
    await screen.findByTestId('draft-item-e1');
    fireEvent.click(screen.getByTestId('draft-preview-set-btn'));
    expect(screen.getByTestId('chat-phone-preview-title')).toHaveTextContent('Mostek biodrowy');
    expect(screen.getByTestId('chat-phone-preview-counter')).toHaveTextContent('1 / 2');
  });

  it('ExerciseResultsCard: klik ikony telefonu otwiera podgląd bez odznaczania ćwiczenia', () => {
    render(
      <ExerciseResultsCard
        spec={{ component: 'ExerciseResults', query: 'mostek', exerciseIds: ['e1', 'e2'] }}
        testId="results"
        messageId="m3"
      />
    );

    const tile = screen.getByTestId('results-item-e1');
    expect(tile).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByTestId('results-preview-e1-btn'));
    expect(screen.getByTestId('chat-phone-preview-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('chat-phone-preview-mock-phone')).toHaveTextContent('Mostek biodrowy · serie:3');
    // Zaznaczenie kafelka pozostało bez zmian.
    expect(tile).toHaveAttribute('aria-pressed', 'true');
  });

  it('PatientPlanSection: klik ikony telefonu przy ćwiczeniu w planie otwiera podgląd z nadpisaną dawką pacjenta', () => {
    mockState.assignments = [
      {
        id: 'assign-1',
        status: 'ACTIVE',
        exerciseOverrides: JSON.stringify({ 'map-1': { sets: 5 } }),
        exerciseSet: {
          id: 'set-1',
          name: 'Plan biodro',
          exerciseMappings: [
            {
              id: 'map-1',
              exerciseId: 'e1',
              order: 1,
              sets: 3,
              reps: 10,
              exercise: EX_1,
            },
          ],
        },
      },
    ];

    render(<PatientPlanSection patientId="p1" testId="plan" />);
    fireEvent.click(screen.getByTestId('plan-preview-e1-btn'));

    expect(screen.getByTestId('chat-phone-preview-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('chat-phone-preview-mock-phone')).toHaveTextContent('Mostek biodrowy · serie:5');
  });
});
