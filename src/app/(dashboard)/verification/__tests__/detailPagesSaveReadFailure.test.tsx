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
 * Odbiór 13.11 (F9, F11). Przed zapisem rekordu 3.3 strona pobiera aktualny dokument z bazy. Gdy ten odczyt nie
 * odda rekordu (brak sieci, rekord usunięty w trakcie edycji, odpowiedź bez danych), fizjoterapeuta ma zostać
 * w obszarze roboczym ze swoją niezapisaną treścią i komunikatem o nieudanym zapisie. Strona i obszar roboczy są prawdziwe, Apollo też; udawana jest tylko sieć.
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

/** What the backend holds: the content document and the photos. */
interface StoredExercise {
  enrichmentData: unknown;
  images: string[];
}

/** Postgres JSONB hands object keys back sorted by length, then bytewise; list order stays. */
function asJsonbReturns<T>(value: T): T {
  if (Array.isArray(value)) return value.map(asJsonbReturns) as T;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort((a, b) => a.length - b.length || (a < b ? -1 : a > b ? 1 : 0));
    return Object.fromEntries(keys.map((key) => [key, asJsonbReturns(record[key])])) as T;
  }
  return value;
}

/** The answer of an exercise query or mutation: the stored 3.3 record under the operation's root field. */
function exerciseAnswer(query: DocumentNode, stored: StoredExercise): Record<string, unknown> {
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
      images: [...stored.images],
      enrichmentData: JSON.parse(JSON.stringify(stored.enrichmentData)),
    },
  };
}

/**
 * How the backend answers the read of the exercise: normally, not at all (no network), with the record gone
 * (`null` under the root field), or with an answer that carries neither data nor errors.
 */
type ReadAnswer = 'record' | 'offline' | 'rootNull' | 'dataNull' | 'empty';

/**
 * A backend behind the network: it holds one exercise, answers its query as `read` says and stores what the
 * save mutations send. Every other operation stays pending.
 */
function fakeNetwork(query: DocumentNode) {
  const state = {
    read: 'record' as ReadAnswer,
    exerciseReads: 0,
    mutations: 0,
    stored: { enrichmentData: asJsonbReturns(goldenV33), images: ['https://cdn.test/fx-0073-1.jpg'] } as StoredExercise,
  };
  const exerciseOperation = operationOf(query).name?.value;
  const rootField = (operationOf(query).selectionSet.selections[0] as { name: { value: string } }).name.value;
  const link = new ApolloLink(
    (operation) =>
      new Observable((subscriber) => {
        const answer = (result: Record<string, unknown>) =>
          setTimeout(() => {
            subscriber.next(result);
            subscriber.complete();
          }, 5);
        if (operationOf(operation.query).operation === 'mutation') {
          state.mutations += 1;
          const { fieldName, value, enrichmentDataJson } = operation.variables as Record<string, string | undefined>;
          const sent = fieldName === 'enrichmentData' ? value : enrichmentDataJson;
          if (!sent) return;
          state.stored = { ...state.stored, enrichmentData: asJsonbReturns(JSON.parse(sent)) };
          answer({ data: exerciseAnswer(operation.query, state.stored) });
          return;
        }
        if (operation.operationName !== exerciseOperation) return;
        state.exerciseReads += 1;
        const read = state.read;
        if (read === 'offline') {
          setTimeout(() => subscriber.error(new Error('Failed to fetch')), 5);
        } else if (read === 'rootNull') {
          answer({ data: { [rootField]: null } });
        } else if (read === 'dataNull') {
          answer({ data: null });
        } else if (read === 'empty') {
          answer({});
        } else {
          answer({ data: exerciseAnswer(query, state.stored) });
        }
      })
  );
  return { state, client: new ApolloClient({ cache: new InMemoryCache(), link }) };
}

const PAGES: Array<[string, DetailPage, DocumentNode]> = [
  ['katalog FiziYo', CatalogVerificationDetailPage, GET_EXERCISE_BY_ID_FOR_ADMIN_QUERY],
  ['gabinet', OrganizationVerificationDetailPage, GET_EXERCISE_BY_ID_FOR_ORG_VERIFICATION_QUERY],
  ['kolejki gabinetów (backoffice)', CrossOrgVerificationDetailPage, GET_EXERCISE_BY_ID_FOR_CROSS_ORG_VERIFICATION_QUERY],
];

const STORED_STOP_IF = (goldenV33 as { safety: { stop_if: string } }).safety.stop_if;
const STOP_IF_INPUT = 'verification-safety-stop-if-input';
// Real page, real typing and a 900 ms autosave per edit: slow by nature, slower when the whole suite runs in parallel.
const OPEN_TIMEOUT_MS = 10_000;
const SAVE_TIMEOUT_MS = 8_000;
const TEST_TIMEOUT_MS = 60_000;

/** Opens the page on the safety stage, where the edited field lives. */
async function openOnSafetyStage(Page: DetailPage, query: DocumentNode) {
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
  await user.click(await screen.findByTestId('verification-stage-safety-btn', undefined, { timeout: OPEN_TIMEOUT_MS }));
  return { network, user };
}

const settle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
  });

const storedStopIf = (stored: StoredExercise) => (stored.enrichmentData as { safety: { stop_if: string } }).safety.stop_if;

beforeEach(() => {
  vi.mocked(toast.error).mockClear();
});
afterEach(cleanup);

describe('strony szczegółu weryfikacji: nieudany odczyt przed zapisem 3.3 nie zabiera szkicu', () => {
  const FAILED_READS: Array<[string, ReadAnswer]> = [
    ['brak sieci', 'offline'],
    ['rekord usunięty albo niedostępny (null w polu głównym)', 'rootNull'],
    ['odpowiedź { data: null } bez błędów', 'dataNull'],
    ['pusta odpowiedź {} bez błędów', 'empty'],
  ];

  describe.each(PAGES)('%s', (_name, Page, query) => {
    it.each(FAILED_READS)('%s: treść zostaje na ekranie, zapis zgłasza błąd, nic nie idzie do bazy', async (_case, read) => {
      const { network, user } = await openOnSafetyStage(Page, query);
      const readsOnOpen = network.state.exerciseReads;

      network.state.read = read;
      await user.type(screen.getByTestId(STOP_IF_INPUT), MY_EDIT);
      // The autosave (900 ms after the last key) reads the stored document first; that read gives no record.
      await waitFor(() => expect(toast.error).toHaveBeenCalled(), { timeout: SAVE_TIMEOUT_MS });
      await settle();

      expect(network.state.exerciseReads).toBeGreaterThan(readsOnOpen);
      expect(screen.queryByText('Nie znaleziono')).not.toBeInTheDocument();
      expect(screen.getByTestId(STOP_IF_INPUT)).toHaveValue(`${STORED_STOP_IF}${MY_EDIT}`);
      expect(vi.mocked(toast.error).mock.calls.map(([message]) => String(message)).join(' ')).toMatch(/zapis/i);
      expect(network.state.mutations).toBe(0);
    }, TEST_TIMEOUT_MS);

    it('po udanym zapisie widok pokazuje stan po zapisie, a cudza zmiana nadal zatrzymuje następny zapis', async () => {
      const { network, user } = await openOnSafetyStage(Page, query);
      const photo = (url: string) => document.querySelector(`img[src="${url}"]`);
      expect(photo('https://cdn.test/fx-0073-1.jpg')).toBeInTheDocument();

      // Someone else swaps the photo while I type; the answer of my save carries the record as it is now.
      network.state.stored = { ...network.state.stored, images: ['https://cdn.test/fx-0073-nowe.jpg'] };
      await user.type(screen.getByTestId(STOP_IF_INPUT), MY_EDIT);
      await waitFor(() => expect(network.state.mutations).toBe(1), { timeout: SAVE_TIMEOUT_MS });
      await settle();

      expect(photo('https://cdn.test/fx-0073-nowe.jpg')).toBeInTheDocument();
      expect(photo('https://cdn.test/fx-0073-1.jpg')).not.toBeInTheDocument();

      expect(storedStopIf(network.state.stored)).toBe(`${STORED_STOP_IF}${MY_EDIT}`.trim());
      expect(screen.getByTestId(STOP_IF_INPUT)).toHaveValue(`${STORED_STOP_IF}${MY_EDIT}`);
      expect(screen.queryByTestId('exercise-save-conflict-notice')).not.toBeInTheDocument();
      expect(toast.error).not.toHaveBeenCalled();

      // No one else touched the record: the next edit saves at once, although the base returned other key order.
      await user.type(screen.getByTestId(STOP_IF_INPUT), ' Drugie zdanie.');
      await waitFor(() => expect(network.state.mutations).toBe(2), { timeout: SAVE_TIMEOUT_MS });
      await settle();
      expect(storedStopIf(network.state.stored)).toBe(`${STORED_STOP_IF}${MY_EDIT} Drugie zdanie.`.trim());
      expect(screen.queryByTestId('exercise-save-conflict-notice')).not.toBeInTheDocument();

      // Someone else saves another field; my next save must stop and keep what I typed.
      const theirs = JSON.parse(JSON.stringify(network.state.stored.enrichmentData)) as { patient: { why: string } };
      theirs.patient.why = 'Po co, zapisane przez drugą osobę.';
      network.state.stored = { ...network.state.stored, enrichmentData: theirs };
      await user.type(screen.getByTestId(STOP_IF_INPUT), ' Trzecie zdanie.');
      expect(await screen.findByTestId('exercise-save-conflict-notice', undefined, { timeout: SAVE_TIMEOUT_MS })).toBeInTheDocument();
      await settle();

      expect(network.state.mutations).toBe(2);
      expect(screen.getByTestId(STOP_IF_INPUT)).toHaveValue(`${STORED_STOP_IF}${MY_EDIT} Drugie zdanie. Trzecie zdanie.`);
      expect((network.state.stored.enrichmentData as { patient: { why: string } }).patient.why).toBe(
        'Po co, zapisane przez drugą osobę.'
      );
    }, TEST_TIMEOUT_MS);
  });
});
