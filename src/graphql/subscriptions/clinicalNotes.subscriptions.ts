import { gql } from "@apollo/client";

/**
 * GraphQL Subscriptions dla notatek klinicznych
 * Real-time updates przez WebSocket
 *
 * UWAGA: Wszystkie subskrypcje zwracają tylko ID (String).
 * Frontend powinien użyć ID do aktualizacji cache lub pobrania pełnych danych przez query.
 */

/**
 * Subskrypcja na nowo utworzone notatki kliniczne dla pacjenta
 */
export const ON_CLINICAL_NOTE_CREATED = gql`
  subscription OnClinicalNoteCreated($patientId: String!) {
    onClinicalNoteCreated(patientId: $patientId)
  }
`;

/**
 * Subskrypcja na zaktualizowane notatki kliniczne dla pacjenta
 */
export const ON_CLINICAL_NOTE_UPDATED = gql`
  subscription OnClinicalNoteUpdated($patientId: String!) {
    onClinicalNoteUpdated(patientId: $patientId)
  }
`;

/**
 * Subskrypcja na usunięte notatki kliniczne dla pacjenta
 */
export const ON_CLINICAL_NOTE_DELETED = gql`
  subscription OnClinicalNoteDeleted($patientId: String!) {
    onClinicalNoteDeleted(patientId: $patientId)
  }
`;
