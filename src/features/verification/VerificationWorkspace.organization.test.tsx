import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { VerificationWorkspace, type OrganizationDecision } from './VerificationWorkspace';
import type { AdminExercise, OrganizationVerificationStatus } from '@/graphql/types/adminExercise.types';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
}));

vi.mock('@/hooks/useRoleAccess', () => ({ useRoleAccess: () => ({ canManageOrganization: false }) }));
vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt?: string }) => <img src={src} alt={alt ?? ''} />,
}));

vi.mock('@clerk/nextjs', () => ({
  useUser: () => ({ user: { id: 'owner-1', fullName: 'Ola Owner' } }),
}));

const apollo = vi.hoisted(() => ({
  mutate: vi.fn(),
  reviewNotes: [] as Array<Record<string, unknown>>,
}));

vi.mock('@apollo/client/react', () => ({
  useMutation: () => [apollo.mutate, { loading: false }],
  useQuery: (query: { definitions?: Array<{ name?: { value?: string } }> }) => {
    const name = query?.definitions?.[0]?.name?.value;
    const data = name === 'GetExerciseReviewNotes' ? { exerciseReviewNotes: apollo.reviewNotes } : undefined;
    return { data, loading: false, error: undefined, refetch: vi.fn() };
  },
}));

function authorNote(overrides: Record<string, unknown> = {}) {
  return {
    id: 'note-1',
    exerciseId: 'org-exercise',
    kind: 'NOTE',
    authorRole: 'REVIEWER',
    authorName: 'Ola Owner',
    isMine: true,
    body: 'Zdjęcie 2 nie pasuje do kroku 2',
    contextKey: 'material',
    contextLabel: 'Materiał',
    replyToNoteId: null,
    createdAt: '2026-11-24T10:00:00Z',
    visibility: 'AUTHOR',
    isSentToAuthor: false,
    canChangeVisibility: true,
    changedFields: [],
    sentNoteCount: null,
    ...overrides,
  };
}

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

afterEach(() => {
  cleanup();
  apollo.mutate.mockReset();
  apollo.mutate.mockResolvedValue({ data: {} });
  apollo.reviewNotes = [];
});

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

  it('keeps „Odeślij do autora” inactive until there is a note for the author', () => {
    apollo.reviewNotes = [authorNote({ visibility: 'ORG_REVIEWERS' })];
    renderOrganization('PENDING_ORG_REVIEW');

    expect(screen.getByTestId('org-verification-bar-request-changes-btn')).toBeDisabled();
    expect(screen.getByTestId('org-verification-bar-request-changes-btn-hint')).toHaveAttribute(
      'title',
      'Dodaj uwagę dla autora w panelu uwag'
    );
  });

  it('sends the author notes back at once, without a dialog', async () => {
    apollo.mutate.mockResolvedValue({ data: {} });
    apollo.reviewNotes = [authorNote()];
    renderOrganization('PENDING_ORG_REVIEW');

    await userEvent.setup().click(screen.getByTestId('org-verification-bar-request-changes-btn'));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(apollo.mutate).toHaveBeenCalledWith({ variables: { exerciseId: 'org-exercise', target: 'AUTHOR' } });
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

  it('has one place for text: the notes log, without working notes or panel actions', () => {
    renderOrganization('PENDING_ORG_REVIEW');

    expect(screen.queryByTestId('exercise-internal-notes-section')).toBeNull();
    expect(screen.getByTestId('review-notes-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('review-notes-send-author-btn')).toBeNull();
    expect(screen.queryByTestId('review-notes-send-internal-btn')).toBeNull();
    expect(screen.queryByTestId('verification-bar-internal-fixes-btn')).toBeNull();
  });

  it('offers archive for a verified exercise and no review decisions', () => {
    renderOrganization('ORG_VERIFIED');

    expect(screen.getByTestId('org-verification-archive-btn')).toBeInTheDocument();
    expect(screen.queryByTestId('org-verification-bar-request-changes-btn')).not.toBeInTheDocument();
  });
});
