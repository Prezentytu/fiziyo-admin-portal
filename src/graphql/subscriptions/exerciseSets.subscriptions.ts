import { gql } from "@apollo/client";

/**
 * GraphQL Subscriptions dla zestawów ćwiczeń
 * Real-time updates przez WebSocket
 *
 * UWAGA: Wszystkie subskrypcje zwracają tylko ID (String).
 * Frontend powinien użyć ID do aktualizacji cache lub pobrania pełnych danych przez query.
 */

/**
 * Subskrypcja na nowo utworzone zestawy ćwiczeń w organizacji
 * Zwraca ID nowego zestawu
 */
export const ON_EXERCISE_SET_CREATED = gql`
  subscription OnExerciseSetCreated($organizationId: String!) {
    onExerciseSetCreated(organizationId: $organizationId)
  }
`;

/**
 * Subskrypcja na zaktualizowane zestawy ćwiczeń w organizacji
 * Zwraca ID zaktualizowanego zestawu
 */
export const ON_EXERCISE_SET_UPDATED = gql`
  subscription OnExerciseSetUpdated($organizationId: String!) {
    onExerciseSetUpdated(organizationId: $organizationId)
  }
`;

/**
 * Subskrypcja na usunięte zestawy ćwiczeń w organizacji
 * Zwraca ID usuniętego zestawu
 */
export const ON_EXERCISE_SET_DELETED = gql`
  subscription OnExerciseSetDeleted($organizationId: String!) {
    onExerciseSetDeleted(organizationId: $organizationId)
  }
`;
