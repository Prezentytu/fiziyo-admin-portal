/** Parametr adresu szczegółów zestawu, który od razu otwiera kreator przypisania. */
export const ASSIGN_ON_OPEN_PARAM = 'assign';

/** Adres szczegółów zestawu z od razu otwartym przypisaniem pacjentowi. */
export function buildSetAssignHref(setId: string): string {
  return `/exercise-sets/${setId}?${ASSIGN_ON_OPEN_PARAM}=1`;
}

/** Adres szczegółów zestawu po otwarciu kreatora: bez `assign`, z pozostałymi parametrami (np. `from`). */
export function buildSetHrefWithoutAssign(setId: string, searchParams: Pick<URLSearchParams, 'toString'>): string {
  const params = new URLSearchParams(searchParams.toString());
  params.delete(ASSIGN_ON_OPEN_PARAM);
  const query = params.toString();
  return query ? `/exercise-sets/${setId}?${query}` : `/exercise-sets/${setId}`;
}

/** Czy adres prosi o otwarcie kreatora przypisania po załadowaniu zestawu. */
export function shouldOpenAssignOnLoad(searchParams: Pick<URLSearchParams, 'get'>): boolean {
  return searchParams.get(ASSIGN_ON_OPEN_PARAM) === '1';
}
