import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DocumentNode } from 'graphql';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { toast } from 'sonner';

import { UPDATE_PATIENT_EXERCISE_OVERRIDES_MUTATION } from '@/graphql/mutations/exercises.mutations';
import { GET_PATIENT_ASSIGNMENTS_BY_USER_QUERY } from '@/graphql/queries/patientAssignments.queries';

import { PatientAssignmentCard, type PatientAssignment } from '../PatientAssignmentCard';

const updateOverrides = vi.fn();
/** Dokument nadpisań w bazie w chwili zapisu: inna osoba albo karta zmieniła go po otwarciu karty planu. */
let serverOverrides: string | null = null;
let serverVersion = 4;
const query = vi.fn(async () => ({
  data: {
    patientAssignmentById: { id: 'assignment-1', exerciseOverrides: serverOverrides, exerciseOverridesVersion: serverVersion },
  },
}));
const refetchQueries = vi.fn(async () => []);

vi.mock('@apollo/client/react', () => ({
  useMutation: (document: DocumentNode) =>
    document === UPDATE_PATIENT_EXERCISE_OVERRIDES_MUTATION ? [updateOverrides, { loading: false }] : [vi.fn(), { loading: false }],
  useQuery: () => ({ data: undefined, loading: false }),
  useApolloClient: () => ({ query, refetchQueries }),
}));
vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt?: string }) => <img src={src} alt={alt ?? ''} />,
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const buildAssignment = (exerciseOverrides: string | null): PatientAssignment => ({
  id: 'assignment-1',
  userId: 'patient-1',
  exerciseSetId: 'set-1',
  status: 'active',
  startDate: '2026-11-01T00:00:00.000Z',
  endDate: '2026-12-01T00:00:00.000Z',
  exerciseOverrides: exerciseOverrides ?? undefined,
  exerciseSet: {
    id: 'set-1',
    name: 'Plan kolana',
    exerciseMappings: [
      { id: 'm-1', exerciseId: 'e-1', order: 1, sets: 3, reps: 10, exercise: { id: 'e-1', name: 'Przysiad' } },
      { id: 'm-2', exerciseId: 'e-2', order: 2, sets: 3, reps: 10, exercise: { id: 'e-2', name: 'Mostek' } },
      { id: 'm-3', exerciseId: 'e-3', order: 3, sets: 3, reps: 10, exercise: { id: 'e-3', name: 'Wykrok' } },
    ],
  } as PatientAssignment['exerciseSet'],
});

const saved = (call = 0): Record<string, Record<string, unknown>> =>
  JSON.parse(updateOverrides.mock.calls[call][0].variables.exerciseOverrides as string);

describe('PatientAssignmentCard: zapis nadpisań na dokumencie czytanym przed zapisem (#244)', () => {
  beforeEach(() => {
    updateOverrides.mockReset().mockResolvedValue({ data: {} });
    query.mockClear();
    refetchQueries.mockClear();
    vi.mocked(toast.error).mockClear();
    serverVersion = 4;
  });

  it('usunięcie ćwiczenia z planu nie kasuje zmiany innej pozycji zapisanej po otwarciu karty', async () => {
    serverOverrides = '{"m-2":{"sets":5}}';
    const user = userEvent.setup();
    render(<PatientAssignmentCard assignment={buildAssignment(null)} patientId="patient-1" onEditPlan={() => {}} />);

    await user.click(screen.getByText('Plan kolana'));
    await user.click(screen.getByRole('button', { name: 'Usuń z zestawu: Przysiad' }));
    await user.click(screen.getByRole('button', { name: 'Usuń' }));

    expect(query).toHaveBeenCalledWith(expect.objectContaining({ fetchPolicy: 'no-cache' }));
    expect(saved()).toEqual({ 'm-1': { hidden: true }, 'm-2': { sets: 5 } });
  });

  it('„Pokaż wszystkie” odkrywa wszystkie ukryte jednym zapisem i zostawia resztę dokumentu', async () => {
    serverOverrides = '{"m-1":{"hidden":true},"m-2":{"hidden":true,"reps":8},"m-3":{"sets":2}}';
    const user = userEvent.setup();
    render(
      <PatientAssignmentCard
        assignment={buildAssignment('{"m-1":{"hidden":true},"m-2":{"hidden":true}}')}
        patientId="patient-1"
        onEditPlan={() => {}}
      />
    );

    await user.click(screen.getByText('Plan kolana'));
    await user.click(screen.getByRole('button', { name: 'Pokaż wszystkie' }));

    expect(updateOverrides).toHaveBeenCalledTimes(1);
    expect(saved()).toEqual({ 'm-1': { hidden: false }, 'm-2': { hidden: false, reps: 8 }, 'm-3': { sets: 2 } });
  });

  it('zapis wysyła wersję dokumentu z odczytu tuż przed zapisem (fizjo-app#509)', async () => {
    serverOverrides = '{"m-2":{"sets":5}}';
    serverVersion = 9;
    const user = userEvent.setup();
    render(<PatientAssignmentCard assignment={buildAssignment(null)} patientId="patient-1" onEditPlan={() => {}} />);

    await user.click(screen.getByText('Plan kolana'));
    await user.click(screen.getByRole('button', { name: 'Usuń z zestawu: Przysiad' }));
    await user.click(screen.getByRole('button', { name: 'Usuń' }));

    expect(updateOverrides.mock.calls[0][0].variables.expectedExerciseOverridesVersion).toBe(9);
  });

  it('odmowa ze starej wersji pokazuje komunikat konfliktu i odświeża plan, bez ponowienia zapisu', async () => {
    serverOverrides = '{"m-2":{"sets":5}}';
    updateOverrides.mockRejectedValue(
      new CombinedGraphQLErrors({
        errors: [{ message: 'Plan pacjenta zmienił się w międzyczasie.', extensions: { code: 'EXERCISE_OVERRIDES_CONFLICT' } }],
      })
    );
    const onRefresh = vi.fn();
    const user = userEvent.setup();
    render(
      <PatientAssignmentCard
        assignment={buildAssignment(null)}
        patientId="patient-1"
        onEditPlan={() => {}}
        onRefresh={onRefresh}
      />
    );

    await user.click(screen.getByText('Plan kolana'));
    await user.click(screen.getByRole('button', { name: 'Usuń z zestawu: Przysiad' }));
    await user.click(screen.getByRole('button', { name: 'Usuń' }));

    expect(updateOverrides).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Ktoś zmienił ten plan w międzyczasie'));
    expect(refetchQueries).toHaveBeenCalledWith({ include: [GET_PATIENT_ASSIGNMENTS_BY_USER_QUERY] });
    expect(onRefresh).toHaveBeenCalled();
  });
});
