import { gql } from '@apollo/client';

// Fragment dla podstawowych danych zestawu ćwiczeń
export const EXERCISE_SET_BASIC_FRAGMENT = gql`
  fragment ExerciseSetBasicFragment on ExerciseSet {
    id
    name
    description
    isActive
    isTemplate
    kind
    templateSource
    reviewStatus
    sourceExerciseSetId
    createdById
    organizationId
    creationTime
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
`;

// Fragment dla pełnych danych zestawu z ćwiczeniami
export const EXERCISE_SET_WITH_EXERCISES_FRAGMENT = gql`
  fragment ExerciseSetWithExercisesFragment on ExerciseSet {
    ...ExerciseSetBasicFragment
    exerciseMappings {
      id
      exerciseId
      exerciseSetId
      order
      sets
      reps
      duration
      restSets
      restReps
      preparationTime
      executionTime
      tempo
      loadType
      loadValue
      loadUnit
      loadText
      load {
        loadWeightKg
        loadSource
        type
        value
        unit
        text
      }
      notes
      customName
      customDescription
      overridesJson
      videoUrl
      imageUrl
      images
      exercise {
        id
        name
        type
        side
        gifUrl
        imageUrl
        images
        thumbnailUrl
        patientDescription
        clinicalDescription
        notes
        videoUrl
        audioCue
        preparationTime
        defaultExecutionTime
        tempo
        rangeOfMotion
        defaultSets
        defaultReps
        defaultDuration
        defaultRestBetweenSets
        defaultRestBetweenReps
        defaultLoad {
          loadWeightKg
          loadSource
          type
          value
          unit
          text
        }
        mainTags
        additionalTags
        scope
        status
        difficultyLevel
        enrichmentData
      }
    }
  }
  ${EXERCISE_SET_BASIC_FRAGMENT}
`;

// Query do pobierania listy zestawów ćwiczeń
export const GET_EXERCISE_SETS_QUERY = gql`
  query GetExerciseSets {
    exerciseSets {
      id
      name
      isActive
      isTemplate
      kind
      templateSource
      reviewStatus
      sourceExerciseSetId
    }
  }
`;

// Query do pobierania pojedynczego zestawu z ćwiczeniami
export const GET_EXERCISE_SET_BY_ID_QUERY = gql`
  query GetExerciseSetById($id: String!) {
    exerciseSetById(id: $id) {
      ...ExerciseSetWithExercisesFragment
    }
  }
  ${EXERCISE_SET_WITH_EXERCISES_FRAGMENT}
`;

// Query do pobierania zestawów przypisanych do pacjenta
export const GET_PATIENT_EXERCISE_SETS_QUERY = gql`
  query GetPatientExerciseSets($patientId: String!) {
    exerciseSets(where: { patientAssignments: { some: { userId: { eq: $patientId } } } }) {
      id
      name
      description
      isActive
      createdById
      organizationId
      creationTime
      isTemplate
      kind
      templateSource
      reviewStatus
      sourceExerciseSetId
    }
  }
`;

// Query do pobierania zestawów organizacji z ćwiczeniami
export const EXERCISE_SET_LIST_FRAGMENT = gql`
  fragment ExerciseSetListFragment on ExerciseSet {
    ...ExerciseSetBasicFragment
    exerciseMappings {
      id
      exerciseId
      order
      exercise {
        id
        name
        thumbnailUrl
        imageUrl
        images
      }
    }
    patientAssignments {
      id
    }
  }
  ${EXERCISE_SET_BASIC_FRAGMENT}
`;

export const GET_ORGANIZATION_EXERCISE_SETS_QUERY = gql`
  query GetOrganizationExerciseSets($organizationId: String!) {
    exerciseSets(where: { organizationId: { eq: $organizationId }, isActive: { eq: true } }) {
      ...ExerciseSetWithExercisesFragment
      patientAssignments {
        id
      }
    }
  }
  ${EXERCISE_SET_WITH_EXERCISES_FRAGMENT}
`;

export const GET_ORGANIZATION_EXERCISE_SETS_LIST_QUERY = gql`
  query GetOrganizationExerciseSetsList($organizationId: String!) {
    exerciseSets(where: { organizationId: { eq: $organizationId }, isActive: { eq: true } }) {
      ...ExerciseSetListFragment
    }
  }
  ${EXERCISE_SET_LIST_FRAGMENT}
`;

// Query do pobierania ostatnio używanych zestawów (na podstawie przypisań)
export const GET_RECENTLY_USED_SETS_QUERY = gql`
  query GetRecentlyUsedSets($organizationId: String!) {
    patientAssignments(
      where: { exerciseSet: { organizationId: { eq: $organizationId } } }
      order: [{ assignedAt: DESC }]
    ) {
      exerciseSetId
      assignedAt
    }
  }
`;

// Query do pobierania zestawu z przypisaniami
export const GET_EXERCISE_SET_WITH_ASSIGNMENTS_QUERY = gql`
  query GetExerciseSetWithAssignments($exerciseSetId: String!) {
    exerciseSetById(id: $exerciseSetId) {
      ...ExerciseSetWithExercisesFragment
      patientAssignments {
        id
        userId
        assignedById
        status
        assignedAt
        lastCompletedAt
        notes
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
        user {
          id
          fullname
          email
          image
        }
      }
    }
  }
  ${EXERCISE_SET_WITH_EXERCISES_FRAGMENT}
`;
