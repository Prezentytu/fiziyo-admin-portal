import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DocumentNode } from 'graphql';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  UPDATE_EXERCISE_IN_SET_MUTATION,
  UPDATE_PATIENT_EXERCISE_OVERRIDES_MUTATION,
} from '@/graphql/mutations/exercises.mutations';

import { EditExerciseOverrideDialog } from '../EditExerciseOverrideDialog';
import type { ExerciseMapping, PatientAssignment } from '../PatientAssignmentCard';

const calls: string[] = [];
const updateExerciseInSet = vi.fn();
const updateOverrides = vi.fn();
const toastError = vi.fn();
/** Dokument nadpisań w bazie w chwili zapisu; `undefined` = ten sam, co wczytany przy otwarciu okna. */
let serverOverrides: string | null | undefined;
let loadedOverrides: string | null = null;
const queryOverrides = vi.fn(async () => {
  calls.push('read');
  return {
    data: {
      patientAssignmentById: {
        id: 'a-1',
        exerciseOverrides: serverOverrides === undefined ? loadedOverrides : serverOverrides,
      },
    },
  };
});

vi.mock('@apollo/client/react', () => ({
  useMutation: (document: DocumentNode) => {
    if (document === UPDATE_EXERCISE_IN_SET_MUTATION) return [updateExerciseInSet, { loading: false }];
    if (document === UPDATE_PATIENT_EXERCISE_OVERRIDES_MUTATION) return [updateOverrides, { loading: false }];
    throw new Error('Nieoczekiwana mutacja');
  },
  useApolloClient: () => ({ query: queryOverrides }),
}));

vi.mock('@/features/exercises/useExerciseImageGeneration', () => ({
  useExerciseImageGeneration: () => ({
    generateExerciseImage: vi.fn(),
    isGenerating: false,
    imageStyle: 'realistic',
    setImageStyle: vi.fn(),
  }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: (...args: unknown[]) => toastError(...args) },
}));

const mapping: ExerciseMapping = {
  id: 'm-1',
  exerciseId: 'ex-1',
  exerciseSetId: 'set-1',
  sets: 3,
  reps: 10,
  notes: 'Stara uwaga',
  exercise: { id: 'ex-1', name: 'Mostek', type: 'reps' },
} as ExerciseMapping;

const buildAssignment = (kind: 'PATIENT_PLAN' | 'TEMPLATE', exerciseOverrides: string | null): PatientAssignment =>
  ({
    id: 'a-1',
    userId: 'p-1',
    exerciseSetId: 'set-1',
    status: 'active',
    exerciseOverrides,
    exerciseSet: { id: 'set-1', name: 'Plan', kind, exerciseMappings: [mapping] },
  }) as PatientAssignment;

const parsedOverrides = (): Record<string, Record<string, unknown>> =>
  JSON.parse(updateOverrides.mock.calls[0][0].variables.exerciseOverrides as string);

async function editNotesAndSave(assignment: PatientAssignment, override?: Record<string, unknown>) {
  loadedOverrides = assignment.exerciseOverrides ?? null;
  const user = userEvent.setup();
  render(
    <EditExerciseOverrideDialog
      open
      onOpenChange={() => {}}
      assignment={assignment}
      mapping={mapping}
      currentOverride={override}
      patientId="p-1"
    />
  );
  const input = screen.getByTestId('patient-exercise-override-notes-input');
  await user.clear(input);
  await user.type(input, 'Nowa uwaga ');
  await user.click(screen.getByTestId('patient-exercise-override-submit-btn'));
}

describe('EditExerciseOverrideDialog: uwaga do ćwiczenia (S-01 R1)', () => {
  beforeEach(() => {
    calls.length = 0;
    serverOverrides = undefined;
    queryOverrides.mockClear();
    toastError.mockReset();
    updateExerciseInSet.mockReset().mockImplementation(async () => {
      calls.push('mapping');
      return { data: { updateExerciseInSet: { id: 'm-1' } } };
    });
    updateOverrides.mockReset().mockImplementation(async () => {
      calls.push('overrides');
      return { data: {} };
    });
  });

  it('w planie pacjenta zapisuje uwagę w pozycji planu i zdejmuje ją z nadpisania', async () => {
    await editNotesAndSave(buildAssignment('PATIENT_PLAN', '{"m-1":{"notes":"Stara z nadpisania","sets":4}}'), {
      notes: 'Stara z nadpisania',
      sets: 4,
    });

    expect(calls).toEqual(['mapping', 'read', 'overrides']);
    expect(updateExerciseInSet.mock.calls[0][0].variables).toEqual({
      exerciseSetId: 'set-1',
      exerciseId: 'ex-1',
      notes: 'Nowa uwaga',
    });
    expect(parsedOverrides()['m-1']).not.toHaveProperty('notes');
    expect(parsedOverrides()['m-1']).toMatchObject({ sets: 4 });
  });

  it('w szablonie zostaje przy nadpisaniu przypisania', async () => {
    await editNotesAndSave(buildAssignment('TEMPLATE', null));

    expect(updateExerciseInSet).not.toHaveBeenCalled();
    expect(parsedOverrides()['m-1']).toMatchObject({ notes: 'Nowa uwaga ' });
  });

  it('gdy po zapisie uwagi padnie nadpisanie, mówi, że uwaga już jest zapisana', async () => {
    updateOverrides.mockRejectedValueOnce(new Error('network'));

    await editNotesAndSave(buildAssignment('PATIENT_PLAN', null));

    expect(calls).toEqual(['mapping', 'read']);
    expect(toastError).toHaveBeenCalledWith(expect.stringContaining('Uwaga została zapisana'));
  });

  it('zmiana innej pozycji i ukrycie zapisane po otwarciu okna zostają (#244)', async () => {
    serverOverrides = '{"m-1":{"notes":"Stara z nadpisania","sets":4,"hidden":true},"m-2":{"reps":12}}';

    await editNotesAndSave(buildAssignment('PATIENT_PLAN', '{"m-1":{"notes":"Stara z nadpisania","sets":4}}'), {
      notes: 'Stara z nadpisania',
      sets: 4,
    });

    expect(queryOverrides.mock.calls[0]).toMatchObject([{ variables: { id: 'a-1' }, fetchPolicy: 'no-cache' }]);
    expect(parsedOverrides()['m-2']).toEqual({ reps: 12 });
    expect(parsedOverrides()['m-1']).toMatchObject({ sets: 4, hidden: true });
  });
});
