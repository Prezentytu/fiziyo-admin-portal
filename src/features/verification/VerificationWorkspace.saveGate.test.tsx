import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';

import { VerificationWorkspace } from './VerificationWorkspace';
import type { AdminExercise } from '@/graphql/types/adminExercise.types';

/** Odbiór 12.11 (F4): decyzja o rekordzie bez wersji nie rusza po nieudanym zapisie treści. */

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

const MY_EDIT = ' Dopisane przez weryfikatora.';

function variablesOfCalls(): Array<Record<string, unknown>> {
  return mutate.mock.calls.map(([options]) => (options as { variables: Record<string, unknown> }).variables);
}

function isContentSave(variables: Record<string, unknown>): boolean {
  return 'fieldName' in variables || 'patientDescription' in variables || 'description' in variables;
}

function legacyExercise(): AdminExercise {
  return {
    id: 'legacy-1',
    name: 'Mostek biodrowy',
    type: 'REPS',
    isActive: true,
    status: 'PENDING_REVIEW',
    patientDescription: 'Połóż się na plecach, unieś biodra do linii z udami i powoli opuść je na matę.',
    clinicalDescription: 'Aktywacja mięśni pośladkowych i prostowników biodra.',
    defaultSets: 3,
    defaultReps: 10,
    defaultExecutionTime: 3,
    defaultRestBetweenSets: 60,
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    images: ['https://cdn.test/photo-1.jpg'],
    enrichmentData: {
      $schema: 'fiziyo-exercise-v3',
      patient: {
        summary: 'Unoszenie bioder w leżeniu.',
        steps: ['Połóż się na plecach.', 'Unieś biodra.'],
        cues: ['Napnij pośladki.'],
        mistakes: [{ mistake: 'Wyginasz lędźwie.', fix: 'Napnij brzuch.' }],
      },
      safety: { stop_if: 'Ból w odcinku lędźwiowym' },
      therapist: { indications: ['Ból kolana'], contraindications: ['Świeży uraz'] },
      equipment: ['mata'],
    },
  } as unknown as AdminExercise;
}

function renderWorkspace(exercise: AdminExercise) {
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
  vi.mocked(toast.success).mockReset();
});
afterEach(cleanup);

describe('VerificationWorkspace – rekord bez wersji, nieudany zapis treści (F4)', () => {
  it('publikacja nie rusza, gdy zapis treści się nie udał', async () => {
    mutate.mockImplementation(async ({ variables }: { variables: Record<string, unknown> }) => {
      if (isContentSave(variables)) throw new Error('offline');
      return { data: {} };
    });
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderWorkspace(legacyExercise());
    const user = userEvent.setup();

    await editStopIf(user);
    await user.click(screen.getByTestId('verification-stage-decision-btn'));
    expect(screen.getByTestId('verification-bar-primary-btn')).toBeEnabled();
    await user.click(screen.getByTestId('verification-bar-primary-btn'));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(variablesOfCalls().filter(isContentSave).length).toBeGreaterThan(0);
    expect(variablesOfCalls().filter((variables) => 'reviewNotes' in variables)).toEqual([]);
    expect(toast.success).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByTestId('verification-bar-primary-btn')).toBeEnabled();
    errors.mockRestore();
  });

  it('publikacja rusza po udanym zapisie treści, jak dotąd', async () => {
    mutate.mockResolvedValue({ data: {} });
    renderWorkspace(legacyExercise());
    const user = userEvent.setup();

    await editStopIf(user);
    await user.click(screen.getByTestId('verification-stage-decision-btn'));
    await user.click(screen.getByTestId('verification-bar-primary-btn'));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/verification'));
    const calls = variablesOfCalls();
    const approveAt = calls.findIndex((variables) => 'reviewNotes' in variables);
    expect(approveAt).toBeGreaterThan(calls.findIndex(isContentSave));
  });
});
