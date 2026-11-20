// SPEC-061: zależności ćwiczeń (rozgrzewka, „Wymaga wcześniej”, zestaw po zestawie).

/** `null` w API znaczy `block`. */
export type ExerciseDependencyMode = 'block' | 'remind';

/** Pola zależności na `ExerciseSetMapping`. */
export interface ExerciseSetMappingDependencies {
  id: string;
  order?: number | null;
  isWarmup: boolean;
  requiresMappingIds: string[];
  dependencyMode?: string | null;
}

export interface GetExerciseSetDependenciesResponse {
  exerciseSetById: {
    id: string;
    exerciseMappings?: ExerciseSetMappingDependencies[] | null;
  } | null;
}

export interface ExerciseSetDependencyInput {
  mappingId: string;
  isWarmup: boolean;
  requiresMappingIds: string[];
  /** `null` = block (domyślnie), `remind` = przypomina. */
  dependencyMode: 'remind' | null;
}

export interface UpdateExerciseSetDependenciesVariables {
  exerciseSetId: string;
  items: ExerciseSetDependencyInput[];
}

export interface UpdateExerciseSetDependenciesResponse {
  updateExerciseSetDependencies: {
    id: string;
    exerciseMappings?: ExerciseSetMappingDependencies[] | null;
  };
}

/** Pole zależności na `PatientAssignment`. */
export interface PatientAssignmentPrerequisite {
  id: string;
  requiresAssignmentId?: string | null;
}

export interface GetPatientAssignmentPrerequisitesResponse {
  patientAssignments: PatientAssignmentPrerequisite[] | null;
}

export interface SetAssignmentPrerequisiteVariables {
  assignmentId: string;
  requiresAssignmentId: string | null;
}

export interface SetAssignmentPrerequisiteResponse {
  setAssignmentPrerequisite: PatientAssignmentPrerequisite;
}
