import { gql } from "@apollo/client";

// Fragment dla podstawowych danych ćwiczenia
export const EXERCISE_BASIC_FRAGMENT = gql`
  fragment ExerciseBasicFragment on Exercise {
    id
    name
    type
    isActive
    sets
    reps
    duration
    exerciseSide
    description
    createdById
    organizationId
  }
`;

// Fragment dla pełnych danych ćwiczenia
export const EXERCISE_FULL_FRAGMENT = gql`
  fragment ExerciseFullFragment on Exercise {
    additionalTags
    createdById
    creationTime
    description
    duration
    executionTime
    exerciseSide
    gifUrl
    id
    images
    imageUrl
    isActive
    isGlobal
    scope
    isPublicTemplate
    mainTags
    name
    notes
    organizationId
    ownerId
    preparationTime
    reps
    restReps
    restSets
    sets
    type
    videoUrl
  }
`;

// Query do pobierania listy ćwiczeń - najpierw podstawowe pola
export const GET_EXERCISES_QUERY = gql`
  query GetExercises {
    exercises {
      id
      name
      type
      isActive
      sets
    }
  }
`;

// Query z filtrowaniem - może być wymagane
export const GET_EXERCISES_WITH_FILTER_QUERY = gql`
  query GetExercisesWithFilter {
    exercises {
      id
      name
      type
      isActive
      sets
    }
  }
`;

// Query z minimum field - test czy jakieś pole powoduje błąd
export const GET_EXERCISES_MINIMAL_QUERY = gql`
  query GetExercisesMinimal {
    exercises {
      id
      name
    }
  }
`;

// Query rozszerzone - dodajemy pola stopniowo
export const GET_EXERCISES_FULL_QUERY = gql`
  query GetExercisesFull {
    exercises {
      id
      name
      type
      isActive
      sets
      reps
      duration
      description
      createdById
      organizationId
      exerciseSide
      isGlobal
      creationTime
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

// Query do testowania połączenia
export const TEST_CONNECTION_QUERY = gql`
  query TestConnection {
    __schema {
      types {
        name
      }
    }
  }
`;

// Query do eksportu ćwiczeń do CSV
export const EXPORT_EXERCISES_TO_CSV_QUERY = gql`
  query ExportExercisesToCsv($organizationId: String!) {
    exportExercisesToCsv(organizationId: $organizationId)
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

// Query do pobierania tylko globalnych ćwiczeń
// Scope = GLOBAL
export const GET_GLOBAL_EXERCISES_QUERY = gql`
  query GetGlobalExercises {
    globalExercises {
      ...ExerciseFullFragment
    }
  }
  ${EXERCISE_FULL_FRAGMENT}
`;

// Query do pobierania publicznych templates
// isPublicTemplate = true
export const GET_PUBLIC_TEMPLATE_EXERCISES_QUERY = gql`
  query GetPublicTemplateExercises {
    publicTemplateExercises {
      ...ExerciseFullFragment
    }
  }
  ${EXERCISE_FULL_FRAGMENT}
`;
