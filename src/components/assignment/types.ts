// Types for Assignment Wizard

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
  description?: string;
  type?: "reps" | "time" | string;
  sets?: number;
  reps?: number;
  duration?: number;
  restSets?: number;
  restReps?: number;
  preparationTime?: number;
  executionTime?: number;
  exerciseSide?: "left" | "right" | "both" | "alternating" | "none" | string;
  imageUrl?: string;
  images?: string[];
  videoUrl?: string;
  notes?: string;
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
  // Custom content
  customName?: string;
  customDescription?: string;
  notes?: string;
  // Media overrides
  videoUrl?: string;
  imageUrl?: string;
  images?: string[];
}

// Wizard state
export interface AssignmentWizardState {
  selectedSet: ExerciseSet | null;
  selectedPatients: Patient[];
  exerciseOverrides: Map<string, ExerciseOverride>;
  startDate: Date;
  endDate: Date;
  frequency: Frequency;
}

// Step definitions
export type WizardStep = "select-set" | "select-patients" | "customize" | "schedule" | "summary";

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

  // Customize step
  steps.push({
    id: "customize",
    label: "Personalizacja",
    description: "Dostosuj ćw.",
  });

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

