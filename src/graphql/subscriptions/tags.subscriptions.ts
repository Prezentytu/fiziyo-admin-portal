import { gql } from "@apollo/client";

/**
 * GraphQL Subscriptions dla tagów ćwiczeń
 * Real-time updates przez WebSocket
 *
 * UWAGA: Wszystkie subskrypcje zwracają tylko ID (String).
 * Frontend powinien użyć ID do aktualizacji cache lub pobrania pełnych danych przez query.
 */

/**
 * Subskrypcja na nowo utworzone tagi w organizacji
 */
export const ON_TAG_CREATED = gql`
  subscription OnExerciseTagCreated($organizationId: String!) {
    onExerciseTagCreated(organizationId: $organizationId)
  }
`;

/**
 * Subskrypcja na zaktualizowane tagi w organizacji
 */
export const ON_TAG_UPDATED = gql`
  subscription OnExerciseTagUpdated($organizationId: String!) {
    onExerciseTagUpdated(organizationId: $organizationId)
  }
`;

/**
 * Subskrypcja na usunięte tagi w organizacji
 */
export const ON_TAG_DELETED = gql`
  subscription OnExerciseTagDeleted($organizationId: String!) {
    onExerciseTagDeleted(organizationId: $organizationId)
  }
`;

/**
 * Subskrypcja na nowo utworzone kategorie tagów w organizacji
 */
export const ON_TAG_CATEGORY_CREATED = gql`
  subscription OnTagCategoryCreated($organizationId: String!) {
    onTagCategoryCreated(organizationId: $organizationId)
  }
`;

/**
 * Subskrypcja na zaktualizowane kategorie tagów w organizacji
 */
export const ON_TAG_CATEGORY_UPDATED = gql`
  subscription OnTagCategoryUpdated($organizationId: String!) {
    onTagCategoryUpdated(organizationId: $organizationId)
  }
`;

/**
 * Subskrypcja na usunięte kategorie tagów w organizacji
 */
export const ON_TAG_CATEGORY_DELETED = gql`
  subscription OnTagCategoryDeleted($organizationId: String!) {
    onTagCategoryDeleted(organizationId: $organizationId)
  }
`;
