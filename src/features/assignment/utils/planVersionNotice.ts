/**
 * Wersja planu pacjenta (FR-008): zmiana planu otwiera nową wersję liczoną od nowa. Gdy pacjent ćwiczył już dziś
 * z poprzedniej wersji, backend ustawia jej start na początek jutra (`planVersionStartsAt` w przyszłości).
 */
export const PLAN_VERSION_EDIT_HINT =
  'Zapis zmian otwiera nową wersję planu: postęp pacjenta liczy się od nowa. Jeśli pacjent ćwiczył już dziś, nowa wersja zacznie się od jutra.';

export const PLAN_VERSION_STARTS_TOMORROW =
  'Pacjent ćwiczył już dziś z poprzedniej wersji planu, więc nowa wersja zacznie się od jutra.';

/** Opis do komunikatu po zapisie: tylko gdy nowa wersja startuje później niż teraz. */
export function planVersionSavedNotice(planVersionStartsAt: string | null | undefined, now: Date): string | null {
  if (!planVersionStartsAt) return null;
  const startsAt = Date.parse(planVersionStartsAt);
  if (Number.isNaN(startsAt)) return null;
  return startsAt > now.getTime() ? PLAN_VERSION_STARTS_TOMORROW : null;
}
