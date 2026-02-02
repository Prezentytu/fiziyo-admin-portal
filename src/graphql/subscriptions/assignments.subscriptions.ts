import { gql } from "@apollo/client";

/**
 * GraphQL Subscriptions dla przypisań pacjentów
 * Real-time updates przez WebSocket
 *
 * UWAGA: Wszystkie subskrypcje zwracają tylko ID (String).
 * Frontend powinien użyć ID do aktualizacji cache lub pobrania pełnych danych przez query.
 */

/**
 * Subskrypcja na nowo utworzone przypisania w organizacji
 * Zwraca ID nowego przypisania
 */
export const ON_ASSIGNMENT_CREATED = gql`
  subscription OnAssignmentCreated($organizationId: String!) {
    onAssignmentCreated(organizationId: $organizationId)
  }
`;

/**
 * Subskrypcja na zaktualizowane przypisania w organizacji
 * Zwraca ID zaktualizowanego przypisania
 */
export const ON_ASSIGNMENT_UPDATED = gql`
  subscription OnAssignmentUpdated($organizationId: String!) {
    onAssignmentUpdated(organizationId: $organizationId)
  }
`;

/**
 * Subskrypcja na usunięte przypisania w organizacji
 * Zwraca ID usuniętego przypisania
 */
export const ON_ASSIGNMENT_DELETED = gql`
  subscription OnAssignmentDeleted($organizationId: String!) {
    onAssignmentDeleted(organizationId: $organizationId)
  }
`;
