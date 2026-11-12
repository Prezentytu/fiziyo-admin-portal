import { Suspense, type ComponentType } from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApolloClient, ApolloLink, InMemoryCache } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import type { DocumentNode, FragmentDefinitionNode, OperationDefinitionNode, SelectionSetNode } from 'graphql';
import { Observable } from 'rxjs';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import goldenV33 from '@/components/shared/exercise/__tests__/fixtures/enrichmentV33.fx-0073.json';
import {
  GET_EXERCISE_BY_ID_FOR_ADMIN_QUERY,
  GET_EXERCISE_BY_ID_FOR_ORG_VERIFICATION_QUERY,
} from '@/graphql/queries/adminExercises.queries';
import { GET_EXERCISE_BY_ID_FOR_CROSS_ORG_VERIFICATION_QUERY } from '@/graphql/queries/crossOrgVerification.queries';

import CatalogVerificationDetailPage from '../[id]/page';
import CrossOrgVerificationDetailPage from '../organizations/[id]/page';
import OrganizationVerificationDetailPage from '../../organization/verification/[id]/page';

/**
 * Odbiór 13.11 (F9). Przed zapisem rekordu 3.3 strona pobiera aktualny dokument z bazy. Gdy ten odczyt się nie
 * uda (chwilowy brak sieci), fizjoterapeuta ma zostać w obszarze roboczym ze swoją niezapisaną treścią i
 * komunikatem o nieudanym zapisie. Strona i obszar roboczy są prawdziwe, Apollo też; udawana jest tylko sieć.
 */

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt?: string }) => <img src={src} alt={alt ?? ''} />,
}));
vi.mock('@/components/shared/VideoEmbed', () => ({
  VideoEmbed: ({ url }: { url: string }) => <div data-video-url={url} />,
}));
vi.mock('@clerk/nextjs', () => ({
  useUser: () => ({ user: { id: 'reviewer-1', fullName: 'Ola Weryfikator' } }),
}));
vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: () => ({ currentOrganization: { organizationId: 'org-1' } }),
}));
vi.mock('@/hooks/useSystemRole', () => ({
  useSystemRole: () => ({ canReviewExercises: true, isSiteSuperAdmin: true, isLoading: false }),
}));
vi.mock('@/hooks/useRoleAccess', () => ({
  useRoleAccess: () => ({ canManageOrganization: true, isLoading: false }),
}));
vi.mock('@/services/exerciseReportService', () => ({ getExerciseReports: async () => [] }));
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn() }) }));

type DetailPage = ComponentType<{ params: Promise<{ id: string }> }>;

const MY_EDIT = ' Dopisane przez weryfikatora, jeszcze niezapisane.';

function operationOf(query: DocumentNode): OperationDefinitionNode {
  return query.definitions.find((definition) => definition.kind === 'OperationDefinition') as OperationDefinitionNode;
}

/** Every field the query asks for, set to null, so the cache accepts the answer whatever the selection is. */
function emptySelection(
  selection: SelectionSetNode,
  fragments: Record<string, FragmentDefinitionNode>,
  out: Record<string, unknown> = {}
): Record<string, unknown> {
  for (const node of selection.selections) {
    if (node.kind === 'Field') out[node.alias?.value ?? node.name.value] = null;
    else if (node.kind === 'FragmentSpread') emptySelection(fragments[node.name.value].selectionSet, fragments, out);
    else emptySelection(node.selectionSet, fragments, out);
  }
  return out;
}

/** The answer of the exercise query: the golden 3.3 record under the query's root field. */
function exerciseAnswer(query: DocumentNode): Record<string, unknown> {
  const fragments = Object.fromEntries(
    query.definitions
      .filter((definition): definition is FragmentDefinitionNode => definition.kind === 'FragmentDefinition')
      .map((definition) => [definition.name.value, definition])
  );
  const root = operationOf(query).selectionSet.selections[0] as { name: { value: string }; selectionSet: SelectionSetNode };
  return {
    [root.name.value]: {
      ...emptySelection(root.selectionSet, fragments),
      __typename: 'Exercise',
      id: 'exercise-1',
      name: 'Napinanie mięśnia czworogłowego z ręcznikiem pod kolanem',
      type: 'TIME',
      side: 'Both',
      isActive: true,
      status: 'PENDING_REVIEW',
      defaultSets: 2,
      defaultReps: 10,
      defaultExecutionTime: 7,
      defaultRestBetweenSets: 30,
      defaultRestBetweenReps: 3,
      preparationTime: 10,
      videoUrl: 'https://vimeo.com/1240779405',
      images: ['https://cdn.test/fx-0073-1.jpg'],
      enrichmentData: goldenV33,
    },
  };
}

/** A network that answers the exercise query while `online`; every other operation stays pending. */
function fakeNetwork(query: DocumentNode) {
  const state = { online: true, exerciseReads: 0, mutations: 0 };
  const exerciseOperation = operationOf(query).name?.value;
  const link = new ApolloLink(
    (operation) =>
      new Observable((subscriber) => {
        if (operationOf(operation.query).operation === 'mutation') state.mutations += 1;
        if (operation.operationName !== exerciseOperation) return;
        state.exerciseReads += 1;
        const online = state.online;
        setTimeout(() => {
          if (!online) return subscriber.error(new Error('Failed to fetch'));
          subscriber.next({ data: exerciseAnswer(query) });
          subscriber.complete();
        }, 5);
      })
  );
  return { state, client: new ApolloClient({ cache: new InMemoryCache(), link }) };
}

beforeEach(() => {
  vi.mocked(toast.error).mockClear();
});
afterEach(cleanup);

describe('strony szczegółu weryfikacji: nieudany odczyt przed zapisem 3.3 nie zabiera szkicu', () => {
  it.each<[string, DetailPage, DocumentNode]>([
    ['katalog FiziYo', CatalogVerificationDetailPage, GET_EXERCISE_BY_ID_FOR_ADMIN_QUERY],
    ['gabinet', OrganizationVerificationDetailPage, GET_EXERCISE_BY_ID_FOR_ORG_VERIFICATION_QUERY],
    ['kolejki gabinetów (backoffice)', CrossOrgVerificationDetailPage, GET_EXERCISE_BY_ID_FOR_CROSS_ORG_VERIFICATION_QUERY],
  ])('%s: treść zostaje na ekranie, zapis zgłasza błąd, nic nie idzie do bazy', async (_name, Page, query) => {
    const network = fakeNetwork(query);
    const params = Promise.resolve({ id: 'exercise-1' });
    await act(async () => {
      render(
        <ApolloProvider client={network.client}>
          <Suspense fallback={null}>
            <Page params={params} />
          </Suspense>
        </ApolloProvider>
      );
      await params;
    });
    const user = userEvent.setup();
    await user.click(await screen.findByTestId('verification-stage-safety-btn'));
    const readsOnOpen = network.state.exerciseReads;

    network.state.online = false;
    await user.type(screen.getByTestId('verification-safety-stop-if-input'), MY_EDIT);
    // The autosave (900 ms after the last key) reads the stored document first; that read fails.
    await waitFor(() => expect(toast.error).toHaveBeenCalled(), { timeout: 4000 });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(network.state.exerciseReads).toBeGreaterThan(readsOnOpen);
    expect(screen.queryByText('Nie znaleziono')).not.toBeInTheDocument();
    expect(screen.getByTestId('verification-safety-stop-if-input')).toHaveValue(
      `${(goldenV33 as { safety: { stop_if: string } }).safety.stop_if}${MY_EDIT}`
    );
    expect(vi.mocked(toast.error).mock.calls.map(([message]) => String(message)).join(' ')).toMatch(/zapis/i);
    expect(network.state.mutations).toBe(0);
  });
});
