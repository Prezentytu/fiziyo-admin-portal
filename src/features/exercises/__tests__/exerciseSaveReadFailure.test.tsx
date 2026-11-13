import { Suspense } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ApolloClient, ApolloLink, InMemoryCache } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import type { DocumentNode, FragmentDefinitionNode, OperationDefinitionNode, SelectionSetNode } from 'graphql';
import { Observable } from 'rxjs';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ExerciseDetailPage from '@/app/(dashboard)/exercises/[id]/page';
import goldenV33 from '@/components/shared/exercise/__tests__/fixtures/enrichmentV33.fx-0073.json';
import { TooltipProvider } from '@/components/ui/tooltip';
import { GET_EXERCISE_BY_ID_QUERY } from '@/graphql/queries/exercises.queries';

import type { Exercise } from '../ExerciseCard';
import { ExerciseDialog } from '../ExerciseDialog';

/**
 * Odbiór 13.11 (F12). Przed zapisem rekordu 3.3 edytor ćwiczenia pobiera aktualny dokument z bazy. Gdy ten odczyt
 * nie odda rekordu (brak sieci, rekord usunięty w trakcie edycji, odpowiedź bez danych), zapis ma się nie wykonać,
 * a wpisana treść ma zostać na ekranie. Dwie drogi: strona ćwiczenia i okno edycji z listy. Strona, okno, formularz
 * i Apollo są prawdziwe; udawana jest tylko sieć.
 */

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/exercises/exercise-1',
}));
vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt?: string }) => <img src={src} alt={alt ?? ''} />,
}));
vi.mock('@clerk/nextjs', () => ({
  useUser: () => ({ user: { id: 'therapist-1', fullName: 'Ola Fizjoterapeutka' } }),
  useAuth: () => ({ getToken: async () => 'token', isSignedIn: true }),
}));
vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: () => ({ currentOrganization: { organizationId: 'org-1' } }),
}));
vi.mock('@/hooks/useSystemRole', () => ({
  useSystemRole: () => ({ canReviewExercises: false, isSiteSuperAdmin: false, isLoading: false }),
}));
vi.mock('@/hooks/useRoleAccess', () => ({
  useRoleAccess: () => ({ canManageOrganization: false, isLoading: false }),
}));
vi.mock('@/services/aiService', () => ({ aiService: { generateEnrichment: vi.fn(), generateExerciseImage: vi.fn() } }));
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn() }) }));

const EXERCISE_ID = 'exercise-1';
const EASIER_INPUT = 'exercise-detail-easier-input';
const MY_EDIT = 'Łatwiej, wpisane i jeszcze niezapisane.';

type Document = { patient: Record<string, unknown> };

/** How the backend answers the read of the exercise. */
type ReadAnswer = 'record' | 'offline' | 'rootNull' | 'dataNull' | 'empty';

const FAILED_READS: Array<[string, ReadAnswer]> = [
  ['brak sieci', 'offline'],
  ['rekord usunięty albo niedostępny (null w polu głównym)', 'rootNull'],
  ['odpowiedź { data: null } bez błędów', 'dataNull'],
  ['pusta odpowiedź {} bez błędów', 'empty'],
];

function operationOf(query: DocumentNode): OperationDefinitionNode {
  return query.definitions.find((definition) => definition.kind === 'OperationDefinition') as OperationDefinitionNode;
}

/** Every field the operation asks for, set to null, so the cache accepts the answer whatever the selection is. */
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

const RECORD = {
  __typename: 'Exercise',
  id: EXERCISE_ID,
  name: 'Napinanie mięśnia czworogłowego z ręcznikiem pod kolanem',
  type: 'TIME',
  scope: 'ORGANIZATION',
  status: 'DRAFT',
  isActive: true,
};

/** The stored 3.3 record under the root field of an exercise query or mutation. */
function exerciseAnswer(query: DocumentNode, enrichmentData: unknown): Record<string, unknown> {
  const fragments = Object.fromEntries(
    query.definitions
      .filter((definition): definition is FragmentDefinitionNode => definition.kind === 'FragmentDefinition')
      .map((definition) => [definition.name.value, definition])
  );
  const root = operationOf(query).selectionSet.selections[0] as { name: { value: string }; selectionSet: SelectionSetNode };
  const selected = emptySelection(root.selectionSet, fragments);
  const known = Object.fromEntries(Object.entries(RECORD).filter(([key]) => key in selected || key === '__typename'));
  return { [root.name.value]: { ...selected, ...known, enrichmentData: JSON.parse(JSON.stringify(enrichmentData)) } };
}

/**
 * A backend behind the network: it holds the content document of one exercise, answers the read of that exercise
 * as `read` says and stores what the save mutation sends. Every other operation stays pending.
 */
function fakeNetwork() {
  const state = { read: 'record' as ReadAnswer, exerciseReads: 0, mutations: 0, stored: goldenV33 as unknown as Document };
  const exerciseOperation = operationOf(GET_EXERCISE_BY_ID_QUERY).name?.value;
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
          const sent = (operation.variables as { enrichmentDataJson?: string }).enrichmentDataJson;
          if (sent) state.stored = JSON.parse(sent) as Document;
          answer({ data: exerciseAnswer(operation.query, state.stored) });
          return;
        }
        if (operation.operationName !== exerciseOperation) return;
        state.exerciseReads += 1;
        const read = state.read;
        if (read === 'offline') setTimeout(() => subscriber.error(new Error('Failed to fetch')), 5);
        else if (read === 'rootNull') answer({ data: { exerciseById: null } });
        else if (read === 'dataNull') answer({ data: null });
        else if (read === 'empty') answer({});
        else answer({ data: exerciseAnswer(GET_EXERCISE_BY_ID_QUERY, state.stored) });
      })
  );
  return { state, client: new ApolloClient({ cache: new InMemoryCache(), link }) };
}

type Network = ReturnType<typeof fakeNetwork>;

const settle = (ms = 60) =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });

/** Someone else saves another field of the stored document. */
function otherPersonSaves(network: Network) {
  const next = JSON.parse(JSON.stringify(network.state.stored)) as Document;
  next.patient.why = 'Po co, zapisane przez drugą osobę.';
  network.state.stored = next;
}

async function openPage(network: Network) {
  const params = Promise.resolve({ id: EXERCISE_ID });
  await act(async () => {
    render(
      <ApolloProvider client={network.client}>
        <TooltipProvider>
          <Suspense fallback={null}>
            <ExerciseDetailPage params={params} />
          </Suspense>
        </TooltipProvider>
      </ApolloProvider>
    );
    await params;
  });
  fireEvent.click(await screen.findByTestId('exercise-detail-edit-btn', undefined, { timeout: 10_000 }));
  await screen.findByTestId(EASIER_INPUT);
}

async function openDialog(network: Network) {
  const exercise = { ...RECORD, enrichmentData: goldenV33 } as unknown as Exercise;
  render(
    <ApolloProvider client={network.client}>
      <TooltipProvider>
        <ExerciseDialog open onOpenChange={vi.fn()} exercise={exercise} organizationId="org-1" />
      </TooltipProvider>
    </ApolloProvider>
  );
  await screen.findByTestId(EASIER_INPUT, undefined, { timeout: 10_000 });
}

/**
 * `reportsFailedSave`: the page tells the therapist that the save failed. The dialog does not look at the result
 * of the save at all (it reports success and asks its host to close, as on main), so that part is checked only
 * for the page.
 */
const HOSTS: Array<[string, (network: Network) => Promise<void>, string, boolean]> = [
  ['strona ćwiczenia', openPage, 'exercise-detail-save-btn', true],
  ['okno edycji z listy', openDialog, 'exercise-dialog-save-btn', false],
];

beforeEach(() => {
  vi.mocked(toast.error).mockClear();
  vi.mocked(toast.success).mockClear();
});
afterEach(cleanup);

describe.each(HOSTS)('edytor ćwiczenia 3.3, %s: odczyt bez rekordu przed zapisem', (_host, open, saveButton, reportsFailedSave) => {
  it.each(FAILED_READS)('%s: nic nie idzie do bazy, wpisana treść zostaje na ekranie', async (_case, read) => {
    const network = fakeNetwork();
    await open(network);
    // The read of this exercise is in the cache, as after opening it from the list or after an earlier save.
    await network.client.query({ query: GET_EXERCISE_BY_ID_QUERY, variables: { id: EXERCISE_ID } });
    await settle();
    const readsBefore = network.state.exerciseReads;

    // Someone else changes the record; my save must not go out on top of what the cache still remembers.
    otherPersonSaves(network);
    network.state.read = read;
    fireEvent.change(screen.getByTestId(EASIER_INPUT), { target: { value: MY_EDIT } });
    fireEvent.click(screen.getByTestId(saveButton));
    await waitFor(() => expect(network.state.exerciseReads).toBeGreaterThan(readsBefore), { timeout: 8_000 });
    await settle(300);

    expect(network.state.mutations).toBe(0);
    expect(network.state.stored.patient.why).toBe('Po co, zapisane przez drugą osobę.');
    expect(screen.queryByText('Nie znaleziono ćwiczenia')).not.toBeInTheDocument();
    expect(screen.getByTestId(EASIER_INPUT)).toHaveValue(MY_EDIT);
    if (reportsFailedSave) {
      expect(toast.success).not.toHaveBeenCalled();
      expect(vi.mocked(toast.error).mock.calls.map(([message]) => String(message)).join(' ')).toMatch(/zapis/i);
    }
  }, 60_000);

  it('odczyt z rekordem: cudza zmiana zatrzymuje zapis komunikatem, bez cudzej zmiany zapis przechodzi', async () => {
    const network = fakeNetwork();
    await open(network);

    otherPersonSaves(network);
    fireEvent.change(screen.getByTestId(EASIER_INPUT), { target: { value: MY_EDIT } });
    fireEvent.click(screen.getByTestId(saveButton));
    expect(await screen.findByTestId('exercise-save-conflict-notice', undefined, { timeout: 8_000 })).toBeInTheDocument();
    expect(network.state.mutations).toBe(0);
    expect(screen.getByTestId(EASIER_INPUT)).toHaveValue(MY_EDIT);

    fireEvent.click(screen.getByTestId('exercise-save-conflict-load-btn'));
    fireEvent.click(screen.getByTestId(saveButton));
    await waitFor(() => expect(network.state.mutations).toBe(1), { timeout: 8_000 });
    await settle();

    expect(network.state.stored.patient.easier).toBe(MY_EDIT);
    expect(network.state.stored.patient.why).toBe('Po co, zapisane przez drugą osobę.');
  }, 60_000);
});
