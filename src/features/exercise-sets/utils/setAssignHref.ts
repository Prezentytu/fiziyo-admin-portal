/** Parametr adresu szczegółów zestawu, który od razu otwiera kreator przypisania. */
export const ASSIGN_ON_OPEN_PARAM = 'assign';

/** Adres szczegółów zestawu z od razu otwartym przypisaniem pacjentowi. */
export function buildSetAssignHref(setId: string): string {
  return `/exercise-sets/${setId}?${ASSIGN_ON_OPEN_PARAM}=1`;
}

/** Czy adres prosi o otwarcie kreatora przypisania po załadowaniu zestawu. */
export function shouldOpenAssignOnLoad(searchParams: Pick<URLSearchParams, 'get'>): boolean {
  return searchParams.get(ASSIGN_ON_OPEN_PARAM) === '1';
}
