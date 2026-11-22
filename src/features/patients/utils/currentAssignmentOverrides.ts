import type { ApolloClient } from '@apollo/client';
import { CombinedGraphQLErrors } from '@apollo/client/errors';

import { GET_ASSIGNMENT_EXERCISE_OVERRIDES_QUERY } from '@/graphql/queries/patientAssignments.queries';

interface AssignmentOverridesData {
  patientAssignmentById?: {
    id: string;
    exerciseOverrides?: string | null;
    exerciseOverridesVersion?: number | null;
  } | null;
}

/** Dokument nadpisań przypisania i jego wersja z jednego odczytu. */
export interface CurrentAssignmentOverrides {
  json: string | null;
  /** Wersja dokumentu (fizjo-app#509); `undefined`, gdy API jej nie zwraca. */
  version: number | undefined;
}

/**
 * Dokument `exerciseOverrides` prosto z backendu, z pominięciem cache. Zapis całego dokumentu nakłada swoją zmianę
 * na ten odczyt, więc zmiana innego ćwiczenia zapisana w międzyczasie (inna osoba, inna karta) zostaje (#244).
 * `no-cache`: odpowiedź nie trafia do cache, więc ekran nie przeładowuje się w trakcie zapisu. Brak przypisania to
 * błąd, nie pusty dokument, bo pusty dokument zapisany w jego miejsce skasowałby całą personalizację.
 *
 * Okno między tym odczytem a zapisem zamyka wersja: zapis wysyła ją przez `overridesVersionVariables`, a backend
 * odmawia, gdy ktoś zapisał w międzyczasie (fizjo-app#509).
 */
export async function fetchCurrentAssignmentOverrides(
  client: Pick<ApolloClient, 'query'>,
  assignmentId: string
): Promise<CurrentAssignmentOverrides> {
  const { data } = await client.query<AssignmentOverridesData>({
    query: GET_ASSIGNMENT_EXERCISE_OVERRIDES_QUERY,
    variables: { id: assignmentId },
    fetchPolicy: 'no-cache',
  });
  const assignment = data?.patientAssignmentById;
  if (!assignment) throw new Error('Nie udało się pobrać aktualnej wersji planu pacjenta.');
  return {
    json: assignment.exerciseOverrides ?? null,
    version: typeof assignment.exerciseOverridesVersion === 'number' ? assignment.exerciseOverridesVersion : undefined,
  };
}

/** Zmienna wersji do `UPDATE_PATIENT_EXERCISE_OVERRIDES_MUTATION`; bez wersji z odczytu nie wysyła nic. */
export function overridesVersionVariables(
  current: CurrentAssignmentOverrides
): { expectedExerciseOverridesVersion?: number } {
  return current.version === undefined ? {} : { expectedExerciseOverridesVersion: current.version };
}

/** `extensions.code` z `fizjo-app:backend/FizjoApp.Api/Types/TherapistsMutation.cs` (`ExerciseOverridesConflictCode`). */
export const EXERCISE_OVERRIDES_CONFLICT = 'EXERCISE_OVERRIDES_CONFLICT';

/**
 * Komunikat po odmowie zapisu. PROPOZYCJA do decyzji produktu (fizjo-app#509), ten sam sens co w aplikacji mobilnej.
 * Nie obiecuje „nic nie zapisano”: uwaga do pozycji planu idzie osobną mutacją przed nadpisaniami.
 */
export const EXERCISE_OVERRIDES_CONFLICT_MESSAGE =
  'Ktoś zmienił ten plan w międzyczasie, na przykład w aplikacji. Twoje zmiany parametrów nie zostały zapisane, żeby nie skasować tamtej zmiany. Odświeżyliśmy plan: sprawdź go i wprowadź zmiany ponownie.';

/** Backend odmówił zapisu, bo dokument zmienił się od odczytu. Apollo 4 rzuca `CombinedGraphQLErrors`. */
export function isExerciseOverridesConflictError(error: unknown): boolean {
  return (
    CombinedGraphQLErrors.is(error) && error.errors.some((item) => item.extensions?.code === EXERCISE_OVERRIDES_CONFLICT)
  );
}
