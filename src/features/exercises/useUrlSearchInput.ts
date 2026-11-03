'use client';

import { useCallback, useEffect, useState } from 'react';

export const URL_SEARCH_DEBOUNCE_MS = 300;

/**
 * Search box backed by a URL parameter: typing commits to the URL after a pause, and navigation
 * from outside (sidebar link, back button) replaces the text. A commit of our own that is still
 * on its way to the URL never overwrites newer typing.
 */
export function useUrlSearchInput(committedSearch: string, commit: (search: string) => void) {
  const [input, setInput] = useState(committedSearch);
  const [requestedSearch, setRequestedSearch] = useState(committedSearch);
  const [seenCommittedSearch, setSeenCommittedSearch] = useState(committedSearch);

  if (seenCommittedSearch !== committedSearch) {
    setSeenCommittedSearch(committedSearch);
    if (committedSearch !== requestedSearch) {
      setRequestedSearch(committedSearch);
      setInput(committedSearch);
    }
  }

  useEffect(() => {
    const nextSearch = input.trim();
    if (nextSearch === committedSearch || nextSearch === requestedSearch) return;
    const timer = setTimeout(() => {
      setRequestedSearch(nextSearch);
      commit(nextSearch);
    }, URL_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [commit, committedSearch, input, requestedSearch]);

  const clear = useCallback(() => {
    setInput('');
    setRequestedSearch('');
    commit('');
  }, [commit]);

  return { input, setInput, clear };
}
