import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import goldenV33 from '@/components/shared/exercise/__tests__/fixtures/enrichmentV33.fx-0073.json';
import { VerificationWorkspace } from './VerificationWorkspace';
import type { AdminExercise } from '@/graphql/types/adminExercise.types';
import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';

/**
 * Zapis rekordu 3.3 z centrum weryfikacji nie może skasować zmiany, którą ktoś inny zapisał w trakcie:
 * przed zapisem ekran pobiera aktualny dokument, a przy różnicy nie zapisuje i nie wykonuje decyzji.
 */

const { mutate, push } = vi.hoisted(() => ({ mutate: vi.fn(), push: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
}));
vi.mock('@/hooks/useRoleAccess', () => ({ useRoleAccess: () => ({ canManageOrganization: false }) }));
vi.mock('@/hooks/useSystemRole', () => ({ useSystemRole: () => ({ canReviewExercises: true }) }));
vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt?: string }) => <img src={src} alt={alt ?? ''} />,
}));
vi.mock('@/components/shared/VideoEmbed', () => ({
  VideoEmbed: ({ url }: { url: string }) => <div data-video-url={url} />,
}));
vi.mock('@clerk/nextjs', () => ({
  useUser: () => ({ user: { id: 'reviewer-1', fullName: 'Ola Weryfikator' } }),
}));
vi.mock('@apollo/client/react', () => ({
  useMutation: () => [mutate, { loading: false }],
  useQuery: () => ({ data: undefined, loading: false, error: undefined, refetch: vi.fn() }),
}));
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn() }) }));

const golden = goldenV33 as ExerciseEnrichmentData;
const OTHER_WHY = 'Zdanie zapisane przez drugą osobę w trakcie tej weryfikacji.';
const MY_EDIT = ' Dopisane przez weryfikatora.';

/** Baza „po drugiej stronie”: dokument, który oddaje odczyt przed zapisem, i wszystko, co do niej zapisano. */
function fakeServer(initial: ExerciseEnrichmentData) {
  const state = { document: structuredClone(initial) };
  mutate.mockImplementation(async ({ variables }: { variables: Record<string, unknown> }) => {
    if (variables.fieldName === 'enrichmentData') {
      state.document = JSON.parse(String(variables.value)) as ExerciseEnrichmentData;
    }
    return { data: {} };
  });
  return {
    state,
    fetch: vi.fn(async (): Promise<ExerciseEnrichmentData | null> => structuredClone(state.document)),
  };
}

function variablesOfCalls(): Array<Record<string, unknown>> {
  return mutate.mock.calls.map(([options]) => (options as { variables: Record<string, unknown> }).variables);
}

function enrichmentSaves(): ExerciseEnrichmentData[] {
  return variablesOfCalls()
    .filter((variables) => variables.fieldName === 'enrichmentData')
    .map((variables) => JSON.parse(String(variables.value)) as ExerciseEnrichmentData);
}

function renderWorkspace(
  fetchCurrentEnrichment: () => Promise<ExerciseEnrichmentData | string | null | undefined>,
  enrichmentData: ExerciseEnrichmentData = golden
) {
  const exercise = {
    id: 'fiziyo-kb-fx-0073',
    name: 'Napinanie mięśnia czworogłowego z ręcznikiem pod kolanem',
    type: 'TIME',
    side: 'Both',
    isActive: true,
    status: 'PENDING_REVIEW',
    patientDescription: null,
    clinicalDescription: null,
    defaultSets: 2,
    defaultReps: 10,
    defaultExecutionTime: 7,
    defaultRestBetweenSets: 30,
    defaultRestBetweenReps: 3,
    preparationTime: 10,
    videoUrl: 'https://vimeo.com/1240779405',
    images: ['https://cdn.test/fx-0073-1.jpg', 'https://cdn.test/fx-0073-2.jpg'],
    enrichmentData,
  } as unknown as AdminExercise;
  return render(
    <VerificationWorkspace
      exercise={exercise}
      queuePosition={1}
      queueTotal={7}
      nextExerciseId={null}
      openReports={[]}
      listUrl="/verification"
      buildDetailUrl={(exerciseId) => `/verification/${exerciseId}`}
      reloadImages={async () => exercise.images ?? []}
      fetchCurrentEnrichment={fetchCurrentEnrichment}
    />
  );
}

async function editStopIf(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByTestId('verification-stage-safety-btn'));
  await user.type(screen.getByTestId('verification-safety-stop-if-input'), MY_EDIT);
}

beforeEach(() => {
  mutate.mockReset();
  push.mockReset();
});
afterEach(cleanup);

describe('VerificationWorkspace – rekord v3.3, zmiana zapisana przez kogoś innego', () => {
  it('dwie równoległe edycje: druga nie nadpisuje pierwszej, a po wczytaniu aktualnej wersji zapisuje obie', async () => {
    const server = fakeServer(golden);
    renderWorkspace(server.fetch);
    const user = userEvent.setup();
    // The other person saves while this screen is open.
    server.state.document = { ...golden, patient: { ...golden.patient, why: OTHER_WHY } };

    await editStopIf(user);
    await user.click(screen.getByTestId('verification-skip-btn'));

    await waitFor(() => expect(screen.getByTestId('exercise-save-conflict-notice')).toBeInTheDocument());
    expect(enrichmentSaves()).toEqual([]);
    expect(push).not.toHaveBeenCalled();
    expect(server.state.document.patient?.why).toBe(OTHER_WHY);

    await user.click(screen.getByTestId('exercise-save-conflict-load-btn'));
    expect(screen.queryByTestId('exercise-save-conflict-notice')).not.toBeInTheDocument();
    expect(screen.getByTestId('verification-safety-stop-if-input')).toHaveValue(`${golden.safety?.stop_if}${MY_EDIT}`);

    await user.click(screen.getByTestId('verification-skip-btn'));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/verification'));
    expect(server.state.document).toEqual({
      ...golden,
      patient: { ...golden.patient, why: OTHER_WHY },
      safety: { ...golden.safety, stop_if: `${golden.safety?.stop_if}${MY_EDIT}` },
    });
  });

  it('publikacja nie rusza, gdy zmian nie dało się zapisać z powodu cudzej zmiany', async () => {
    const server = fakeServer(golden);
    renderWorkspace(server.fetch);
    const user = userEvent.setup();
    server.state.document = { ...golden, patient: { ...golden.patient, why: OTHER_WHY } };

    await editStopIf(user);
    await user.click(screen.getByTestId('verification-stage-parameters-btn'));
    await user.click(screen.getByTestId('verification-param-repTime-ack-btn'));
    await user.click(screen.getByTestId('verification-stage-decision-btn'));
    await user.click(screen.getByTestId('verification-bar-primary-btn'));

    await waitFor(() => expect(screen.getByTestId('exercise-save-conflict-notice')).toBeInTheDocument());
    expect(variablesOfCalls().filter((variables) => 'reviewNotes' in variables)).toEqual([]);
    expect(enrichmentSaves()).toEqual([]);
    expect(push).not.toHaveBeenCalled();
    expect(server.state.document.patient?.why).toBe(OTHER_WHY);
  });

  it('bez odczytu aktualnej wersji nie zapisuje i nie przechodzi dalej', async () => {
    fakeServer(golden);
    const fetch = vi.fn().mockRejectedValue(new Error('offline'));
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderWorkspace(fetch);
    const user = userEvent.setup();

    await editStopIf(user);
    await user.click(screen.getByTestId('verification-skip-btn'));

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText('Nie zapisano zmian')).toBeInTheDocument());
    expect(enrichmentSaves()).toEqual([]);
    expect(push).not.toHaveBeenCalled();
    errors.mockRestore();
  });

  it('bez cudzej zmiany zapisuje jak dotąd i przechodzi dalej', async () => {
    const server = fakeServer(golden);
    renderWorkspace(server.fetch);
    const user = userEvent.setup();

    await editStopIf(user);
    await user.click(screen.getByTestId('verification-skip-btn'));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/verification'));
    expect(screen.queryByTestId('exercise-save-conflict-notice')).not.toBeInTheDocument();
    expect(server.state.document).toEqual({
      ...golden,
      safety: { ...golden.safety, stop_if: `${golden.safety?.stop_if}${MY_EDIT}` },
    });
  });
});
