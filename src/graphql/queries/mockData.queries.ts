import { gql } from "@apollo/client";

// Fallback queries dla testowania gdy baza danych nie jest dostępna
// Te queries działają bez połączenia z bazą danych

// Proste query do testowania schema
export const GET_SCHEMA_TYPES_QUERY = gql`
  query GetSchemaTypes {
    __schema {
      types {
        name
        kind
        description
      }
    }
  }
`;

// Query do sprawdzenia dostępnych pól dla Exercise
export const GET_EXERCISE_TYPE_INFO = gql`
  query GetExerciseTypeInfo {
    __type(name: "Exercise") {
      name
      fields {
        name
        type {
          name
          kind
        }
      }
    }
  }
`;

// Query do sprawdzenia dostępnych pól dla ExerciseSet
export const GET_EXERCISE_SET_TYPE_INFO = gql`
  query GetExerciseSetTypeInfo {
    __type(name: "ExerciseSet") {
      name
      fields {
        name
        type {
          name
          kind
        }
      }
    }
  }
`;

// Query do sprawdzenia dostępnych pól dla User
export const GET_USER_TYPE_INFO = gql`
  query GetUserTypeInfo {
    __type(name: "User") {
      name
      fields {
        name
        type {
          name
          kind
        }
      }
    }
  }
`;

// Query do sprawdzenia wszystkich dostępnych queries
export const GET_AVAILABLE_QUERIES = gql`
  query GetAvailableQueries {
    __schema {
      queryType {
        fields {
          name
          description
          args {
            name
            type {
              name
            }
          }
          type {
            name
            kind
          }
        }
      }
    }
  }
`;

