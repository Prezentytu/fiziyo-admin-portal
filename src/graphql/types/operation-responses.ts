import type { ClinicalNote } from '@/types/clinical.types';

export interface CreatedEntity {
  id: string;
}

export interface CreateExerciseSetMutationData {
  createExerciseSet: CreatedEntity | null;
}

export interface AddExerciseToExerciseSetMutationData {
  addExerciseToExerciseSet: CreatedEntity | null;
}

export interface AssignExerciseSetToPatientMutationData {
  assignExerciseSetToPatient: {
    id?: string;
    premiumValidUntil?: string | null;
  } | null;
}

export interface DuplicateExerciseSetMutationData {
  duplicateExerciseSet: CreatedEntity | null;
}

export interface PatientAssignmentFrequency {
  timesPerDay?: number;
  timesPerWeek?: number;
  breakBetweenSets?: number;
  monday?: boolean;
  tuesday?: boolean;
  wednesday?: boolean;
  thursday?: boolean;
  friday?: boolean;
  saturday?: boolean;
  sunday?: boolean;
}

export interface PatientAssignmentListItem {
  id: string;
  exerciseSetId?: string | null;
  userId?: string;
  assignedAt?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  status?: string | null;
  frequency?: PatientAssignmentFrequency;
  exerciseSet?: {
    id: string;
    name?: string | null;
    description?: string | null;
    exerciseMappings?: unknown;
    creationTime?: string | null;
  } | null;
}

export interface PatientAssignmentsByUserQueryData {
  patientAssignments: PatientAssignmentListItem[];
}

export interface ExerciseSetWithAssignmentsQueryData {
  exerciseSetById: {
    patientAssignments?: PatientAssignmentListItem[];
  } | null;
}

export interface PatientClinicalNotesQueryData {
  patientClinicalNotes: ClinicalNote[];
}
