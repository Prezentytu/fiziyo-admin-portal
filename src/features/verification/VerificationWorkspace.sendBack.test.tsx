import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { VerificationWorkspace, type OrganizationDecision } from './VerificationWorkspace';
import { ORG_VERIFICATION_REFETCH_QUERIES } from '@/hooks/useOrganizationVerificationRealtime';
import type { AdminExercise, ContentStatus } from '@/graphql/types/adminExercise.types';

/** „Odeślij do autora” w pasku decyzji: ta sama straż co backend i odświeżenie kolejki, z której przyszło ćwiczenie. */

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
}));
vi.mock('@/hooks/useRoleAccess', () => ({ useRoleAccess: () => ({ canManageOrganization: false }) }));
vi.mock('@/hooks/useSystemRole', () => ({ useSystemRole: () => ({ canReviewExercises: true }) }));
vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt?: string }) => <img src={src} alt={alt ?? ''} />,
}));
vi.mock('@clerk/nextjs', () => ({
  useUser: () => ({ user: { id: 'reviewer-1', fullName: 'Ola Weryfikator' } }),
}));

type Doc = { definitions?: Array<{ name?: { value?: string } }> };
const docName = (doc: Doc) => doc?.definitions?.[0]?.name?.value;

const apollo = vi.hoisted(() => ({
  mutationOptions: new Map<string | undefined, Record<string, unknown> | undefined>(),
}));

const UNSENT_AUTHOR_NOTE = {
  id: 'note-1',
  exerciseId: 'ex-1',
  kind: 'NOTE',
  authorRole: 'REVIEWER',
  authorName: 'Ola Weryfikator',
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
};

vi.mock('@apollo/client/react', () => ({
  useMutation: (mutation: Doc, options?: Record<string, unknown>) => {
    apollo.mutationOptions.set(docName(mutation), options);
    return [vi.fn().mockResolvedValue({ data: {} }), { loading: false }];
  },
  useQuery: (query: Doc) => {
    const data = docName(query) === 'GetExerciseReviewNotes' ? { exerciseReviewNotes: [UNSENT_AUTHOR_NOTE] } : undefined;
    return { data, loading: false, error: undefined, refetch: vi.fn() };
  },
}));
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn() }) }));

function exerciseWith(status: ContentStatus): AdminExercise {
  return {
    id: 'ex-1',
    name: 'Mostek biodrowy',
    type: 'REPS',
    isActive: true,
    status,
    patientDescription: 'Połóż się na plecach, unieś biodra do linii z udami i powoli opuść je na matę.',
    defaultSets: 3,
    defaultReps: 10,
    images: ['https://cdn.test/photo-1.jpg'],
  } as AdminExercise;
}

function renderWorkspace(exercise: AdminExercise, organizationDecision?: OrganizationDecision) {
  render(
    <VerificationWorkspace
      exercise={exercise}
      queuePosition={1}
      queueTotal={4}
      nextExerciseId={null}
      openReports={[]}
      listUrl="/verification"
      buildDetailUrl={(exerciseId) => `/verification/${exerciseId}`}
      reloadImages={async () => exercise.images ?? []}
      organizationDecision={organizationDecision}
    />
  );
}

afterEach(() => {
  cleanup();
  apollo.mutationOptions.clear();
});

describe('VerificationWorkspace – „Odeślij do autora”', () => {
  it('w katalogu odsyła ćwiczenie czekające na weryfikację', () => {
    renderWorkspace(exerciseWith('PENDING_REVIEW'));

    expect(screen.getByTestId('verification-bar-send-author-btn')).toBeEnabled();
  });

  it.each<ContentStatus>(['CHANGES_REQUESTED', 'DRAFT', 'APPROVED', 'UPDATE_PENDING'])(
    'w katalogu nie odsyła ćwiczenia ze statusem %s i mówi dlaczego',
    (status) => {
      renderWorkspace(exerciseWith(status));

      expect(screen.getByTestId('verification-bar-send-author-btn')).toBeDisabled();
      expect(screen.getByTestId('verification-bar-send-author-btn-hint')).toHaveAttribute(
        'title',
        'Do autora wraca tylko ćwiczenie czekające na weryfikację'
      );
    }
  );

  it('w organizacji po odesłaniu odświeża statystyki i kolejkę organizacji', () => {
    renderWorkspace(exerciseWith('DRAFT'), {
      status: 'PENDING_ORG_REVIEW',
      isBusy: false,
      onApprove: vi.fn(),
      onArchive: vi.fn(),
    });

    const refetchQueries = apollo.mutationOptions.get('SendExerciseReviewNotes')?.refetchQueries;
    expect(refetchQueries).toEqual(expect.arrayContaining([...ORG_VERIFICATION_REFETCH_QUERIES]));
  });

  it('w katalogu nie odświeża zapytań organizacji', () => {
    renderWorkspace(exerciseWith('PENDING_REVIEW'));

    const refetchQueries = apollo.mutationOptions.get('SendExerciseReviewNotes')?.refetchQueries as unknown[];
    for (const query of ORG_VERIFICATION_REFETCH_QUERIES) expect(refetchQueries).not.toContain(query);
  });
});
