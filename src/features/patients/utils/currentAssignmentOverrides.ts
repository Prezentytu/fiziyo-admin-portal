import type { ApolloClient } from '@apollo/client';

import { GET_ASSIGNMENT_EXERCISE_OVERRIDES_QUERY } from '@/graphql/queries/patientAssignments.queries';

interface AssignmentOverridesData {
  patientAssignmentById?: { id: string; exerciseOverrides?: string | null } | null;
}

/**
 * Dokument `exerciseOverrides` prosto z backendu, z pominięciem cache. Zapis całego dokumentu nakłada swoją zmianę
 * na ten odczyt, więc zmiana innego ćwiczenia zapisana w międzyczasie (inna osoba, inna karta) zostaje (#244).
 * `no-cache`: odpowiedź nie trafia do cache, więc ekran nie przeładowuje się w trakcie zapisu. Brak przypisania to
 * błąd, nie pusty dokument, bo pusty dokument zapisany w jego miejsce skasowałby całą personalizację.
 *
 * Okno między tym odczytem a zapisem zostaje do warunku wersji w backendzie.
 */
export async function fetchCurrentAssignmentOverrides(
  client: Pick<ApolloClient, 'query'>,
  assignmentId: string
): Promise<string | null> {
  const { data } = await client.query<AssignmentOverridesData>({
    query: GET_ASSIGNMENT_EXERCISE_OVERRIDES_QUERY,
    variables: { id: assignmentId },
    fetchPolicy: 'no-cache',
  });
  const assignment = data?.patientAssignmentById;
  if (!assignment) throw new Error('Nie udało się pobrać aktualnej wersji planu pacjenta.');
  return assignment.exerciseOverrides ?? null;
}
