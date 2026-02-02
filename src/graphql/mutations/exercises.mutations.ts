import { gql } from "@apollo/client";

/**
 * Mutacja do tworzenia nowego ćwiczenia
 * Używa ExerciseScope do kontroli widoczności (PERSONAL, ORGANIZATION, GLOBAL)
 */
export const CREATE_EXERCISE_MUTATION = gql`
  mutation CreateExercise(
    $organizationId: String!
    $scope: ExerciseScope!
    $name: String!
    $description: String!
    $type: String!
    $sets: Decimal
    $reps: Decimal
    $duration: Decimal
    $restSets: Decimal
    $restReps: Decimal
    $preparationTime: Decimal
    $executionTime: Decimal
    $videoUrl: String
    $gifUrl: String
    $imageUrl: String
    $images: [String!]
    $notes: String
    $exerciseSetId: String
    $isActive: Boolean
    $exerciseSide: String
    $mainTags: [String!]
    $additionalTags: [String!]
    # Pro Tuning fields
    $tempo: String
    $clinicalDescription: String
    $audioCue: String
    $difficultyLevel: DifficultyLevel
    $rangeOfMotion: String
    # Load fields
    $loadType: String
    $loadValue: Decimal
    $loadUnit: String
    $loadText: String
  ) {
    createExercise(
      organizationId: $organizationId
      scope: $scope
      name: $name
      description: $description
      type: $type
      sets: $sets
      reps: $reps
      duration: $duration
      restSets: $restSets
      restReps: $restReps
      preparationTime: $preparationTime
      executionTime: $executionTime
      videoUrl: $videoUrl
      gifUrl: $gifUrl
      imageUrl: $imageUrl
      images: $images
      notes: $notes
      exerciseSetId: $exerciseSetId
      isActive: $isActive
      exerciseSide: $exerciseSide
      mainTags: $mainTags
      additionalTags: $additionalTags
      tempo: $tempo
      clinicalDescription: $clinicalDescription
      audioCue: $audioCue
      difficultyLevel: $difficultyLevel
      rangeOfMotion: $rangeOfMotion
      loadType: $loadType
      loadValue: $loadValue
      loadUnit: $loadUnit
      loadText: $loadText
    ) {
      id
      organizationId
      name
      patientDescription
      clinicalDescription
      type
      defaultSets
      defaultReps
      defaultDuration
      defaultRestBetweenSets
      defaultRestBetweenReps
      preparationTime
      defaultExecutionTime
      videoUrl
      gifUrl
      imageUrl
      thumbnailUrl
      images
      notes
      tempo
      audioCue
      rangeOfMotion
      isActive
      createdById
      scope
      isPublicTemplate
      isSystem
      isSystemExample
      status
      side
      mainTags
      additionalTags
      contributorId
      difficultyLevel
    }
  }
`;

/**
 * Mutacja do aktualizacji ćwiczenia
 */
export const UPDATE_EXERCISE_MUTATION = gql`
  mutation UpdateExercise(
    $exerciseId: String!
    $name: String
    $description: String
    $type: String
    $sets: Decimal
    $reps: Decimal
    $duration: Decimal
    $restSets: Decimal
    $restReps: Decimal
    $preparationTime: Decimal
    $executionTime: Decimal
    $videoUrl: String
    $images: [String!]
    $notes: String
    $mainTags: [String!]
    $additionalTags: [String!]
    $exerciseSide: String
    # Pro Tuning fields
    $tempo: String
    $clinicalDescription: String
    $audioCue: String
    $difficultyLevel: DifficultyLevel
    $rangeOfMotion: String
    # Load fields
    $loadType: String
    $loadValue: Decimal
    $loadUnit: String
    $loadText: String
  ) {
    updateExercise(
      exerciseId: $exerciseId
      name: $name
      description: $description
      type: $type
      sets: $sets
      reps: $reps
      duration: $duration
      restSets: $restSets
      restReps: $restReps
      preparationTime: $preparationTime
      executionTime: $executionTime
      videoUrl: $videoUrl
      images: $images
      notes: $notes
      mainTags: $mainTags
      additionalTags: $additionalTags
      exerciseSide: $exerciseSide
      tempo: $tempo
      clinicalDescription: $clinicalDescription
      audioCue: $audioCue
      difficultyLevel: $difficultyLevel
      rangeOfMotion: $rangeOfMotion
      loadType: $loadType
      loadValue: $loadValue
      loadUnit: $loadUnit
      loadText: $loadText
    ) {
      id
      organizationId
      name
      patientDescription
      clinicalDescription
      type
      defaultSets
      defaultReps
      defaultDuration
      defaultRestBetweenSets
      defaultRestBetweenReps
      preparationTime
      defaultExecutionTime
      videoUrl
      images
      notes
      tempo
      audioCue
      rangeOfMotion
      isActive
      side
      mainTags
      additionalTags
      difficultyLevel
      updatedAt
    }
  }
`;

/**
 * Mutacja do usuwania ćwiczenia
 */
export const DELETE_EXERCISE_MUTATION = gql`
  mutation DeleteExercise($exerciseId: String!) {
    deleteExercise(exerciseId: $exerciseId)
  }
`;

/**
 * Mutacja do przypisywania ćwiczenia do pacjenta
 */
export const ASSIGN_EXERCISE_TO_PATIENT_MUTATION = gql`
  mutation AssignExerciseToPatient(
    $userId: String!
    $exerciseId: String!
    $sets: Decimal
    $reps: Decimal
    $duration: Decimal
    $restSets: Decimal
    $restReps: Decimal
    $notes: String
    $startDate: DateTime
    $endDate: DateTime
    $frequency: FrequencyInput
  ) {
    assignExerciseToPatient(
      userId: $userId
      exerciseId: $exerciseId
      sets: $sets
      reps: $reps
      duration: $duration
      restSets: $restSets
      restReps: $restReps
      notes: $notes
      startDate: $startDate
      endDate: $endDate
      frequency: $frequency
    ) {
      id
      userId
      assignedById
      exerciseId
      assignedAt
      startDate
      endDate
      status
    }
  }
`;

/**
 * Mutacja do tworzenia tagu ćwiczenia
 */
export const CREATE_EXERCISE_TAG_MUTATION = gql`
  mutation CreateExerciseTag(
    $name: String!
    $description: String
    $color: String!
    $icon: String!
    $isGlobal: Boolean!
    $organizationId: String!
    $isMain: Boolean!
    $categoryId: String
    $categoryIds: [String!]
  ) {
    createExerciseTag(
      name: $name
      description: $description
      color: $color
      icon: $icon
      isGlobal: $isGlobal
      organizationId: $organizationId
      isMain: $isMain
      categoryId: $categoryId
      categoryIds: $categoryIds
    ) {
      id
      name
      description
      color
      icon
      isGlobal
      organizationId
      isMain
      categoryId
      categoryIds
    }
  }
`;

/**
 * Mutacja do aktualizacji tagu
 */
export const UPDATE_TAG_MUTATION = gql`
  mutation UpdateTag(
    $tagId: String!
    $name: String
    $description: String
    $color: String
    $icon: String
    $isMain: Boolean
    $categoryId: String
    $categoryIds: [String!]
  ) {
    updateTag(
      tagId: $tagId
      name: $name
      description: $description
      color: $color
      icon: $icon
      isMain: $isMain
      categoryId: $categoryId
      categoryIds: $categoryIds
    ) {
      id
      name
      description
      color
      icon
      isMain
      categoryId
      categoryIds
    }
  }
`;

/**
 * Mutacja do usuwania tagu
 */
export const DELETE_TAG_MUTATION = gql`
  mutation DeleteTag($tagId: String!) {
    deleteTag(tagId: $tagId)
  }
`;

/**
 * Mutacja do aktualizacji zestawu ćwiczeń
 */
export const UPDATE_EXERCISE_SET_MUTATION = gql`
  mutation UpdateExerciseSet($exerciseSetId: String!, $name: String, $description: String) {
    updateExerciseSet(exerciseSetId: $exerciseSetId, name: $name, description: $description) {
      id
      name
      description
      organizationId
      isActive
      createdById
      isTemplate
    }
  }
`;

/**
 * Mutacja do usuwania zestawu ćwiczeń
 */
export const DELETE_EXERCISE_SET_MUTATION = gql`
  mutation DeleteExerciseSet($exerciseSetId: String!) {
    deleteExerciseSet(exerciseSetId: $exerciseSetId)
  }
`;

/**
 * Mutacja do duplikowania zestawu ćwiczeń
 */
export const DUPLICATE_EXERCISE_SET_MUTATION = gql`
  mutation DuplicateExerciseSet($exerciseSetId: String!) {
    duplicateExerciseSet(exerciseSetId: $exerciseSetId) {
      id
      name
      description
      organizationId
      isActive
      createdById
      isTemplate
      creationTime
    }
  }
`;

/**
 * Mutacja do tworzenia kategorii tagu
 */
export const CREATE_TAG_CATEGORY_MUTATION = gql`
  mutation CreateTagCategory(
    $name: String!
    $color: String!
    $description: String!
    $icon: String!
    $organizationId: String!
  ) {
    createTagCategory(
      name: $name
      color: $color
      description: $description
      icon: $icon
      organizationId: $organizationId
    ) {
      id
      name
      color
      description
      icon
      isActive
      organizationId
      createdById
    }
  }
`;

/**
 * Mutacja do aktualizacji kategorii tagu
 */
export const UPDATE_TAG_CATEGORY_MUTATION = gql`
  mutation UpdateTagCategory(
    $categoryId: String!
    $name: String!
    $color: String!
    $description: String!
    $icon: String!
  ) {
    updateTagCategory(categoryId: $categoryId, name: $name, color: $color, description: $description, icon: $icon) {
      id
      name
      color
      description
      icon
      isActive
      organizationId
      createdById
    }
  }
`;

/**
 * Mutacja do usuwania kategorii tagu
 */
export const DELETE_TAG_CATEGORY_MUTATION = gql`
  mutation DeleteTagCategory($categoryId: String!) {
    deleteTagCategory(categoryId: $categoryId)
  }
`;

/**
 * Mutacja do przypisywania zestawu ćwiczeń do pacjenta
 * Automatycznie aktywuje Premium na czas trwania zestawu (Beta Pilot Flow)
 */
export const ASSIGN_EXERCISE_SET_TO_PATIENT_MUTATION = gql`
  mutation AssignExerciseSetToPatient(
    $exerciseSetId: String!
    $patientId: String!
    $startDate: DateTime!
    $endDate: DateTime!
    $frequency: FrequencyInput!
  ) {
    assignExerciseSetToPatient(
      exerciseSetId: $exerciseSetId
      patientId: $patientId
      startDate: $startDate
      endDate: $endDate
      frequency: $frequency
    ) {
      id
      userId
      assignedById
      exerciseSetId
      assignedAt
      startDate
      endDate
      status
      premiumActivated
      premiumValidUntil
    }
  }
`;

/**
 * Mutacja do usuwania przypisania zestawu ćwiczeń
 */
export const REMOVE_EXERCISE_SET_ASSIGNMENT_MUTATION = gql`
  mutation RemoveExerciseSetAssignment($exerciseSetId: String!, $patientId: String!) {
    removeExerciseSetAssignment(exerciseSetId: $exerciseSetId, patientId: $patientId)
  }
`;

/**
 * Mutacja do aktualizacji przypisania zestawu ćwiczeń do pacjenta
 * Umożliwia zmianę frequency, dat, statusu i per-patient exercise overrides
 */
export const UPDATE_EXERCISE_SET_ASSIGNMENT_MUTATION = gql`
  mutation UpdateExerciseSetAssignment(
    $assignmentId: String!
    $startDate: DateTime
    $endDate: DateTime
    $frequency: FrequencyInput
    $status: String
    $exerciseOverrides: String
  ) {
    updateExerciseSetAssignment(
      assignmentId: $assignmentId
      startDate: $startDate
      endDate: $endDate
      frequency: $frequency
      status: $status
      exerciseOverrides: $exerciseOverrides
    ) {
      id
      userId
      assignedById
      exerciseSetId
      exerciseOverrides
      assignedAt
      startDate
      endDate
      status
      frequency {
        timesPerDay
        timesPerWeek
        breakBetweenSets
        monday
        tuesday
        wednesday
        thursday
        friday
        saturday
        sunday
      }
    }
  }
`;

/**
 * Mutacja do aktualizacji nadpisań parametrów ćwiczeń per-pacjent
 * Format exerciseOverrides: JSON { "mappingId": { "sets": 5, "reps": 12, "duration": null, "hidden": false }, ... }
 */
export const UPDATE_PATIENT_EXERCISE_OVERRIDES_MUTATION = gql`
  mutation UpdatePatientExerciseOverrides($assignmentId: String!, $exerciseOverrides: String!) {
    updatePatientExerciseOverrides(assignmentId: $assignmentId, exerciseOverrides: $exerciseOverrides) {
      id
      userId
      exerciseSetId
      exerciseOverrides
      status
    }
  }
`;

/**
 * Mutacja do aktualizacji częstotliwości zestawu ćwiczeń
 */
export const UPDATE_EXERCISE_SET_FREQUENCY_MUTATION = gql`
  mutation UpdateExerciseSetFrequency($exerciseSetId: String!, $frequency: FrequencyInput!) {
    updateExerciseSetFrequency(exerciseSetId: $exerciseSetId, frequency: $frequency) {
      id
      name
      description
      organizationId
      isActive
      createdById
      isTemplate
      frequency {
        timesPerDay
        timesPerWeek
        breakBetweenSets
        monday
        tuesday
        wednesday
        thursday
        friday
        saturday
        sunday
      }
    }
  }
`;

export const UPDATE_EXERCISE_IN_SET_MUTATION = gql`
  mutation UpdateExerciseInSet(
    $exerciseId: String!
    $exerciseSetId: String!
    $order: Decimal
    $sets: Decimal
    $reps: Decimal
    $duration: Decimal
    $restSets: Decimal
    $restReps: Decimal
    $preparationTime: Decimal
    $executionTime: Decimal
    $notes: String
    $customName: String
    $customDescription: String
    # Pro Tuning fields
    $tempo: String
    $loadType: String
    $loadValue: Decimal
    $loadUnit: String
    $loadText: String
  ) {
    updateExerciseInSet(
      exerciseId: $exerciseId
      exerciseSetId: $exerciseSetId
      order: $order
      sets: $sets
      reps: $reps
      duration: $duration
      restSets: $restSets
      restReps: $restReps
      preparationTime: $preparationTime
      executionTime: $executionTime
      notes: $notes
      customName: $customName
      customDescription: $customDescription
      tempo: $tempo
      loadType: $loadType
      loadValue: $loadValue
      loadUnit: $loadUnit
      loadText: $loadText
    ) {
      id
      exerciseSetId
      exerciseId
      order
      sets
      reps
      duration
      restSets
      restReps
      notes
      customName
      customDescription
      tempo
    }
  }
`;

/**
 * Mutacja do usuwania ćwiczenia z zestawu
 */
export const REMOVE_EXERCISE_FROM_SET_MUTATION = gql`
  mutation RemoveExerciseFromSet($exerciseId: String!, $exerciseSetId: String!) {
    removeExerciseFromSet(exerciseId: $exerciseId, exerciseSetId: $exerciseSetId)
  }
`;

/**
 * Mutacja do tworzenia zestawu ćwiczeń
 */
export const CREATE_EXERCISE_SET_MUTATION = gql`
  mutation CreateExerciseSet($organizationId: String!, $name: String!, $description: String) {
    createExerciseSet(organizationId: $organizationId, name: $name, description: $description) {
      id
      name
      description
      organizationId
      isActive
      isTemplate
      createdById
      creationTime
    }
  }
`;

/**
 * Mutacja do dodawania ćwiczenia do zestawu
 */
export const ADD_EXERCISE_TO_EXERCISE_SET_MUTATION = gql`
  mutation AddExerciseToExerciseSet(
    $exerciseId: String!
    $exerciseSetId: String!
    $order: Decimal
    $sets: Decimal
    $reps: Decimal
    $duration: Decimal
    $restSets: Decimal
    $restReps: Decimal
    $preparationTime: Decimal
    $executionTime: Decimal
    $notes: String
    $customName: String
    $customDescription: String
    # Pro Tuning fields
    $tempo: String
    $loadType: String
    $loadValue: Decimal
    $loadUnit: String
    $loadText: String
  ) {
    addExerciseToExerciseSet(
      exerciseId: $exerciseId
      exerciseSetId: $exerciseSetId
      order: $order
      sets: $sets
      reps: $reps
      duration: $duration
      restSets: $restSets
      restReps: $restReps
      preparationTime: $preparationTime
      executionTime: $executionTime
      notes: $notes
      customName: $customName
      customDescription: $customDescription
      tempo: $tempo
      loadType: $loadType
      loadValue: $loadValue
      loadUnit: $loadUnit
      loadText: $loadText
    ) {
      id
      exerciseSetId
      exerciseId
      order
      sets
      reps
      duration
      restSets
      restReps
      notes
      customName
      customDescription
      tempo
    }
  }
`;

/**
 * Mutacja do dodawania tagu do ćwiczenia
 */
export const ADD_TAG_TO_EXERCISE_MUTATION = gql`
  mutation AddTagToExercise($exerciseId: String!, $tagId: String!, $isMainTag: Boolean!) {
    addTagToExercise(exerciseId: $exerciseId, tagId: $tagId, isMainTag: $isMainTag) {
      id
      exerciseId
      tagId
      isMainTag
    }
  }
`;

/**
 * Mutacja do usuwania tagu z ćwiczenia
 */
export const REMOVE_TAG_FROM_EXERCISE_MUTATION = gql`
  mutation RemoveTagFromExercise($exerciseId: String!, $tagId: String!) {
    removeTagFromExercise(exerciseId: $exerciseId, tagId: $tagId)
  }
`;

/**
 * Mutacja do importu ćwiczeń z CSV
 */
export const IMPORT_EXERCISES_FROM_CSV_MUTATION = gql`
  mutation ImportExercisesFromCsv($organizationId: String!, $csvData: String!) {
    importExercisesFromCsv(organizationId: $organizationId, csvData: $csvData) {
      total
      success
      errors
    }
  }
`;

/**
 * Mutacja do importu przykładowych zestawów ćwiczeń
 */
export const CREATE_EXAMPLE_EXERCISE_SETS_MUTATION = gql`
  mutation CreateExampleExerciseSets($organizationId: String!) {
    createExampleExerciseSets(organizationId: $organizationId) {
      success
      setsCount
      exercisesCount
      categoriesCount
      tagsCount
      setNames
      errorMessage
    }
  }
`;

/**
 * Mutacja do wyczyszczenia wszystkich danych organizacji
 */
export const CLEAR_ALL_DATA_MUTATION = gql`
  mutation ClearAllData($organizationId: String!, $password: String!) {
    clearAllData(organizationId: $organizationId, password: $password) {
      success
      deletedCounts {
        key
        value
      }
      errorMessage
    }
  }
`;

/**
 * Mutacja do zmiany scope ćwiczenia
 * Pozwala na zmianę zakresu widoczności ćwiczenia (PERSONAL, ORGANIZATION, GLOBAL)
 */
export const UPDATE_EXERCISE_SCOPE_MUTATION = gql`
  mutation UpdateExerciseScope($exerciseId: String!, $newScope: ExerciseScope!) {
    updateExerciseScope(exerciseId: $exerciseId, newScope: $newScope) {
      id
      name
      scope
      isPublicTemplate
      organizationId
      ownerId
    }
  }
`;

/**
 * Mutacja do kopiowania publicznego template ćwiczenia do organizacji
 * Umożliwia skopiowanie ćwiczenia z publicznych templates do własnej organizacji
 */
export const COPY_EXERCISE_TEMPLATE_MUTATION = gql`
  mutation CopyExerciseTemplate($templateExerciseId: String!, $targetOrganizationId: String!) {
    copyExerciseTemplate(templateExerciseId: $templateExerciseId, targetOrganizationId: $targetOrganizationId) {
      id
      name
      patientDescription
      type
      scope
      organizationId
      contributorId
      isPublicTemplate
      defaultSets
      defaultReps
      defaultDuration
      side
      mainTags
      additionalTags
    }
  }
`;

/**
 * Mutacja do publikowania ćwiczenia jako publiczny template
 * Udostępnia ćwiczenie jako template dla innych organizacji
 */
export const PUBLISH_EXERCISE_AS_TEMPLATE_MUTATION = gql`
  mutation PublishExerciseAsTemplate($exerciseId: String!) {
    publishExerciseAsTemplate(exerciseId: $exerciseId) {
      id
      name
      scope
      isPublicTemplate
      organizationId
      ownerId
    }
  }
`;

/**
 * Mutacja do uploadowania obrazu do ćwiczenia (base64)
 */
export const UPLOAD_EXERCISE_IMAGE_MUTATION = gql`
  mutation UploadExerciseImage($exerciseId: String!, $base64Image: String!, $contentType: String) {
    uploadExerciseImage(exerciseId: $exerciseId, base64Image: $base64Image, contentType: $contentType)
  }
`;

/**
 * Mutacja do usuwania obrazu z ćwiczenia
 */
export const DELETE_EXERCISE_IMAGE_MUTATION = gql`
  mutation DeleteExerciseImage($exerciseId: String!, $imageUrl: String!) {
    deleteExerciseImage(exerciseId: $exerciseId, imageUrl: $imageUrl)
  }
`;

/**
 * Mutacja do synchronizacji opublikowanych ćwiczeń systemowych do organizacji
 * Kopiuje TYLKO Published ćwiczenia z bazy FiziYo, których jeszcze nie ma w organizacji
 */
export const SYNC_PUBLISHED_EXERCISES_MUTATION = gql`
  mutation SyncPublishedExercises($organizationId: String!) {
    syncPublishedExercises(organizationId: $organizationId) {
      success
      addedCount
      skippedCount
      totalAvailable
      message
    }
  }
`;

/**
 * Query do sprawdzenia ile nowych ćwiczeń jest dostępnych do synchronizacji
 */
export const CHECK_SYNC_AVAILABILITY_QUERY = gql`
  query CheckSyncAvailability($organizationId: String!) {
    checkSyncAvailability(organizationId: $organizationId) {
      totalPublished
      alreadyInOrganization
      newAvailable
    }
  }
`;

// ============================================
// ZGŁASZANIE DO BAZY GLOBALNEJ - dla Autorów
// ============================================

/**
 * Mutacja do zgłaszania ćwiczenia do weryfikacji w bazie globalnej.
 * Tworzy KOPIĘ ćwiczenia do globalnej kolejki, zachowując oryginał bez zmian.
 * Automatycznie waliduje: czy jest media, opis min. 50 znaków, min. 2 tagi.
 */
export const SUBMIT_TO_GLOBAL_REVIEW_MUTATION = gql`
  mutation SubmitToGlobalReview($exerciseId: String!) {
    submitToGlobalReview(exerciseId: $exerciseId) {
      id
      name
      status
      scope
      isPublicTemplate
      contributorId
      adminReviewNotes
      updatedAt
      # Nowe pola dla śledzenia zgłoszenia
      globalSubmissionId
      submittedToGlobalAt
    }
  }
`;

/**
 * @deprecated Użyj RESUBMIT_FROM_ORIGINAL_MUTATION zamiast tej mutacji
 * Mutacja do ponownego zgłaszania ćwiczenia po wprowadzeniu poprawek.
 * Działa na starym modelu (bez kopii globalnej).
 */
export const RESUBMIT_EXERCISE_FOR_REVIEW_MUTATION = gql`
  mutation ResubmitExerciseForReview($exerciseId: String!) {
    resubmitExerciseForReview(exerciseId: $exerciseId) {
      id
      name
      status
      scope
      isPublicTemplate
      adminReviewNotes
      updatedAt
    }
  }
`;

/**
 * Mutacja do ponownego zgłaszania ćwiczenia z oryginału po wprowadzeniu poprawek.
 * Aktualizuje istniejącą globalną kopię danymi z poprawionego oryginału.
 * Dostępne dla twórcy ćwiczenia gdy globalna kopia ma status CHANGES_REQUESTED.
 * @param originalExerciseId - ID oryginału (ćwiczenie organizacyjne)
 */
export const RESUBMIT_FROM_ORIGINAL_MUTATION = gql`
  mutation ResubmitFromOriginal($originalExerciseId: String!) {
    resubmitFromOriginal(originalExerciseId: $originalExerciseId) {
      id
      name
      status
      scope
      isPublicTemplate
      adminReviewNotes
      updatedAt
      globalSubmissionId
      submittedToGlobalAt
    }
  }
`;

/**
 * Mutacja do wycofania zgłoszenia ćwiczenia z kolejki weryfikacji.
 * Dostępne dla twórcy ćwiczenia gdy status to PENDING_REVIEW.
 */
export const WITHDRAW_FROM_REVIEW_MUTATION = gql`
  mutation WithdrawFromReview($exerciseId: String!) {
    withdrawFromReview(exerciseId: $exerciseId) {
      id
      name
      status
      scope
      updatedAt
      globalSubmissionId
    }
  }
`;
