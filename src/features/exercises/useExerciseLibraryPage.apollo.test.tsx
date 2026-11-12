import type { ReactNode } from 'react';
import { render, renderHook, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import { ApolloClient, ApolloLink, InMemoryCache } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { ServerError } from '@apollo/client/errors';
import { MockLink } from '@apollo/client/testing';
import { GraphQLError, print } from 'graphql';
import { describe, expect, it } from 'vitest';

import { GET_DEMO_EXERCISE_IDS_QUERY } from '@/graphql/queries/demoPool.queries';
import {
  GET_AVAILABLE_EXERCISES_DEMO_PAGE_QUERY,
  GET_AVAILABLE_EXERCISES_PAGE_QUERY,
} from '@/graphql/queries/exercises.queries';
import { GET_ORGANIZATION_DEMO_POOL_QUERY } from '@/graphql/queries/organizations.queries';

import { DemoPoolQueryProvider, ExerciseDemoBadge, useDemoPool } from './demoPool';
import { useExerciseLibraryPage } from './useExerciseLibraryPage';
import type { ExerciseLibraryDemoFilter } from './utils/exerciseLibraryUrlState';

// Prawdziwy klient Apollo: API sprzed fizjo-app#388 (bez pól puli demo) i API z pulą demo.
// MockedProvider dopasowuje zmienne dokładnie, więc zapytanie o zwykłą listę z dodatkową zmienną by nie przeszło.

const ORG = 'org-1';
const listVariables = { organizationId: ORG, tab: 'ALL', search: null, region: null, page: 1, pageSize: 24 };

function pageResult(totalCount: number) {
  return {
    data: {
      availableExercisesPage: {
        __typename: 'AvailableExercisesPage',
        items: [],
        totalCount,
        page: 1,
        pageSize: 24,
        totalPages: 1,
        hasPreviousPage: false,
        hasNextPage: false,
        counts: { __typename: 'ExerciseLibraryCounts', all: 40, organization: 10, fiziyo: 30, needsChanges: 0 },
      },
    },
  };
}

// The list exactly as on main: same document, same variables.
const plainList: MockLink.MockedResponse = {
  request: { query: GET_AVAILABLE_EXERCISES_PAGE_QUERY, variables: listVariables },
  result: pageResult(40),
  maxUsageCount: 5,
};

function demoPool(outcome: Pick<MockLink.MockedResponse, 'result' | 'error'>): MockLink.MockedResponse {
  return { request: { query: GET_ORGANIZATION_DEMO_POOL_QUERY, variables: { id: ORG } }, ...outcome };
}

const poolOn = demoPool({
  result: { data: { organizationById: { __typename: 'Organization', id: ORG, demoPoolEnabled: true } } },
});
const poolOff = demoPool({
  result: { data: { organizationById: { __typename: 'Organization', id: ORG, demoPoolEnabled: false } } },
});

const demoIds: MockLink.MockedResponse = {
  request: { query: GET_DEMO_EXERCISE_IDS_QUERY, variables: { organizationId: ORG } },
  result: {
    data: {
      firstWindow: [
        { __typename: 'Exercise', id: 'ex-demo', availability: 'DEMO' },
        { __typename: 'Exercise', id: 'ex-standard', availability: 'STANDARD' },
      ],
      secondWindow: [{ __typename: 'Exercise', id: 'ex-demo-far', availability: 'DEMO' }],
    },
  },
};

function demoList(outcome: Pick<MockLink.MockedResponse, 'result' | 'error'>): MockLink.MockedResponse {
  return {
    request: { query: GET_AVAILABLE_EXERCISES_DEMO_PAGE_QUERY, variables: { ...listVariables, availability: 'DEMO' } },
    ...outcome,
  };
}

function renderLibrary(mocks: MockLink.MockedResponse[], demo: ExerciseLibraryDemoFilter = 'all') {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MockedProvider mocks={mocks}>
      <DemoPoolQueryProvider organizationId={ORG}>{children}</DemoPoolQueryProvider>
    </MockedProvider>
  );
  return renderHook(
    () =>
      useExerciseLibraryPage({
        organizationId: ORG,
        tab: 'ALL',
        search: null,
        region: null,
        demo,
        page: 1,
        pageSize: 24,
      }),
    { wrapper }
  );
}

describe('biblioteka na API bez puli demo (przed fizjo-app#388)', () => {
  it('zapytanie o zwykłą listę nie niesie niczego z puli demo', () => {
    expect(print(GET_AVAILABLE_EXERCISES_PAGE_QUERY)).not.toMatch(/availability|demoPool/i);
  });

  it.each([
    [
      'błąd walidacji w odpowiedzi',
      {
        result: {
          errors: [new GraphQLError('The field `demoPoolEnabled` does not exist on the type `Organization`.')],
        },
      },
    ],
    ['HTTP 400 bez danych', { error: new Error('Response not successful: Received status code 400') }],
  ])('%s: lista ładuje się jak na main, bez filtra i znaczków', async (_name, outcome) => {
    const { result } = renderLibrary([plainList, demoPool(outcome)]);

    await waitFor(() => expect(result.current.data?.availableExercisesPage.totalCount).toBe(40));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeUndefined();
    expect(result.current.demoFilterAvailable).toBe(false);
    expect(result.current.demoFilter).toBe('all');
    expect(result.current.demoExerciseIds.size).toBe(0);
  });

  it('filtr demo z adresu nie zmienia zapytania o listę', async () => {
    const { result } = renderLibrary(
      [plainList, demoPool({ error: new Error('Response not successful: Received status code 400') })],
      'only'
    );

    await waitFor(() => expect(result.current.data?.availableExercisesPage.totalCount).toBe(40));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeUndefined();
    expect(result.current.demoFilter).toBe('all');
  });
});

function http(status: number): ServerError {
  return new ServerError(`Response not successful: Received status code ${status}`, {
    response: new Response('{}', { status }),
    bodyText: '{}',
  });
}

describe('filtr demo po błędzie listy', () => {
  it('błąd sieci nie chowa filtru: błąd trafia do biblioteki, a filtr zostaje', async () => {
    const { result } = renderLibrary(
      [plainList, poolOn, demoIds, demoList({ error: new TypeError('Failed to fetch') })],
      'only'
    );

    await waitFor(() => expect(result.current.error).toBeDefined());

    expect(result.current.demoFilterAvailable).toBe(true);
    expect(result.current.demoFilter).toBe('only');
  });

  it('po błędzie sieci następne wejście na bibliotekę ponawia zapytanie z filtrem', async () => {
    const failed = renderLibrary([plainList, poolOn, demoIds, demoList({ error: http(503) })], 'only');
    await waitFor(() => expect(failed.result.current.error).toBeDefined());
    failed.unmount();

    const retried = renderLibrary([plainList, poolOn, demoIds, demoList({ result: pageResult(2) })], 'only');
    await waitFor(() => expect(retried.result.current.data?.availableExercisesPage.totalCount).toBe(2));
    expect(retried.result.current.demoFilterAvailable).toBe(true);
  });

  it('błąd walidacji schematu (HTTP 400) chowa filtr i wraca do zwykłej listy', async () => {
    const { result } = renderLibrary([plainList, poolOn, demoIds, demoList({ error: http(400) })], 'only');

    await waitFor(() => expect(result.current.demoFilterAvailable).toBe(false));
    await waitFor(() => expect(result.current.data?.availableExercisesPage.totalCount).toBe(40));
    expect(result.current.error).toBeUndefined();
  });
});

describe('biblioteka na API z pulą demo', () => {
  it('gabinet bez puli demo: zwykła lista, filtr z adresu pominięty, bez pytania o znaczki', async () => {
    const { result } = renderLibrary([plainList, poolOff], 'only');

    await waitFor(() => expect(result.current.data?.availableExercisesPage.totalCount).toBe(40));

    expect(result.current.demoFilterAvailable).toBe(false);
    expect(result.current.demoFilter).toBe('all');
    expect(result.current.demoExerciseIds.size).toBe(0);
  });

  it('gabinet z pulą demo bez filtra: ta sama lista co na main plus identyfikatory demo', async () => {
    const { result } = renderLibrary([plainList, poolOn, demoIds]);

    await waitFor(() => expect(result.current.demoExerciseIds.size).toBe(2));

    expect([...result.current.demoExerciseIds].sort()).toEqual(['ex-demo', 'ex-demo-far']);
    expect(result.current.demoFilterAvailable).toBe(true);
    expect(result.current.data?.availableExercisesPage.totalCount).toBe(40);
  });

  it('gabinet z pulą demo i filtrem „tylko demo”: lista zawężona przez API', async () => {
    const { result } = renderLibrary([plainList, poolOn, demoIds, demoList({ result: pageResult(2) })], 'only');

    await waitFor(() => expect(result.current.data?.availableExercisesPage.totalCount).toBe(2));

    expect(result.current.demoFilter).toBe('only');
    expect(result.current.error).toBeUndefined();
  });

  it('API odrzuca filtr listy: biblioteka wraca do zwykłej listy i chowa filtr', async () => {
    const { result } = renderLibrary(
      [
        plainList,
        poolOn,
        demoIds,
        demoList({ result: { errors: [new GraphQLError('The argument `availability` does not exist.')] } }),
      ],
      'only'
    );

    await waitFor(() => expect(result.current.demoFilterAvailable).toBe(false));
    await waitFor(() => expect(result.current.data?.availableExercisesPage.totalCount).toBe(40));

    expect(result.current.demoFilter).toBe('all');
    expect(result.current.error).toBeUndefined();
  });
});

describe('identyfikatory demo', () => {
  it('zapytanie o identyfikatory jest zawężone po stronie API do rekordów demo', () => {
    const printed = print(GET_DEMO_EXERCISE_IDS_QUERY).replace(/\s+/g, '');
    expect(printed.match(/where:\{availability:\{eq:DEMO\}\}/g)).toHaveLength(2);
  });

  it('gabinet z pulą pobiera identyfikatory dopiero, gdy ekran ich potrzebuje', async () => {
    const operations: string[] = [];
    const recorder = new ApolloLink((operation, forward) => {
      operations.push(operation.operationName ?? '');
      return forward(operation);
    });
    const client = new ApolloClient({
      cache: new InMemoryCache(),
      link: ApolloLink.from([recorder, new MockLink([poolOn, demoIds])]),
    });

    function IdleScreen() {
      const { enabled } = useDemoPool();
      return <span data-testid="pool">{String(enabled)}</span>;
    }

    const { rerender } = render(
      <ApolloProvider client={client}>
        <DemoPoolQueryProvider organizationId={ORG}>
          <IdleScreen />
        </DemoPoolQueryProvider>
      </ApolloProvider>
    );

    await waitFor(() => expect(screen.getByTestId('pool')).toHaveTextContent('true'));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(operations).toEqual(['GetOrganizationDemoPool']);

    rerender(
      <ApolloProvider client={client}>
        <DemoPoolQueryProvider organizationId={ORG}>
          <IdleScreen />
          <ExerciseDemoBadge exerciseId="ex-demo" testId="badge-ex-demo" />
        </DemoPoolQueryProvider>
      </ApolloProvider>
    );

    expect(await screen.findByTestId('badge-ex-demo')).toBeInTheDocument();
    expect(operations).toEqual(['GetOrganizationDemoPool', 'GetDemoExerciseIds']);
  });
});

describe('ExerciseDemoBadge', () => {
  function renderBadges(mocks: MockLink.MockedResponse[]) {
    return render(
      <MockedProvider mocks={mocks}>
        <DemoPoolQueryProvider organizationId={ORG}>
          <span data-testid="row-ready">wiersze</span>
          <ExerciseDemoBadge exerciseId="ex-demo" testId="badge-ex-demo" />
          <ExerciseDemoBadge exerciseId="ex-standard" testId="badge-ex-standard" />
        </DemoPoolQueryProvider>
      </MockedProvider>
    );
  }

  it('oznacza w wybieraku tylko ćwiczenie z puli demo', async () => {
    renderBadges([poolOn, demoIds]);

    expect(await screen.findByTestId('badge-ex-demo')).toHaveTextContent('Demo');
    expect(screen.queryByTestId('badge-ex-standard')).not.toBeInTheDocument();
  });

  it('bez providera puli demo niczego nie rysuje', () => {
    render(<ExerciseDemoBadge exerciseId="ex-demo" testId="badge-ex-demo" />);

    expect(screen.queryByTestId('badge-ex-demo')).not.toBeInTheDocument();
  });

  it('API odrzuca zapytanie o znaczki: wiersze zostają, znaczków nie ma', async () => {
    renderBadges([
      poolOn,
      {
        request: { query: GET_DEMO_EXERCISE_IDS_QUERY, variables: { organizationId: ORG } },
        error: new Error('Response not successful: Received status code 400'),
      },
    ]);

    await waitFor(() => expect(screen.getByTestId('row-ready')).toBeInTheDocument());
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByTestId('badge-ex-demo')).not.toBeInTheDocument();
  });
});
