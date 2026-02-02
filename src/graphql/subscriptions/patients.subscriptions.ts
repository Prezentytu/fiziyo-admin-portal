import { gql } from "@apollo/client";

/**
 * GraphQL Subscriptions dla pacjentów
 * Real-time updates przez WebSocket
 *
 * UWAGA: Wszystkie subskrypcje zwracają tylko ID (String).
 * Frontend powinien użyć ID do aktualizacji cache lub pobrania pełnych danych przez query.
 */

/**
 * Subskrypcja na nowo utworzonych pacjentów w organizacji
 */
export const ON_PATIENT_CREATED = gql`
  subscription OnPatientCreated($organizationId: String!) {
    onPatientCreated(organizationId: $organizationId)
  }
`;

/**
 * Subskrypcja na zaktualizowanych pacjentów w organizacji
 */
export const ON_PATIENT_UPDATED = gql`
  subscription OnPatientUpdated($organizationId: String!) {
    onPatientUpdated(organizationId: $organizationId)
  }
`;

/**
 * Subskrypcja na usuniętych pacjentów w organizacji
 */
export const ON_PATIENT_DELETED = gql`
  subscription OnPatientDeleted($organizationId: String!) {
    onPatientDeleted(organizationId: $organizationId)
  }
`;
