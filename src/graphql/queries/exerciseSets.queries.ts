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

// Query do pobierania zestawów organizacji z ćwiczeniami
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
