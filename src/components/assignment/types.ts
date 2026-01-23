// Types for Assignment Wizard

/**
 * Strukturalne obciążenie/opór z wsparciem dla analityki.
 * Smart String - parsowane z tekstu użytkownika do struktury JSONB.
 */
export interface ExerciseLoad {
  /** Typ obciążenia: weight (ciężar), band (guma), bodyweight (własna waga), other (inne) */
  type: "weight" | "band" | "bodyweight" | "other";
  /** Wartość liczbowa (dla wykresów postępów, np. 5, 10, 15) */
  value?: number;
  /** Jednostka: kg, lbs, level */
  unit?: "kg" | "lbs" | "level";
  /** Tekst wyświetlany użytkownikowi (np. "5 kg", "Guma czerwona") */
  text: string;
}

export interface ExerciseSet {
  id: string;
  name: string;
  description?: string;
  isActive?: boolean;
  isTemplate?: boolean;
  frequency?: Frequency;
  exerciseMappings?: ExerciseMapping[];
}

export interface ExerciseMapping {
  id: string;
  exerciseId: string;
  exerciseSetId?: string;
  order?: number;
  // Main parameters
  sets?: number;
  reps?: number;
  duration?: number;
  // Rest parameters
  restSets?: number;
  restReps?: number;
  // Time parameters
  preparationTime?: number;
  executionTime?: number;
  tempo?: string;
  // Load/Resistance - Smart String
  load?: ExerciseLoad;
  // Custom content
  notes?: string;
  customName?: string;
  customDescription?: string;
  // Media
  videoUrl?: string;
  imageUrl?: string;
  images?: string[];
  // Exercise reference
  exercise?: Exercise;
}

export interface Exercise {
  id: string;
  name: string;
  // Opisy
  patientDescription?: string;
  clinicalDescription?: string;
  notes?: string;
  // Parametry wykonania
  type?: "REPS" | "TIME" | "reps" | "time" | string;
  side?: "LEFT" | "RIGHT" | "BOTH" | "ALTERNATING" | "NONE" | "left" | "right" | "both" | "alternating" | "none" | string;
  defaultSets?: number;
  defaultReps?: number;
  defaultDuration?: number;
  defaultExecutionTime?: number;
  defaultRestBetweenSets?: number;
  defaultRestBetweenReps?: number;
  preparationTime?: number;
  tempo?: string;
  // Load/Resistance - Smart String
  defaultLoad?: ExerciseLoad;
  // Media
  imageUrl?: string;
  thumbnailUrl?: string;
  images?: string[];
  videoUrl?: string;
  // Status
  scope?: string;
  status?: string;
  difficultyLevel?: string;
  
  // Legacy aliasy (dla kompatybilności wstecznej)
  description?: string;
  exerciseSide?: "left" | "right" | "both" | "alternating" | "none" | string;
  executionTime?: number;
  sets?: number;
  reps?: number;
  duration?: number;
  restSets?: number;
  restReps?: number;
}

export interface Patient {
  id: string;
  name: string;
  email?: string;
  image?: string;
  isShadowUser?: boolean;
}

export interface Frequency {
  timesPerDay: number;
  timesPerWeek?: number;
  breakBetweenSets: number;
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
}

// Customization overrides for exercises during assignment
export interface ExerciseOverride {
  exerciseMappingId: string;
  // Main parameters
  sets?: number;
  reps?: number;
  duration?: number;
  // Rest parameters
  restSets?: number;
  restReps?: number;
  // Time parameters
  preparationTime?: number;
  executionTime?: number;
  // Tempo
  tempo?: string;
  // Load/Resistance - Smart String
  load?: ExerciseLoad;
  // Custom content
  customName?: string;
  customDescription?: string;
  notes?: string;
  // Media overrides
  videoUrl?: string;
  imageUrl?: string;
  images?: string[];
  // Visibility - hide exercise from this assignment
  hidden?: boolean;
}

/**
 * Ghost Copy - lokalna kopia ćwiczenia w RAM.
 * Używana podczas komponowania przypisania (nie dotyka bazy).
 * ID może być tymczasowe (temp-*) dla nowo dodanych ćwiczeń.
 */
export interface LocalExerciseMapping extends ExerciseMapping {
  /** Czy to nowo dodane ćwiczenie (nie z szablonu) */
  isNew?: boolean;
  /** ID oryginalnego mappingu (jeśli pochodzi z szablonu) */
  sourceId?: string;
}

/**
 * Tworzy Ghost Copy z ExerciseMapping.
 * Zachowuje sourceId dla śledzenia pochodzenia.
 */
export function createGhostCopy(mapping: ExerciseMapping): LocalExerciseMapping {
  return {
    ...mapping,
    sourceId: mapping.id,
    isNew: false,
  };
}

/**
 * Tworzy nowy LocalExerciseMapping z Exercise.
 * Używane przy dodawaniu ćwiczeń przez wyszukiwarkę.
 */
export function createLocalMapping(exercise: Exercise, order: number): LocalExerciseMapping {
  return {
    id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    exerciseId: exercise.id,
    exercise,
    order,
    sets: exercise.defaultSets || 3,
    reps: exercise.defaultReps || 10,
    duration: exercise.defaultDuration,
    restSets: exercise.defaultRestBetweenSets || 60,
    tempo: exercise.tempo,
    isNew: true,
  };
}

// Wizard state (updated for Ghost Copy architecture)
export interface AssignmentWizardState {
  selectedSet: ExerciseSet | null;
  selectedPatients: Patient[];
  exerciseOverrides: Map<string, ExerciseOverride>;
  startDate: Date;
  endDate: Date;
  frequency: Frequency;
  // Ghost Copy state
  localExercises: LocalExerciseMapping[];
  planName: string;
  templateName: string;
  saveAsTemplate: boolean;
}

// Step definitions (customize step removed - Progressive Disclosure merged into select-set)
export type WizardStep = "select-set" | "select-patients" | "schedule" | "summary";

export interface WizardStepConfig {
  id: WizardStep;
  label: string;
  description: string;
}

// Dynamic steps based on mode and preselected values
export function getWizardSteps(
  mode: "from-set" | "from-patient",
  hasPreselectedSet: boolean,
  hasPreselectedPatient: boolean
): WizardStepConfig[] {
  const steps: WizardStepConfig[] = [];

  // Step 1: Select set (if not preselected in from-patient mode, or always in dashboard mode)
  if (mode === "from-patient" && !hasPreselectedSet) {
    steps.push({
      id: "select-set",
      label: "Zestaw",
      description: "Wybierz zestaw ćw.",
    });
  }

  // Step 2: Select patients (if not preselected)
  if (!hasPreselectedPatient) {
    steps.push({
      id: "select-patients",
      label: "Pacjenci",
      description: "Wybierz pacjentów",
    });
  }

  // If from-set mode and set is preselected, we need patients step
  if (mode === "from-set" && hasPreselectedSet && !hasPreselectedPatient) {
    // Already added above
  }

  // Note: Customize step removed - Progressive Disclosure merged into select-set step

  // Schedule step
  steps.push({
    id: "schedule",
    label: "Harmonogram",
    description: "Ustal częstotliwość",
  });

  // Summary step
  steps.push({
    id: "summary",
    label: "Podsumowanie",
    description: "Potwierdź",
  });

  return steps;
}

// Info about already assigned sets (for from-patient mode)
export interface AssignedSetInfo {
  exerciseSetId: string;
  assignmentId: string;
  assignedAt: string;
  status: string;
}

// Info about already assigned patients (for from-set mode)
export interface AssignedPatientInfo {
  patientId: string;
  assignmentId: string;
  assignedAt: string;
  status: string;
}

// Props for wizard
export interface AssignmentWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "from-set" | "from-patient";
  preselectedSet?: ExerciseSet;
  preselectedPatient?: Patient;
  organizationId: string;
  therapistId?: string;
  onSuccess?: () => void;
}
