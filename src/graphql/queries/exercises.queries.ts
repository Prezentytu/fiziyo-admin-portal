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
    resistance
    equipment
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

// One page of the exercise library (list view); tab, search (with muscle synonyms), body region, sorting
// and tab counts are computed by the API.
export const GET_AVAILABLE_EXERCISES_PAGE_QUERY = gql`
  query GetAvailableExercisesPage(
    $organizationId: String!
    $tab: ExerciseLibraryTab!
    $search: String
    $page: Int!
    $pageSize: Int!
    $region: ExerciseBodyRegion
  ) {
    availableExercisesPage(
      organizationId: $organizationId
      tab: $tab
      search: $search
      page: $page
      pageSize: $pageSize
      region: $region
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

// Same root field as GET_AVAILABLE_EXERCISES_PICKER_QUERY, so a cached picker list answers it without a network trip.
export const GET_AVAILABLE_EXERCISE_NAMES_QUERY = gql`
  query GetAvailableExerciseNames($organizationId: String!) {
    availableExercises(organizationId: $organizationId) {
      id
      name
      imageUrl
      thumbnailUrl
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

// Exercise pickers (sets, assignment, patient): everything a list card and default parameters need, without
// enrichmentData. A 5k library with enrichment is tens of MB; pickers load enrichment only for chosen exercises.
export const EXERCISE_PICKER_FRAGMENT = gql`
  fragment ExercisePickerFragment on Exercise {
    id
    name
    type
    isActive
    scope
    status
    organizationId
    createdAt
    updatedAt
    patientDescription
    clinicalDescription
    audioCue
    tempo
    rangeOfMotion
    resistance
    equipment
    side
    preparationTime
    defaultDuration
    defaultExecutionTime
    defaultSets
    defaultReps
    defaultRestBetweenReps
    defaultRestBetweenSets
    defaultLoad {
      loadWeightKg
      loadSource
      type
      value
      unit
      text
    }
    difficultyLevel
    mainTags
    additionalTags
    notes
    gifUrl
    images
    imageUrl
    thumbnailUrl
    videoUrl
  }
`;

// Full library for the chat (ai-view) only; set, assignment and patient pickers use GET_AVAILABLE_EXERCISES_PICKER_PAGE_QUERY.
export const GET_AVAILABLE_EXERCISES_PICKER_QUERY = gql`
  query GetAvailableExercisesForPicker($organizationId: String!) {
    availableExercises(organizationId: $organizationId) {
      ...ExercisePickerFragment
    }
  }
  ${EXERCISE_PICKER_FRAGMENT}
`;

// One page of the picker library (sets, assignment, patient): same page and search as the library list,
// light fields only. Exercises outside the loaded pages come by id (GET_EXERCISE_PICKER_RECORD_QUERY).
export const GET_AVAILABLE_EXERCISES_PICKER_PAGE_QUERY = gql`
  query GetAvailableExercisesPickerPage(
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
        ...ExercisePickerFragment
      }
      totalCount
      page
      pageSize
      hasNextPage
      counts {
        all
        organization
        fiziyo
      }
    }
  }
  ${EXERCISE_PICKER_FRAGMENT}
`;

// Picker records by id through the library's visibility rule (availableExercises is the list the page shares
// its rule with): an exercise the library hides is not returned, so it cannot show up as "Popularne".
// The API cuts the list to 5000 by name before `where` applies, so two windows cover 10 000 visible exercises.
export const GET_VISIBLE_EXERCISE_PICKER_RECORDS_QUERY = gql`
  query GetVisibleExercisePickerRecords(
    $organizationId: String!
    $ids: [String!]!
    $withEnrichment: Boolean! = false
    $withSecondWindow: Boolean! = true
  ) {
    firstWindow: availableExercises(organizationId: $organizationId, skip: 0, take: 5000, where: { id: { in: $ids } }) {
      ...ExercisePickerFragment
      enrichmentData @include(if: $withEnrichment)
    }
    secondWindow: availableExercises(
      organizationId: $organizationId
      skip: 5000
      take: 5000
      where: { id: { in: $ids } }
    ) @include(if: $withSecondWindow) {
      ...ExercisePickerFragment
      enrichmentData @include(if: $withEnrichment)
    }
  }
  ${EXERCISE_PICKER_FRAGMENT}
`;

// One picker record by id, for exercises already in the set (shown, not offered for adding).
// exerciseById does not apply the library's visibility rule; never use it to offer an exercise.
export const GET_EXERCISE_PICKER_RECORD_QUERY = gql`
  query GetExercisePickerRecord($id: String!) {
    exerciseById(id: $id) {
      ...ExercisePickerFragment
    }
  }
  ${EXERCISE_PICKER_FRAGMENT}
`;

// A chosen exercise: its picker record and enrichment (the picker pages omit enrichment).
export const GET_EXERCISE_PICKER_DETAILS_QUERY = gql`
  query GetExercisePickerDetails($id: String!) {
    exerciseById(id: $id) {
      ...ExercisePickerFragment
      enrichmentData
    }
  }
  ${EXERCISE_PICKER_FRAGMENT}
`;

/** Refresh the pickers (paged and the chat's full list) and the library list after exercise writes. */
export const EXERCISE_LIBRARY_REFETCH_QUERIES = [
  GET_AVAILABLE_EXERCISES_PICKER_QUERY,
  GET_AVAILABLE_EXERCISES_PICKER_PAGE_QUERY,
  GET_AVAILABLE_EXERCISES_PAGE_QUERY,
];
