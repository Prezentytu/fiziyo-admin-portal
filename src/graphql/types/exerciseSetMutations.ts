export interface CreateExerciseSetMutationData {
  createExerciseSet?: {
    id: string;
    name?: string;
  };
}

export interface AddExerciseToExerciseSetMutationData {
  addExerciseToExerciseSet?: {
    id: string;
  };
}

export interface AssignExerciseSetToPatientMutationData {
  assignExerciseSetToPatient?: {
    id: string;
    premiumValidUntil?: string | null;
  };
}

export interface DuplicateExerciseSetMutationData {
  duplicateExerciseSet?: {
    id: string;
  };
}

export interface PatientClinicalNotesQueryData {
  patientClinicalNotes?: Array<{
    id: string;
    content?: string;
  }>;
}

export interface PatientAssignmentsQueryData {
  patientAssignments?: Array<{
    id: string;
    exerciseSetId?: string;
    userId?: string;
  }>;
}

export interface ExerciseSetByIdQueryData {
  exerciseSetById?: {
    id: string;
    name?: string;
    exerciseMappings?: Array<{ id: string; exerciseId: string }>;
    patientAssignments?: Array<{ id: string; userId?: string }>;
  };
}
