// Błąd P-4 (lab 15.11.2026): karty czatu gubią ćwiczenia zaproponowane przez model. `/api/chat/dispatch` zwraca
// `spec.exerciseIds` (np. `fiziyo-fx-4031`, `5c77e284f62144a9be9a65359a34b0fb`), a SetDraftCard pokazuje
// „0 ćwiczeń / Zestaw jest pusty”, ExerciseResultsCard tylko te z pierwszej strony katalogu.
// Przyczyna: useExercisePickerLibrary zna tylko rekordy z pierwszej strony (+ popularne); SetDraftCard prosi
// o treść (`detailExerciseIds`) dopiero dla `items`, które są puste, dopóki nie zasiali ich znane rekordy
// (kura i jajko), a seedDraftItems / pickExercisesById po cichu odrzucają nieznane id.
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SetDraftCard } from '../SetDraftCard';
import { ExerciseResultsCard } from '../ExerciseResultsCard';
import { seedDraftItems } from '../../utils/seedDraft';

const mockClientQuery = vi.hoisted(() => vi.fn());
const appendExchange = vi.hoisted(() => vi.fn());

// Pierwsza strona katalogu: same inne ćwiczenia, żadnego z tych, które zaproponował model.
const firstPage = [
  { id: 'ex-page-1', name: 'Przysiad do krzesła', type: 'REPS', defaultSets: 3, defaultReps: 10, updatedAt: 't1' },
  { id: 'ex-page-2', name: 'Most biodrowy', type: 'REPS', defaultSets: 3, defaultReps: 12, updatedAt: 't1' },
];

// Rekordy, które backend zna i oddaje po id (exerciseById), choć nie ma ich na pierwszej stronie.
const byIdRecords: Record<string, Record<string, unknown>> = {
  'fiziyo-fx-4031': {
    id: 'fiziyo-fx-4031',
    name: 'Wspięcia na palce przy ścianie',
    type: 'REPS',
    defaultSets: 2,
    defaultReps: 15,
    updatedAt: 't1',
    enrichmentData: { schemaVersion: '3.3' },
  },
  '5c77e284f62144a9be9a65359a34b0fb': {
    id: '5c77e284f62144a9be9a65359a34b0fb',
    name: 'Unoszenie pięt w siadzie',
    type: 'REPS',
    defaultSets: 2,
    defaultReps: 12,
    updatedAt: 't1',
    enrichmentData: { schemaVersion: '3.3' },
  },
};
const proposedIds = Object.keys(byIdRecords);

vi.mock('@apollo/client/react', () => ({
  useQuery: () => ({
    data: {
      availableExercisesPage: {
        items: firstPage,
        totalCount: 120,
        page: 1,
        hasNextPage: true,
        counts: { all: 120, organization: 0, fiziyo: 120 },
      },
      exerciseTags: [],
    },
    loading: false,
    error: undefined,
    refetch: vi.fn(),
  }),
  useMutation: () => [vi.fn(), { loading: false }],
  useApolloClient: () => ({ query: mockClientQuery }),
}));
vi.mock('../useChatWrites', () => ({
  useSaveTemplateSet: () => ({ saveTemplateSet: vi.fn(), saving: false }),
}));
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }) }));
vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt?: string }) => <img src={src} alt={alt ?? ''} />,
}));
vi.mock('../../ChatSessionContext', () => ({
  useChatActions: () => ({
    organizationId: 'org-1',
    patients: [{ id: 'p1', name: 'Anna' }],
    organizationSets: [],
    setsReady: true,
    appendExchange,
    markChosen: vi.fn(),
    openCreateSet: vi.fn(),
  }),
  toWizardPatient: () => undefined,
}));

function requestedIds(): string[] {
  return mockClientQuery.mock.calls
    .map((call) => (call[0]?.variables as { id?: string; ids?: string[] } | undefined))
    .flatMap((variables) => [variables?.id, ...(variables?.ids ?? [])])
    .filter((id): id is string => typeof id === 'string');
}

describe('karty czatu: ćwiczenia spoza pierwszej strony katalogu (P-4)', () => {
  beforeEach(() => {
    mockClientQuery.mockReset();
    appendExchange.mockReset();
    mockClientQuery.mockImplementation(({ variables }: { variables?: { id?: string; ids?: string[] } }) => {
      const id = variables?.id ?? variables?.ids?.[0];
      const record = id ? byIdRecords[id] : undefined;
      return Promise.resolve({
        data: { exerciseById: record ?? null, firstWindow: record ? [record] : [], secondWindow: [] },
      });
    });
  });

  it('SetDraftCard dociąga po id ćwiczenia z `spec.exerciseIds` i pokazuje je w szkicu', async () => {
    render(
      <SetDraftCard
        spec={{ component: 'SetDraft', patientId: 'p1', exerciseIds: proposedIds } as never}
        testId="draft"
        messageId="m1"
      />
    );

    expect(await screen.findByTestId('draft-item-fiziyo-fx-4031', {}, { timeout: 2000 })).toBeInTheDocument();
    expect(screen.getByTestId('draft-item-5c77e284f62144a9be9a65359a34b0fb')).toBeInTheDocument();
    expect(requestedIds()).toEqual(expect.arrayContaining(proposedIds));
  });

  it('ExerciseResultsCard dociąga po id ćwiczenia z `spec.exerciseIds` i pokazuje wszystkie kafelki', async () => {
    render(
      <ExerciseResultsCard
        spec={{ component: 'ExerciseResults', query: 'łydki', exerciseIds: proposedIds } as never}
        testId="results"
        messageId="m1"
      />
    );

    expect(await screen.findByTestId('results-item-fiziyo-fx-4031', {}, { timeout: 2000 })).toBeInTheDocument();
    expect(screen.getByTestId('results-item-5c77e284f62144a9be9a65359a34b0fb')).toBeInTheDocument();
    expect(requestedIds()).toEqual(expect.arrayContaining(proposedIds));
  });

  it('seedDraftItems nie zasiewa po cichu pustego szkicu, gdy proponowanych id nie ma jeszcze w znanych rekordach', () => {
    const seed = seedDraftItems({
      exerciseIds: proposedIds,
      sets: [],
      setsReady: true,
      exercises: firstPage,
      exercisesReady: true,
    });

    // Poprawnie: albo jeszcze czekamy (null), albo szkic ma pozycje dla każdego proponowanego id.
    if (seed !== null) {
      expect(seed.items.map((item) => item.exerciseId)).toEqual(proposedIds);
    }
  });
});
