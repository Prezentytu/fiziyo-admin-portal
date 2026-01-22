/**
 * GraphQL Subscriptions - Real-time updates przez WebSocket
 *
 * UWAGA: Wszystkie subskrypcje zwracają tylko ID (String), nie pełne obiekty.
 * Powód: Encje EF Core mają navigation properties które powodują problemy
 * z serializacją przy PostgreSQL LISTEN/NOTIFY.
 *
 * Frontend powinien użyć ID do:
 * - Aktualizacji Apollo Cache (evict/gc dla deleted, refetch dla created/updated)
 * - Wyświetlenia toasta/notyfikacji
 *
 * Użycie:
 * import { ON_EXERCISE_CREATED } from "@/graphql/subscriptions";
 * import { useSubscription } from "@apollo/client";
 *
 * const { data } = useSubscription(ON_EXERCISE_CREATED, {
 *   variables: { organizationId },
 *   onData: ({ data }) => {
 *     const exerciseId = data.data?.onExerciseCreated;
 *     // Refetch lub aktualizuj cache
 *   }
 * });
 */

// Exercises
export {
  ON_EXERCISE_CREATED,
  ON_EXERCISE_UPDATED,
  ON_EXERCISE_DELETED,
} from "./exercises.subscriptions";

// Exercise Sets
export {
  ON_EXERCISE_SET_CREATED,
  ON_EXERCISE_SET_UPDATED,
  ON_EXERCISE_SET_DELETED,
} from "./exerciseSets.subscriptions";

// Assignments
export {
  ON_ASSIGNMENT_CREATED,
  ON_ASSIGNMENT_UPDATED,
  ON_ASSIGNMENT_DELETED,
} from "./assignments.subscriptions";

// Tags
export {
  ON_TAG_CREATED,
  ON_TAG_UPDATED,
  ON_TAG_DELETED,
  ON_TAG_CATEGORY_CREATED,
  ON_TAG_CATEGORY_UPDATED,
  ON_TAG_CATEGORY_DELETED,
} from "./tags.subscriptions";

// Patients
export {
  ON_PATIENT_CREATED,
  ON_PATIENT_UPDATED,
  ON_PATIENT_DELETED,
} from "./patients.subscriptions";

// Clinics
export {
  ON_CLINIC_CREATED,
  ON_CLINIC_UPDATED,
  ON_CLINIC_DELETED,
} from "./clinics.subscriptions";

// Clinical Notes
export {
  ON_CLINICAL_NOTE_CREATED,
  ON_CLINICAL_NOTE_UPDATED,
  ON_CLINICAL_NOTE_DELETED,
} from "./clinicalNotes.subscriptions";
