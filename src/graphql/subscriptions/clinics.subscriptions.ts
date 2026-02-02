import { gql } from "@apollo/client";

/**
 * GraphQL Subscriptions dla gabinetów
 * Real-time updates przez WebSocket
 *
 * UWAGA: Wszystkie subskrypcje zwracają tylko ID (String).
 * Frontend powinien użyć ID do aktualizacji cache lub pobrania pełnych danych przez query.
 */

/**
 * Subskrypcja na nowo utworzone gabinety w organizacji
 */
export const ON_CLINIC_CREATED = gql`
  subscription OnClinicCreated($organizationId: String!) {
    onClinicCreated(organizationId: $organizationId)
  }
`;

/**
 * Subskrypcja na zaktualizowane gabinety w organizacji
 */
export const ON_CLINIC_UPDATED = gql`
  subscription OnClinicUpdated($organizationId: String!) {
    onClinicUpdated(organizationId: $organizationId)
  }
`;

/**
 * Subskrypcja na usunięte gabinety w organizacji
 */
export const ON_CLINIC_DELETED = gql`
  subscription OnClinicDeleted($organizationId: String!) {
    onClinicDeleted(organizationId: $organizationId)
  }
`;
