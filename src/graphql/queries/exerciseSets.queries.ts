import { gql } from "@apollo/client";

// Fragment dla podstawowych danych zestawu ćwiczeń
export const EXERCISE_SET_BASIC_FRAGMENT = gql`
  fragment ExerciseSetBasicFragment on ExerciseSet {
    id
    name
    description
    isActive
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
      notes
      customName
      customDescription
      exercise {
        id
        name
        type
        exerciseSide
        imageUrl
        images
        description
        notes
        videoUrl
        preparationTime
        executionTime
        sets
        reps
        duration
        restSets
        restReps
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
    }
  }
`;

// Query do pobierania zestawów organizacji z ćwiczeniami
export const GET_ORGANIZATION_EXERCISE_SETS_QUERY = gql`
  query GetOrganizationExerciseSets($organizationId: String!) {
    exerciseSets(where: { organizationId: { eq: $organizationId }, isActive: { eq: true } }) {
      ...ExerciseSetWithExercisesFragment
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
