import { gql } from "@apollo/client";

/**
 * GraphQL Subscriptions dla ćwiczeń
 * Real-time updates przez WebSocket
 *
 * UWAGA: Wszystkie subskrypcje zwracają tylko ID (String).
 * Frontend powinien użyć ID do aktualizacji cache lub pobrania pełnych danych przez query.
 */

/**
 * Subskrypcja na nowo utworzone ćwiczenia w organizacji
 * Zwraca ID nowego ćwiczenia
 */
export const ON_EXERCISE_CREATED = gql`
  subscription OnExerciseCreated($organizationId: String!) {
    onExerciseCreated(organizationId: $organizationId)
  }
`;

/**
 * Subskrypcja na zaktualizowane ćwiczenia w organizacji
 * Zwraca ID zaktualizowanego ćwiczenia
 */
export const ON_EXERCISE_UPDATED = gql`
  subscription OnExerciseUpdated($organizationId: String!) {
    onExerciseUpdated(organizationId: $organizationId)
  }
`;

/**
 * Subskrypcja na usunięte ćwiczenia w organizacji
 * Zwraca ID usuniętego ćwiczenia
 */
export const ON_EXERCISE_DELETED = gql`
  subscription OnExerciseDeleted($organizationId: String!) {
    onExerciseDeleted(organizationId: $organizationId)
  }
`;
