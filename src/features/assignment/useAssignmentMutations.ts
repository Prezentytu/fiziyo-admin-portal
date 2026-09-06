'use client';

import { useMutation } from '@apollo/client/react';
import {
  ADD_EXERCISE_TO_EXERCISE_SET_MUTATION,
  ASSIGN_EXERCISE_SET_TO_PATIENT_MUTATION,
  CREATE_EXERCISE_SET_MUTATION,
  REMOVE_EXERCISE_FROM_SET_MUTATION,
  REMOVE_EXERCISE_SET_ASSIGNMENT_MUTATION,
  UPDATE_EXERCISE_IN_SET_MUTATION,
  UPDATE_EXERCISE_SET_MUTATION,
} from '@/graphql/mutations/exercises.mutations';
import type {
  AddExerciseToExerciseSetMutationData,
  AssignExerciseSetToPatientMutationData,
  CreateExerciseSetMutationData,
} from '@/graphql/types/exerciseSetMutations';

export function useAssignmentMutations() {
  const [assignExerciseSet] = useMutation<AssignExerciseSetToPatientMutationData>(
    ASSIGN_EXERCISE_SET_TO_PATIENT_MUTATION
  );
  const [removeAssignment] = useMutation(REMOVE_EXERCISE_SET_ASSIGNMENT_MUTATION);
  const [createExerciseSet] = useMutation<CreateExerciseSetMutationData>(CREATE_EXERCISE_SET_MUTATION);
  const [addExerciseToSet] = useMutation<AddExerciseToExerciseSetMutationData>(ADD_EXERCISE_TO_EXERCISE_SET_MUTATION);
  const [updateExerciseSet] = useMutation(UPDATE_EXERCISE_SET_MUTATION);
  const [updateExerciseInSet] = useMutation(UPDATE_EXERCISE_IN_SET_MUTATION);
  const [removeExerciseFromSet] = useMutation(REMOVE_EXERCISE_FROM_SET_MUTATION);

  return {
    assignExerciseSet,
    removeAssignment,
    createExerciseSet,
    addExerciseToSet,
    updateExerciseSet,
    updateExerciseInSet,
    removeExerciseFromSet,
  };
}
