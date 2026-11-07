import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { VerificationWorkspace, type OrganizationDecision } from './VerificationWorkspace';
import type { AdminExercise, OrganizationVerificationStatus } from '@/graphql/types/adminExercise.types';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
}));

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt?: string }) => <img src={src} alt={alt ?? ''} />,
}));

vi.mock('@clerk/nextjs', () => ({
  useUser: () => ({ user: { id: 'owner-1', fullName: 'Ola Owner' } }),
}));

vi.mock('@apollo/client/react', () => ({
  useMutation: () => [vi.fn().mockResolvedValue({ data: {} }), { loading: false }],
  useQuery: () => ({ data: undefined, loading: false, error: undefined, refetch: vi.fn() }),
}));

vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn() }) }));

const exercise = {
  id: 'org-exercise',
  name: 'Mostek biodrowy',
  type: 'REPS',
  isActive: true,
  status: 'DRAFT',
  patientDescription: 'Połóż się na plecach, unieś biodra do linii z udami i powoli opuść je na matę.',
  clinicalDescription: 'Aktywacja mięśni pośladkowych i prostowników.',
  defaultSets: 3,
  defaultReps: 10,
  defaultRestBetweenSets: 60,
  videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  images: ['https://cdn.test/photo-1.jpg'],
  enrichmentData: { $schema: 'fiziyo-exercise-v3', safety: { stop_if: 'Ból w odcinku lędźwiowym' } },
  orgReviewNotes: 'Popraw zdjęcie startowe.',
  adminReviewNotes: 'Uwaga z toru globalnego',
} as AdminExercise;

function renderOrganization(status: OrganizationVerificationStatus, overrides: Partial<OrganizationDecision> = {}) {
  const decision: OrganizationDecision = {
    status,
    isBusy: false,
    onApprove: vi.fn().mockResolvedValue(undefined),
    onRequestChanges: vi.fn().mockResolvedValue(undefined),
    onArchive: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  render(
    <VerificationWorkspace
      exercise={exercise}
      queuePosition={1}
      queueTotal={4}
      nextExerciseId={null}
      listUrl="/organization/verification"
      buildDetailUrl={(exerciseId) => `/organization/verification/${exerciseId}`}
      reloadImages={async () => exercise.images ?? []}
      organizationDecision={decision}
      backTestId="org-verification-back-btn"
    />
  );
  return decision;
}

afterEach(cleanup);

describe('VerificationWorkspace – tor organizacji', () => {
  it('uses the stage workspace with organization decisions instead of the global ones', async () => {
    renderOrganization('PENDING_ORG_REVIEW');

    expect(screen.getByTestId('org-verification-back-btn')).toBeInTheDocument();
    expect(screen.getByText('Popraw zdjęcie startowe.')).toBeInTheDocument();
    expect(screen.queryByText('Uwaga z toru globalnego')).not.toBeInTheDocument();
    expect(screen.queryByTestId('verification-bar-duplicate-btn')).not.toBeInTheDocument();
    expect(screen.queryByTestId('org-verification-archive-btn')).not.toBeInTheDocument();

    await userEvent.setup().click(screen.getByTestId('verification-stage-decision-btn'));
    expect(screen.getByTestId('verification-bar-primary-btn')).toHaveTextContent('Zatwierdź w gabinecie');
  });

  it('sends the exercise back only with a note', async () => {
    const decision = renderOrganization('PENDING_ORG_REVIEW');
    const user = userEvent.setup();

    await user.click(screen.getByTestId('org-verification-bar-request-changes-btn'));
    expect(screen.getByTestId('org-verification-changes-confirm-btn')).toBeDisabled();

    await user.type(screen.getByTestId('org-verification-changes-notes-input'), 'Zdjęcie 2 nie pasuje do kroku 2');
    await user.click(screen.getByTestId('org-verification-changes-confirm-btn'));

    expect(decision.onRequestChanges).toHaveBeenCalledWith('Zdjęcie 2 nie pasuje do kroku 2');
  });

  it('approves through the organization decision once every stage is clean', async () => {
    const decision = renderOrganization('PENDING_ORG_REVIEW');
    const user = userEvent.setup();

    await user.click(screen.getByTestId('verification-stage-decision-btn'));
    const primary = screen.getByTestId('verification-bar-primary-btn');
    expect(primary).toBeEnabled();
    await user.click(primary);

    expect(decision.onApprove).toHaveBeenCalledTimes(1);
  });

  it('hides FiziYo working notes from the clinic owner', () => {
    renderOrganization('PENDING_ORG_REVIEW');

    expect(screen.queryByTestId('exercise-internal-notes-section')).toBeNull();
  });

  it('offers archive for a verified exercise and no review decisions', () => {
    renderOrganization('ORG_VERIFIED');

    expect(screen.getByTestId('org-verification-archive-btn')).toBeInTheDocument();
    expect(screen.queryByTestId('org-verification-bar-request-changes-btn')).not.toBeInTheDocument();
  });
});
