'use client';

import { useEffect, useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import type { DocumentNode } from '@apollo/client';

import { fetchWholeLibrary } from '@/lib/graphql/wholeLibrary';

const NO_ITEMS: never[] = [];

interface WholeLibraryState<T> {
  organizationId: string;
  items: T[];
}

/**
 * Cała biblioteka gabinetu (`fetchWholeLibrary`) dla ekranów, które porównują lokalnie z każdym ćwiczeniem
 * (duplikaty w kreatorze, dopasowanie importu). Czyta ponownie przy każdym przejściu `skip` na false;
 * do czasu odpowiedzi zostaje poprzednia lista tego gabinetu.
 */
export function useWholeLibrary<T extends { id: string }>(
  query: DocumentNode,
  organizationId: string | null | undefined,
  { skip = false, fetchPolicy = 'cache-first' }: { skip?: boolean; fetchPolicy?: 'cache-first' | 'network-only' } = {}
) {
  const client = useApolloClient();
  const [state, setState] = useState<WholeLibraryState<T> | null>(null);

  useEffect(() => {
    if (skip || !organizationId) return;
    let cancelled = false;
    fetchWholeLibrary<T>(client, query, organizationId, fetchPolicy)
      .then((items) => {
        if (!cancelled) setState({ organizationId, items });
      })
      .catch(() => {
        // Błąd strony nie kasuje listy tego gabinetu wczytanej wcześniej.
        if (!cancelled) setState((previous) => (previous?.organizationId === organizationId ? previous : { organizationId, items: [] }));
      });
    return () => {
      cancelled = true;
    };
  }, [client, query, organizationId, skip, fetchPolicy]);

  const current = state?.organizationId === organizationId ? state : null;
  return { items: current?.items ?? (NO_ITEMS as T[]), loading: !skip && !!organizationId && !current };
}
