import { MockedProvider } from '@apollo/client/testing/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';

import { GET_DUPLICATE_SUBMISSION_NOTICES_QUERY } from '@/graphql/queries/exercises.queries';
import { GET_ORGANIZATION_PATIENTS_QUERY } from '@/graphql/queries/therapists.queries';
import { GET_USER_BY_CLERK_ID_QUERY } from '@/graphql/queries/users.queries';

import { NotificationsBell } from './NotificationsBell';

vi.mock('@clerk/nextjs', () => ({ useUser: () => ({ user: { id: 'clerk-1' } }) }));
vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: () => ({ currentOrganization: { organizationId: 'org-1', role: 'therapist' } }),
}));
vi.mock('@/features/support/useSupport', () => ({ useSupportUnreadCount: () => null }));
vi.mock('@/features/whats-new/useReleaseNotes', () => ({
  useUnseenReleaseNote: () => null,
  useMarkReleaseNoteSeen: () => vi.fn(),
}));
vi.mock('next/link', () => ({
  default: ({ onClick, ...props }: ComponentProps<'a'>) => (
    <a
      data-testid="nav-notifications-test-link"
      {...props}
      onClick={(event) => {
        event.preventDefault();
        onClick?.(event);
      }}
    />
  ),
}));

function renderBell() {
  return render(
    <MockedProvider
      mocks={[
        {
          request: { query: GET_USER_BY_CLERK_ID_QUERY, variables: { clerkId: 'clerk-1' } },
          result: {
            data: {
              userByClerkId: {
                __typename: 'User',
                id: 'submitter-1',
                clerkId: 'clerk-1',
                creationTime: '2026-11-16T12:00:00Z',
                email: 'submitter@example.test',
                fullname: 'Fizjoterapeuta',
                image: null,
                isActive: true,
                organizationIds: ['org-1'],
                username: 'submitter',
                systemRole: null,
                defaultOrganizationId: 'org-1',
                isShadowUser: false,
                hasPassword: true,
                personalData: null,
                contactData: null,
              },
            },
          },
        },
        {
          request: { query: GET_ORGANIZATION_PATIENTS_QUERY, variables: { organizationId: 'org-1', filter: 'all' } },
          result: { data: { organizationPatients: [] } },
        },
        {
          request: {
            query: GET_DUPLICATE_SUBMISSION_NOTICES_QUERY,
            variables: {
              organizationId: 'org-1',
              userId: 'submitter-1',
              notesPrefix: '[POTENTIAL_DUPLICATE] To ćwiczenie jest już w bazie jako „',
            },
          },
          result: {
            data: {
              originals: [{ id: 'org-exercise-1', name: 'Mój przysiad', globalSubmissionId: 'submission-1' }],
              duplicates: [
                {
                  id: 'submission-1',
                  sourceOrganizationExerciseId: 'org-exercise-1',
                  adminReviewNotes: '[POTENTIAL_DUPLICATE] To ćwiczenie jest już w bazie jako „Przysiad przy ścianie” (ID: catalog-1).',
                },
                {
                  id: 'submission-2',
                  sourceOrganizationExerciseId: 'other-org-exercise',
                  adminReviewNotes: '[POTENTIAL_DUPLICATE] To ćwiczenie jest już w bazie jako „Mostek” (ID: catalog-2).',
                },
              ],
            },
          },
        },
      ]}
    >
      <NotificationsBell />
    </MockedProvider>
  );
}

beforeEach(() => window.localStorage.clear());

it('powiadamia zgłaszającego o duplikacie z wybranej organizacji i odsyła do ćwiczenia w gabinecie', async () => {
  const user = userEvent.setup();
  renderBell();

  expect(await screen.findByTestId('nav-notifications-count')).toHaveTextContent('1');
  expect(screen.getByTestId('nav-notifications-btn')).toHaveAccessibleName(/decyzje o zgłoszeniach do FiziYo/);
  await user.click(screen.getByTestId('nav-notifications-btn'));

  const notice = screen.getByTestId('nav-notifications-duplicate-submission-1-link');
  expect(notice).toHaveAttribute('href', '/exercises/org-exercise-1');
  expect(notice).toHaveTextContent('Mój przysiad');
  expect(notice).toHaveTextContent('Wycofano zgłoszenie jako duplikat.');
  expect(notice).toHaveTextContent('To ćwiczenie jest już w katalogu FiziYo jako „Przysiad przy ścianie”.');
  expect(screen.queryByTestId('nav-notifications-duplicate-submission-2-link')).not.toBeInTheDocument();
  expect(await screen.findByTestId('nav-notifications-empty')).toBeInTheDocument();

  await user.click(notice);
  expect(screen.queryByTestId('nav-notifications-count')).not.toBeInTheDocument();
});
