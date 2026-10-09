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
  ON_GLOBAL_EXERCISE_PUBLISHED,
  ON_EXERCISE_SUBMITTED_FOR_GLOBAL_REVIEW,
} from './exercises.subscriptions';

// Exercise Sets
export {
  ON_EXERCISE_SET_CREATED,
  ON_EXERCISE_SET_UPDATED,
  ON_EXERCISE_SET_DELETED,
} from './exerciseSets.subscriptions';

// Assignments
export { ON_THERAPIST_ASSIGNMENT_CREATED } from './therapistAssignments.subscriptions';

// Patients
export { ON_PATIENT_CREATED, ON_PATIENT_UPDATED, ON_PATIENT_DELETED } from './patients.subscriptions';
export { ON_MEMBER_CREATED } from './members.subscriptions';
