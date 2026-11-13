import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';

import goldenV33 from '@/components/shared/exercise/__tests__/fixtures/enrichmentV33.fx-0073.json';
import { VerificationWorkspace } from './VerificationWorkspace';
import type { AdminExercise } from '@/graphql/types/adminExercise.types';
import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';

/** Odbiór 12.11 (F7): strzałka „Lista ćwiczeń” kończy oczekujący zapis, zanim opuści ekran. */

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
const MY_EDIT = ' Dopisane przez weryfikatora.';

function variablesOfCalls(): Array<Record<string, unknown>> {
  return mutate.mock.calls.map(([options]) => (options as { variables: Record<string, unknown> }).variables);
}

function v33Exercise(): AdminExercise {
  return {
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
    enrichmentData: golden,
  } as unknown as AdminExercise;
}

function renderWorkspace(
  exercise: AdminExercise,
  fetchCurrentEnrichment?: () => Promise<ExerciseEnrichmentData | null>
) {
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
  vi.mocked(toast.error).mockReset();
});
afterEach(cleanup);

describe('VerificationWorkspace – strzałka „Lista ćwiczeń” (F7)', () => {
  it('rekord 3.3: kończy oczekujący zapis, zanim opuści ekran', async () => {
    mutate.mockResolvedValue({ data: {} });
    const fetch = vi.fn(async () => structuredClone(golden));
    renderWorkspace(v33Exercise(), fetch);
    const user = userEvent.setup();

    await editStopIf(user);
    await user.click(screen.getByTestId('verification-back-btn'));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/verification'));
    const saved = variablesOfCalls().filter((variables) => variables.fieldName === 'enrichmentData');
    expect(saved).toHaveLength(1);
    expect((JSON.parse(String(saved[0].value)) as ExerciseEnrichmentData).safety?.stop_if).toBe(
      `${golden.safety?.stop_if}${MY_EDIT}`
    );
  });

  it('rekord 3.3: zostaje na ekranie i mówi dlaczego, gdy zapisu nie dało się dokończyć', async () => {
    mutate.mockResolvedValue({ data: {} });
    const fetch = vi.fn(async () => ({ ...golden, patient: { ...golden.patient, why: 'Cudza zmiana.' } }));
    renderWorkspace(v33Exercise(), fetch);
    const user = userEvent.setup();

    await editStopIf(user);
    await user.click(screen.getByTestId('verification-back-btn'));

    await waitFor(() => expect(screen.getByTestId('exercise-save-conflict-notice')).toBeInTheDocument());
    expect(toast.error).toHaveBeenCalledWith(
      'Ktoś zmienił to ćwiczenie. Wczytaj aktualną wersję, zanim przejdziesz dalej.'
    );
    expect(push).not.toHaveBeenCalled();
  });

  it('bez zmian wychodzi od razu', async () => {
    renderWorkspace(
      v33Exercise(),
      vi.fn(async () => structuredClone(golden))
    );

    await userEvent.setup().click(screen.getByTestId('verification-back-btn'));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/verification'));
    expect(mutate).not.toHaveBeenCalled();
  });
});
