import { gql } from '@apollo/client';

// Fragment dla pełnych danych ćwiczenia
export const EXERCISE_FULL_FRAGMENT = gql`
  fragment ExerciseFullFragment on Exercise {
    additionalTags
    createdById
    createdAt
    updatedAt
    patientDescription
    clinicalDescription
    defaultDuration
    defaultExecutionTime
    side
    gifUrl
    id
    images
    imageUrl
    thumbnailUrl
    isActive
    scope
    isPublicTemplate
    isSystem
    isSystemExample
    status
    adminReviewNotes
    audioCue
    tempo
    rangeOfMotion
    defaultLoad {
      loadWeightKg
      loadSource
      type
      value
      unit
      text
    }
    difficultyLevel
    progressionFamilyId
    contributorId
    mainTags
    additionalTags
    name
    notes
    organizationId
    preparationTime
    defaultReps
    defaultRestBetweenReps
    defaultRestBetweenSets
    defaultSets
    type
    videoUrl
    enrichmentData
    # Global submission tracking (nowy model weryfikacji)
    globalSubmissionId
    globalSubmissionStatus
    sourceOrganizationExerciseId
    submittedToGlobalAt
    # Organization verification tracking
    organizationVerificationStatus
    submittedForOrgReviewAt
    orgReviewedById
    orgReviewedAt
    orgReviewNotes
  }
`;

// One page of the exercise library (list view); tab, search, sorting and tab counts are computed by the API.
export const GET_AVAILABLE_EXERCISES_PAGE_QUERY = gql`
  query GetAvailableExercisesPage(
    $organizationId: String!
    $tab: ExerciseLibraryTab!
    $search: String
    $page: Int!
    $pageSize: Int!
  ) {
    availableExercisesPage(
      organizationId: $organizationId
      tab: $tab
      search: $search
      page: $page
      pageSize: $pageSize
    ) {
      items {
        ...ExerciseFullFragment
      }
      totalCount
      page
      pageSize
      totalPages
      hasPreviousPage
      hasNextPage
      counts {
        all
        organization
        fiziyo
        needsChanges
      }
    }
  }
  ${EXERCISE_FULL_FRAGMENT}
`;

// Same root field as GET_AVAILABLE_EXERCISES_QUERY, so a cached full list answers it without a network trip.
export const GET_AVAILABLE_EXERCISE_NAMES_QUERY = gql`
  query GetAvailableExerciseNames($organizationId: String!) {
    availableExercises(organizationId: $organizationId) {
      id
      name
      imageUrl
    }
  }
`;

// Query do pobierania pojedynczego ćwiczenia
export const GET_EXERCISE_BY_ID_QUERY = gql`
  query GetExerciseById($id: String!) {
    exerciseById(id: $id) {
      ...ExerciseFullFragment
    }
  }
  ${EXERCISE_FULL_FRAGMENT}
`;

// Query do pobierania ćwiczeń organizacji (używa dedykowanej metody z Scope filtering)
export const GET_ORGANIZATION_EXERCISES_QUERY = gql`
  query GetOrganizationExercises($organizationId: String!) {
    organizationExercises(organizationId: $organizationId) {
      ...ExerciseFullFragment
    }
  }
  ${EXERCISE_FULL_FRAGMENT}
`;

// Names only (copy-name suggestion); the full fragment of a 5k library is tens of MB.
export const GET_ORGANIZATION_EXERCISE_NAMES_QUERY = gql`
  query GetOrganizationExerciseNames($organizationId: String!) {
    organizationExercises(organizationId: $organizationId) {
      id
      name
    }
  }
`;

// TypeScript types for export query
export interface ExportExercisesToCsvData {
  exportExercisesToCsv: string;
}

export interface ExportExercisesToCsvVariables {
  organizationId: string;
}

// Query do pobierania wszystkich dostępnych ćwiczeń dla organizacji
// Obejmuje: organizacyjne, globalne i publiczne templates
export const GET_AVAILABLE_EXERCISES_QUERY = gql`
  query GetAvailableExercises($organizationId: String!) {
    availableExercises(organizationId: $organizationId) {
      ...ExerciseFullFragment
    }
  }
  ${EXERCISE_FULL_FRAGMENT}
`;

/** Refresh both the full library (set and assignment pickers) and the paged list after exercise writes. */
export const EXERCISE_LIBRARY_REFETCH_QUERIES = [GET_AVAILABLE_EXERCISES_QUERY, GET_AVAILABLE_EXERCISES_PAGE_QUERY];
