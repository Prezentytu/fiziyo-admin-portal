import type { ApolloClient, DocumentNode } from '@apollo/client';

/**
 * Cała widoczna biblioteka gabinetu z `availableExercises`, stronami `skip/take`. API oddaje najwyżej 5000
 * rekordów na wywołanie (bez `take` też), a pula demo, katalog FiziYo i ćwiczenia gabinetu razem to więcej,
 * więc jedno wywołanie cicho gubiło ćwiczenia z końca alfabetu. Strona krótsza niż `pageSize` kończy czytanie.
 * Dokument musi przyjmować `$organizationId`, `$skip`, `$take` i oddawać pole `availableExercises`.
 */
export const WHOLE_LIBRARY_PAGE_SIZE = 2000;
const MAX_PAGES = 100;

export async function fetchWholeLibrary<T extends { id: string }>(
  client: Pick<ApolloClient, 'query'>,
  query: DocumentNode,
  organizationId: string,
  fetchPolicy: 'cache-first' | 'network-only' = 'cache-first',
  pageSize = WHOLE_LIBRARY_PAGE_SIZE
): Promise<T[]> {
  const seen = new Set<string>();
  const all: T[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const { data } = await client.query<{ availableExercises?: T[] }>({
      query,
      variables: { organizationId, skip: page * pageSize, take: pageSize },
      fetchPolicy,
    });
    const items = data?.availableExercises ?? [];
    for (const item of items) {
      // Rekord przesunięty między stronami (ćwiczenie dodane w trakcie czytania) nie dubluje się.
      if (!seen.has(item.id)) {
        seen.add(item.id);
        all.push(item);
      }
    }
    if (items.length < pageSize) break;
  }
  return all;
}
