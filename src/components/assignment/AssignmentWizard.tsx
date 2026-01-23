'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { Loader2, ArrowLeft, ArrowRight, FolderKanban, Users, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { addDays, differenceInDays, format } from 'date-fns';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { defaultFrequency } from '@/components/exercise-sets/FrequencyPicker';

import { WizardStepIndicator } from './WizardStepIndicator';
import { SelectSetStep } from './SelectSetStep';
import { SelectPatientsStep } from './SelectPatientsStep';
// CustomizeExercisesStep removed - Progressive Disclosure merged into SelectSetStep
import { ScheduleStep } from './ScheduleStep';
import { SummaryStep } from './SummaryStep';
import { AssignmentSuccessDialog } from './AssignmentSuccessDialog';
import {
  getWizardSteps,
  createGhostCopy,
  type AssignmentWizardProps,
  type WizardStep,
  type ExerciseSet,
  type Patient,
  type Frequency,
  type ExerciseOverride,
  type AssignedSetInfo,
  type AssignedPatientInfo,
  type Exercise,
  type LocalExerciseMapping,
} from './types';

import { GET_ORGANIZATION_EXERCISE_SETS_QUERY, GET_EXERCISE_SET_WITH_ASSIGNMENTS_QUERY } from '@/graphql/queries/exerciseSets.queries';
import { GET_THERAPIST_PATIENTS_QUERY, GET_ORGANIZATION_PATIENTS_QUERY } from '@/graphql/queries/therapists.queries';
import { ASSIGN_EXERCISE_SET_TO_PATIENT_MUTATION, REMOVE_EXERCISE_SET_ASSIGNMENT_MUTATION, UPDATE_PATIENT_EXERCISE_OVERRIDES_MUTATION, CREATE_EXERCISE_SET_MUTATION, ADD_EXERCISE_TO_EXERCISE_SET_MUTATION } from '@/graphql/mutations/exercises.mutations';
import { GET_ORGANIZATION_EXERCISES_QUERY } from '@/graphql/queries/exercises.queries';
import { GET_PATIENT_ASSIGNMENTS_BY_USER_QUERY } from '@/graphql/queries/patientAssignments.queries';
import { GET_CURRENT_BILLING_STATUS_QUERY } from '@/graphql/queries/billing.queries';
import type { TherapistPatientsResponse } from '@/types/apollo';

// Success dialog data type
interface SuccessDialogData {
  patients: Array<{ id: string; name: string; email?: string }>;
  setName: string;
  premiumValidUntil: string | null;
}

// Wrapper component that handles dialog state - content remounts on each open
export function AssignmentWizard(props: AssignmentWizardProps) {
  const { open, onOpenChange, therapistId, organizationId } = props;
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Success dialog state - lifted to wrapper so it persists after wizard closes
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successData, setSuccessData] = useState<SuccessDialogData | null>(null);

  const handleCloseAttempt = useCallback(() => {
    if (hasChanges) {
      setShowCloseConfirm(true);
    } else {
      onOpenChange(false);
    }
  }, [hasChanges, onOpenChange]);

  const handleConfirmClose = useCallback(() => {
    setShowCloseConfirm(false);
    setHasChanges(false);
    onOpenChange(false);
  }, [onOpenChange]);

  // Callback for AssignmentWizardContent to show success dialog
  const handleAssignmentSuccess = useCallback((data: SuccessDialogData) => {
    setSuccessData(data);
    setShowSuccessDialog(true);
    // Close the wizard dialog
    onOpenChange(false);
  }, [onOpenChange]);

  // Reset when dialog opens
  if (!open && hasChanges) {
    setHasChanges(false);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={() => handleCloseAttempt()}>
        {open && (
          <AssignmentWizardContent
            {...props}
            onCloseAttempt={handleCloseAttempt}
            onHasChanges={setHasChanges}
            onAssignmentSuccess={handleAssignmentSuccess}
          />
        )}

        <ConfirmDialog
          open={showCloseConfirm}
          onOpenChange={setShowCloseConfirm}
          title="Porzucić zmiany?"
          description="Masz niezapisane zmiany. Czy na pewno chcesz zamknąć bez zapisywania?"
          confirmText="Tak, zamknij"
          cancelText="Kontynuuj edycję"
          variant="destructive"
          onConfirm={handleConfirmClose}
        />
      </Dialog>

      {/* Success dialog - OUTSIDE main dialog so it persists after wizard closes */}
      {successData && (
        <AssignmentSuccessDialog
          open={showSuccessDialog}
          onOpenChange={(open) => {
            setShowSuccessDialog(open);
            if (!open) {
              setSuccessData(null);
            }
          }}
          patients={successData.patients}
          setName={successData.setName}
          premiumValidUntil={successData.premiumValidUntil}
          therapistId={therapistId}
          organizationId={organizationId}
          onAssignAnother={() => {
            // Reset success state and reopen wizard
            setSuccessData(null);
            setShowSuccessDialog(false);
            onOpenChange(true);
          }}
        />
      )}
    </>
  );
}

// Extended props for inner component
interface AssignmentWizardContentProps extends AssignmentWizardProps {
  onCloseAttempt: () => void;
  onHasChanges: (hasChanges: boolean) => void;
  onAssignmentSuccess: (data: SuccessDialogData) => void;
}

// Inner component with all the wizard logic - remounts on each dialog open
function AssignmentWizardContent({
  open,
  onOpenChange,
  mode,
  preselectedSet,
  preselectedPatient,
  organizationId,
  therapistId,
  onSuccess,
  onCloseAttempt,
  onHasChanges,
  onAssignmentSuccess,
}: AssignmentWizardContentProps) {
  // Compute dynamic steps based on what's preselected
  const steps = useMemo(
    () => getWizardSteps(mode, !!preselectedSet, !!preselectedPatient),
    [mode, preselectedSet, preselectedPatient]
  );

  // Get first step id
  const firstStepId = steps[0]?.id || 'select-set';

  // State - initialized directly from props (no useEffect needed)
  const [currentStep, setCurrentStep] = useState<WizardStep>(firstStepId);
  const [completedSteps, setCompletedSteps] = useState<Set<WizardStep>>(new Set());
  const [selectedSet, setSelectedSet] = useState<ExerciseSet | null>(preselectedSet || null);
  const [selectedPatients, setSelectedPatients] = useState<Patient[]>(preselectedPatient ? [preselectedPatient] : []);
  const [overrides, setOverrides] = useState<Map<string, ExerciseOverride>>(new Map());
  const [startDate, setStartDate] = useState<Date>(() => new Date());
  const [endDate, setEndDate] = useState<Date>(() => addDays(new Date(), 30));
  const [frequency, setFrequency] = useState<Frequency>(defaultFrequency as Frequency);
  const [isCreatingSet, setIsCreatingSet] = useState(false);

  // Ghost Copy state - lokalna tablica ćwiczeń (nie dotyka bazy)
  const [localExercises, setLocalExercises] = useState<LocalExerciseMapping[]>([]);
  // Nazwa planu dla pacjenta (Assignment name)
  const [planName, setPlanName] = useState<string>("");
  // Szablon - opcjonalny zapis do biblioteki
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState<string>("");
  // Wykluczone ćwiczenia (legacy - pustý Set bo customize step został usunięty)
  const [excludedExercises] = useState<Set<string>>(new Set());

  // Track changes for close confirmation
  const hasChanges = !preselectedSet ? selectedSet !== null : selectedPatients.length > (preselectedPatient ? 1 : 0);

  // Notify parent about changes
  useEffect(() => {
    onHasChanges(hasChanges);
  }, [hasChanges, onHasChanges]);

  // Handle set change - create Ghost Copy and apply Smart Defaults
  const handleSetChange = useCallback((set: ExerciseSet | null) => {
    setSelectedSet(set);
    // Reset customizations when changing set
    setOverrides(new Map());

    // Ghost Copy - kopiuj ćwiczenia do lokalnego stanu (nie dotyka bazy)
    if (set?.exerciseMappings) {
      setLocalExercises(set.exerciseMappings.map(createGhostCopy));
    } else {
      setLocalExercises([]);
    }

    // Set plan name (dla pacjenta) i template name (dla biblioteki)
    const baseName = set?.name || "Nowy Plan";
    setPlanName(baseName);
    setTemplateName(`${baseName} (szablon)`);

    // Smart Defaults: wypełnij frequency z szablonu jeśli dostępne
    if (set?.frequency) {
      setFrequency({
        timesPerDay: set.frequency.timesPerDay || 1,
        timesPerWeek: set.frequency.timesPerWeek,
        breakBetweenSets: set.frequency.breakBetweenSets || 60,
        monday: set.frequency.monday ?? true,
        tuesday: set.frequency.tuesday ?? true,
        wednesday: set.frequency.wednesday ?? true,
        thursday: set.frequency.thursday ?? true,
        friday: set.frequency.friday ?? true,
        saturday: set.frequency.saturday ?? false,
        sunday: set.frequency.sunday ?? false,
      });
    }
  }, []);

  // Queries - load sets if needed (from-patient mode or no preselected set)
  const needsSets = mode === 'from-patient' || !preselectedSet;
  const { data: setsData, loading: loadingSets } = useQuery(GET_ORGANIZATION_EXERCISE_SETS_QUERY, {
    variables: { organizationId },
    skip: !organizationId || !open || !needsSets,
  });

  // Load patients if needed (from-set mode or no preselected patient)
  const needsPatients = !preselectedPatient;
  const { data: patientsData, loading: loadingPatients } = useQuery(GET_THERAPIST_PATIENTS_QUERY, {
    variables: { therapistId, organizationId },
    skip: !therapistId || !organizationId || !open || !needsPatients,
  });

  // Load patient's existing assignments (for from-patient mode - to show which sets are already assigned)
  const { data: patientAssignmentsData, refetch: refetchPatientAssignments } = useQuery(GET_PATIENT_ASSIGNMENTS_BY_USER_QUERY, {
    variables: { userId: preselectedPatient?.id || '' },
    skip: !preselectedPatient?.id || !open || mode !== 'from-patient',
  });

  // Load exercise set's existing assignments (for from-set mode OR when a set is selected in from-patient mode)
  // This allows showing which patients already have the selected set
  const effectiveSetId = preselectedSet?.id || selectedSet?.id;
  const { data: setAssignmentsData, refetch: refetchSetAssignments } = useQuery(GET_EXERCISE_SET_WITH_ASSIGNMENTS_QUERY, {
    variables: { exerciseSetId: effectiveSetId || '' },
    skip: !effectiveSetId || !open,
  });

  // Load available exercises for Rapid Builder
  const { data: exercisesData } = useQuery(GET_ORGANIZATION_EXERCISES_QUERY, {
    variables: { organizationId },
    skip: !organizationId || !open,
  });

  // Mutations
  const [assignSet, { loading: assigning }] = useMutation(ASSIGN_EXERCISE_SET_TO_PATIENT_MUTATION);
  const [removeAssignment, { loading: removing }] = useMutation(REMOVE_EXERCISE_SET_ASSIGNMENT_MUTATION);
  const [updatePatientOverrides, { loading: updatingOverrides }] = useMutation(UPDATE_PATIENT_EXERCISE_OVERRIDES_MUTATION);
  const [createExerciseSet] = useMutation(CREATE_EXERCISE_SET_MUTATION, {
    refetchQueries: [
      { query: GET_ORGANIZATION_EXERCISE_SETS_QUERY, variables: { organizationId } },
    ],
    awaitRefetchQueries: true,
  });
  const [addExerciseToSet] = useMutation(ADD_EXERCISE_TO_EXERCISE_SET_MUTATION, {
    refetchQueries: [
      { query: GET_ORGANIZATION_EXERCISE_SETS_QUERY, variables: { organizationId } },
    ],
  });

  // State for unassign confirmation dialog
  const [unassignConfirm, setUnassignConfirm] = useState<{
    open: boolean;
    assignmentId: string;
    name: string;
    type: 'set' | 'patient';
  } | null>(null);

  // Process data - map all fields including sets, reps, duration from both mapping and exercise
  const exerciseSets: ExerciseSet[] = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = setsData as { exerciseSets?: any[] } | undefined;
    return (data?.exerciseSets || []).map((set) => ({
      id: set.id,
      name: set.name,
      description: set.description,
      isActive: set.isActive,
      isTemplate: set.isTemplate,
      frequency: set.frequency,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      exerciseMappings: set.exerciseMappings?.map((m: any) => ({
        id: m.id,
        exerciseId: m.exerciseId,
        exerciseSetId: m.exerciseSetId,
        order: m.order,
        // Mapping-level overrides
        sets: m.sets,
        reps: m.reps,
        duration: m.duration,
        restSets: m.restSets,
        restReps: m.restReps,
        notes: m.notes,
        customName: m.customName,
        customDescription: m.customDescription,
        // Exercise data with all fields (support both new and legacy names)
        exercise: m.exercise
          ? {
              id: m.exercise.id,
              name: m.exercise.name,
              type: m.exercise.type,
              // Support both new and legacy field names
              description: m.exercise.patientDescription || m.exercise.description,
              patientDescription: m.exercise.patientDescription,
              side: m.exercise.side,
              exerciseSide: m.exercise.side?.toLowerCase() || m.exercise.exerciseSide,
              imageUrl: m.exercise.thumbnailUrl || m.exercise.imageUrl,
              thumbnailUrl: m.exercise.thumbnailUrl,
              images: m.exercise.images,
              videoUrl: m.exercise.videoUrl,
              notes: m.exercise.notes,
              // Exercise default values (support both new and legacy names)
              sets: m.exercise.defaultSets ?? m.exercise.sets,
              reps: m.exercise.defaultReps ?? m.exercise.reps,
              duration: m.exercise.defaultDuration ?? m.exercise.duration,
              restSets: m.exercise.defaultRestBetweenSets ?? m.exercise.restSets,
              restReps: m.exercise.defaultRestBetweenReps ?? m.exercise.restReps,
              preparationTime: m.exercise.preparationTime,
              executionTime: m.exercise.defaultExecutionTime ?? m.exercise.executionTime,
              defaultSets: m.exercise.defaultSets,
              defaultReps: m.exercise.defaultReps,
              defaultDuration: m.exercise.defaultDuration,
              defaultRestBetweenSets: m.exercise.defaultRestBetweenSets,
              defaultRestBetweenReps: m.exercise.defaultRestBetweenReps,
              defaultExecutionTime: m.exercise.defaultExecutionTime,
            }
          : undefined,
      })),
    }));
  }, [setsData]);

  const patients: Patient[] = useMemo(() => {
    const data = patientsData as TherapistPatientsResponse | undefined;
    return (data?.therapistPatients || []).map((assignment) => ({
      id: assignment.patient?.id || assignment.patientId,
      name: assignment.patient?.fullname || 'Nieznany',
      email: assignment.patient?.email,
      image: assignment.patient?.image,
      isShadowUser: assignment.patient?.isShadowUser,
    }));
  }, [patientsData]);

  // Process patient's assigned sets (for from-patient mode)
  const assignedSets: AssignedSetInfo[] = useMemo(() => {
    if (mode !== 'from-patient' || !patientAssignmentsData) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const assignments = (patientAssignmentsData as any)?.patientAssignments || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return assignments
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((a: any) => a.exerciseSetId) // Only exercise set assignments
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((a: any) => ({
        exerciseSetId: a.exerciseSetId,
        assignmentId: a.id,
        assignedAt: a.assignedAt,
        status: a.status,
      }));
  }, [mode, patientAssignmentsData]);

  // Process exercise set's assigned patients (for from-set mode OR when a set is selected)
  // This works for:
  // 1. from-set mode with preselectedSet
  // 2. from-patient mode without preselectedPatient (dashboard) - when user selects a set
  const assignedPatients: AssignedPatientInfo[] = useMemo(() => {
    if (!setAssignmentsData) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const setData = (setAssignmentsData as any)?.exerciseSetById;
    const assignments = setData?.patientAssignments || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return assignments.map((a: any) => ({
      patientId: a.userId,
      assignmentId: a.id,
      assignedAt: a.assignedAt,
      status: a.status,
    }));
  }, [setAssignmentsData]);

  // Process available exercises for Rapid Builder
  const availableExercises: Exercise[] = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = exercisesData as { organizationExercises?: any[] } | undefined;
    return (data?.organizationExercises || [])
      .filter((ex) => ex.isActive !== false)
      .map((ex) => ({
        id: ex.id,
        name: ex.name,
        type: ex.type,
        patientDescription: ex.patientDescription,
        notes: ex.notes,
        defaultSets: ex.defaultSets,
        defaultReps: ex.defaultReps,
        defaultDuration: ex.defaultDuration,
        thumbnailUrl: ex.thumbnailUrl,
        imageUrl: ex.imageUrl,
        images: ex.images,
      }));
  }, [exercisesData]);

  // Handle create new set (Phantom Set) with Smart Draft Logic
  const handleCreateSet = useCallback(async () => {
    const today = format(new Date(), 'dd.MM.yyyy');
    const setNamePattern = preselectedPatient
      ? `Terapia dla ${preselectedPatient.name} - ${today}`
      : `Nowy zestaw - ${today}`;

    // Smart Draft Logic: Sprawdź czy istnieje pusty szkic z dzisiaj
    const existingDraft = exerciseSets.find(s =>
      (s.exerciseMappings?.length || 0) === 0 && // Jest pusty
      s.name.includes(today) // Utworzony dzisiaj (data w nazwie)
    );

    if (existingDraft) {
      // Otwórz istniejący szkic zamiast tworzyć nowy
      setSelectedSet(existingDraft);
      toast.info('Otwarto istniejący szkic');
      return;
    }

    // Nie ma szkicu - utwórz nowy
    setIsCreatingSet(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await createExerciseSet({
        variables: {
          organizationId,
          name: setNamePattern,
          description: null,
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newSet = (result.data as any)?.createExerciseSet;
      if (newSet) {
        // Auto-select the new set
        setSelectedSet({
          id: newSet.id,
          name: newSet.name,
          description: newSet.description,
          exerciseMappings: [], // pusty zestaw
        });
        toast.success('Utworzono zestaw');
      }
    } catch (error) {
      console.error('Błąd tworzenia zestawu:', error);
      toast.error('Nie udało się utworzyć zestawu');
    } finally {
      setIsCreatingSet(false);
    }
  }, [organizationId, preselectedPatient, createExerciseSet, exerciseSets]);

  // Ghost Copy - synchronizuj localExercises gdy zmieni się selectedSet z zewnątrz
  useEffect(() => {
    if (selectedSet && exerciseSets.length > 0) {
      const updatedSet = exerciseSets.find((s) => s.id === selectedSet.id);
      // Tylko przy pierwszym załadowaniu (gdy localExercises jest puste)
      if (updatedSet && localExercises.length === 0 && updatedSet.exerciseMappings?.length) {
        setLocalExercises(updatedSet.exerciseMappings.map(createGhostCopy));
      }
    }
  }, [exerciseSets, selectedSet, localExercises.length]);

  // Handle unassign action
  const handleUnassignRequest = useCallback((assignmentId: string, name: string, type: 'set' | 'patient') => {
    setUnassignConfirm({ open: true, assignmentId, name, type });
  }, []);

  const handleUnassignConfirm = useCallback(async () => {
    if (!unassignConfirm) return;

    try {
      // Find the exercise set ID and patient ID for the mutation
      let exerciseSetId: string | undefined;
      let patientId: string | undefined;

      if (unassignConfirm.type === 'set') {
        // Unassigning a set from a patient (from-patient mode with preselectedPatient)
        const assignment = assignedSets.find((a) => a.assignmentId === unassignConfirm.assignmentId);
        if (assignment) {
          exerciseSetId = assignment.exerciseSetId;
          patientId = preselectedPatient?.id;
        }
      } else {
        // Unassigning a patient from a set (from-set mode OR dashboard mode with selected set)
        const assignment = assignedPatients.find((a) => a.assignmentId === unassignConfirm.assignmentId);
        if (assignment) {
          exerciseSetId = preselectedSet?.id || selectedSet?.id;
          patientId = assignment.patientId;
        }
      }

      if (!exerciseSetId || !patientId) {
        toast.error('Nie udało się znaleźć danych przypisania');
        return;
      }

      await removeAssignment({
        variables: { exerciseSetId, patientId },
        refetchQueries: [
          // Refetch patient's assignments (for patient detail page)
          {
            query: GET_PATIENT_ASSIGNMENTS_BY_USER_QUERY,
            variables: { userId: patientId },
          },
          // Refetch exercise set with assignments (for set detail page)
          {
            query: GET_EXERCISE_SET_WITH_ASSIGNMENTS_QUERY,
            variables: { exerciseSetId },
          },
        ],
      });

      toast.success(
        unassignConfirm.type === 'set'
          ? `Zestaw "${unassignConfirm.name}" został odpisany`
          : `Pacjent "${unassignConfirm.name}" został odpisany`
      );

      // Refetch the wizard's local data as well
      if (mode === 'from-patient' && preselectedPatient) {
        refetchPatientAssignments();
      }
      if (effectiveSetId) {
        refetchSetAssignments();
      }
    } catch (error) {
      console.error('Błąd odpisywania:', error);
      toast.error('Nie udało się odpisać');
    } finally {
      setUnassignConfirm(null);
    }
  }, [
    unassignConfirm,
    assignedSets,
    assignedPatients,
    preselectedPatient,
    preselectedSet?.id,
    selectedSet?.id,
    effectiveSetId,
    removeAssignment,
    mode,
    refetchPatientAssignments,
    refetchSetAssignments,
  ]);

  // Determine step title and description
  const getStepInfo = () => {
    switch (currentStep) {
      case 'select-set':
        return {
          title: 'Wybierz zestaw ćwiczeń',
          description: preselectedPatient
            ? `Wybierz zestaw dla pacjenta ${preselectedPatient.name}`
            : 'Wybierz zestaw ćwiczeń do przypisania',
        };
      case 'select-patients':
        return {
          title: 'Wybierz pacjentów',
          description: selectedSet
            ? `Wybierz pacjentów dla zestawu "${selectedSet.name}"`
            : 'Wybierz pacjentów do przypisania',
        };
      // customize step removed - Progressive Disclosure merged into select-set
      case 'schedule':
        return {
          title: 'Harmonogram',
          description: 'Ustal okres i częstotliwość wykonywania ćwiczeń',
        };
      case 'summary':
        return {
          title: 'Podsumowanie',
          description: 'Sprawdź i potwierdź przypisanie zestawu',
        };
      default:
        return { title: '', description: '' };
    }
  };

  const stepInfo = getStepInfo();

  // Navigation
  const canProceed = () => {
    switch (currentStep) {
      case 'select-set':
        return selectedSet !== null;
      case 'select-patients':
        return selectedPatients.length > 0;
      // customize step removed - Progressive Disclosure merged into select-set
      case 'schedule':
        return true;
      case 'summary':
        return true;
      default:
        return false;
    }
  };

  // Track animation direction
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');
  const [isAnimating, setIsAnimating] = useState(false);
  const animationKey = useRef(0);

  const goToStep = (step: WizardStep) => {
    const targetIndex = steps.findIndex((s) => s.id === step);
    const currentIdx = steps.findIndex((s) => s.id === currentStep);
    setSlideDirection(targetIndex > currentIdx ? 'right' : 'left');
    animationKey.current += 1;
    setCurrentStep(step);
  };

  const goNext = () => {
    const currentIndex = steps.findIndex((s) => s.id === currentStep);
    if (currentIndex < steps.length - 1) {
      setSlideDirection('right');
      animationKey.current += 1;
      setCompletedSteps((prev) => new Set([...prev, currentStep]));
      setCurrentStep(steps[currentIndex + 1].id);
    }
  };

  const goBack = () => {
    const currentIndex = steps.findIndex((s) => s.id === currentStep);
    if (currentIndex > 0) {
      setSlideDirection('left');
      animationKey.current += 1;
      setCurrentStep(steps[currentIndex - 1].id);
    }
  };

  // Calculate duration for context summary
  const durationDays = differenceInDays(endDate, startDate);

  // Build exercise overrides JSON for backend (Ghost Copy model)
  const buildExerciseOverridesJson = useCallback((): string | null => {
    if (overrides.size === 0) return null;

    const result: Record<string, Record<string, unknown>> = {};

    // Add overrides (without exerciseMappingId field)
    overrides.forEach((override, mappingId) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { exerciseMappingId, ...rest } = override;
      result[mappingId] = { ...rest };
    });

    return JSON.stringify(result);
  }, [overrides]);

  const handleSubmit = async () => {
    if (!selectedSet || selectedPatients.length === 0) return;

    try {
      const overridesJson = buildExerciseOverridesJson();
      let lastPremiumValidUntil: string | null = null;

      // Określ exerciseSetId do przypisania
      let exerciseSetIdToAssign = selectedSet.id;

      // Jeśli saveAsTemplate - utwórz nowy szablon w bibliotece
      if (saveAsTemplate && templateName.trim() && localExercises.length > 0) {
        try {
          // 1. Utwórz nowy Set
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const createResult = await createExerciseSet({
            variables: {
              organizationId,
              name: templateName.trim(),
              description: `Utworzono z planu: ${planName}`,
            },
          });

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const newSet = (createResult.data as any)?.createExerciseSet;
          if (newSet?.id) {
            // 2. Dodaj ćwiczenia do nowego setu
            for (let i = 0; i < localExercises.length; i++) {
              const mapping = localExercises[i];
              await addExerciseToSet({
                variables: {
                  exerciseId: mapping.exerciseId,
                  exerciseSetId: newSet.id,
                  order: i + 1,
                  sets: mapping.sets || mapping.exercise?.defaultSets,
                  reps: mapping.reps || mapping.exercise?.defaultReps,
                  duration: mapping.duration || mapping.exercise?.defaultDuration,
                  restSets: mapping.restSets,
                  notes: mapping.notes,
                  customName: mapping.customName,
                },
              });
            }

            toast.success(`Zapisano szablon "${templateName}"`);
            // Użyj nowego setu do przypisania
            exerciseSetIdToAssign = newSet.id;
          }
        } catch (templateError) {
          console.error('Błąd tworzenia szablonu:', templateError);
          toast.error('Nie udało się zapisać szablonu, ale przypisanie będzie kontynuowane');
        }
      }

      for (const patient of selectedPatients) {
        // Step 1: Assign the exercise set (auto-aktywuje Premium)
        // Oblicz efektywną częstotliwość tygodniową:
        // - Jeśli są zaznaczone dni (specific mode) → użyj liczby dni
        // - Jeśli nie (flexible mode) → użyj timesPerWeek
        const selectedDaysCount = [
          frequency.monday,
          frequency.tuesday,
          frequency.wednesday,
          frequency.thursday,
          frequency.friday,
          frequency.saturday,
          frequency.sunday,
        ].filter(Boolean).length;
        const effectiveTimesPerWeek = selectedDaysCount > 0
          ? selectedDaysCount
          : (frequency.timesPerWeek || 3);

        const assignResult = await assignSet({
          variables: {
            exerciseSetId: exerciseSetIdToAssign,
            patientId: patient.id,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            frequency: {
              timesPerDay: String(frequency.timesPerDay),
              timesPerWeek: String(effectiveTimesPerWeek),
              breakBetweenSets: String(frequency.breakBetweenSets),
              isFlexible: selectedDaysCount === 0, // Elastyczny gdy nie ma wybranych dni
              monday: frequency.monday,
              tuesday: frequency.tuesday,
              wednesday: frequency.wednesday,
              thursday: frequency.thursday,
              friday: frequency.friday,
              saturday: frequency.saturday,
              sunday: frequency.sunday,
            },
          },
          refetchQueries: [
            // Billing status (aktywni pacjenci premium) - odświeża badge na dashboardzie
            { query: GET_CURRENT_BILLING_STATUS_QUERY, variables: { organizationId } },
            // Always refetch patients list (premium status may change)
            { query: GET_ORGANIZATION_PATIENTS_QUERY, variables: { organizationId, filter: 'all' } },
            ...(mode === 'from-patient' && preselectedPatient
              ? [
                  {
                    query: GET_PATIENT_ASSIGNMENTS_BY_USER_QUERY,
                    variables: { userId: preselectedPatient.id },
                  },
                ]
              : []),
            ...(mode === 'from-set' && preselectedSet
              ? [
                  {
                    query: GET_EXERCISE_SET_WITH_ASSIGNMENTS_QUERY,
                    variables: { exerciseSetId: preselectedSet.id },
                  },
                ]
              : []),
          ],
        });

        // Pobierz premiumValidUntil z odpowiedzi (Beta Pilot Flow)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const responseData = (assignResult.data as any)?.assignExerciseSetToPatient;
        if (responseData?.premiumValidUntil) {
          lastPremiumValidUntil = responseData.premiumValidUntil;
        }

        // Step 2: If we have overrides or excluded exercises, update the assignment
        const assignmentId = responseData?.id;
        if (assignmentId && overridesJson) {
          await updatePatientOverrides({
            variables: {
              assignmentId,
              exerciseOverrides: overridesJson,
            },
          });
        }
      }

      // 🎯 Beta Pilot Flow: Pokazuj QR dialog zamiast zamykać od razu
      // Call parent to show success dialog (lifted state to wrapper)
      onAssignmentSuccess({
        patients: selectedPatients.map((p) => ({
          id: p.id,
          name: p.name,
          email: p.email,
        })),
        setName: planName || selectedSet.name,
        premiumValidUntil: lastPremiumValidUntil,
      });

      // Notify success callback
      onSuccess?.();
    } catch (error) {
      console.error('Błąd przypisywania:', error);
      toast.error('Nie udało się przypisać zestawu');
    }
  };

  const isLoading = loadingSets || loadingPatients || assigning || removing || updatingOverrides;
  const isFirstStep = steps.length > 0 && currentStep === steps[0].id;
  const isLastStep = currentStep === 'summary';

  // Get contextual next button text
  const getNextButtonText = () => {
    const currentIndex = steps.findIndex((s) => s.id === currentStep);
    const nextStep = steps[currentIndex + 1];

    if (isLastStep) {
      return 'Przypisz zestaw';
    }

    if (nextStep) {
      return `Dalej: ${nextStep.label}`;
    }

    return 'Dalej';
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'Enter' && !e.shiftKey && canProceed()) {
        e.preventDefault();
        if (isLastStep) {
          handleSubmit();
        } else {
          goNext();
        }
      }

      if (e.key === 'Backspace' && !isFirstStep) {
        e.preventDefault();
        goBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep, isFirstStep, isLastStep, canProceed, goNext, goBack, handleSubmit]);

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 'select-set':
        return (
          <SelectSetStep
            exerciseSets={exerciseSets}
            selectedSet={selectedSet}
            onSelectSet={handleSetChange}
            assignedSets={assignedSets}
            onUnassign={(assignmentId, setName) => handleUnassignRequest(assignmentId, setName, 'set')}
            loading={loadingSets}
            // Ghost Copy props
            localExercises={localExercises}
            onLocalExercisesChange={setLocalExercises}
            planName={planName}
            onPlanNameChange={setPlanName}
            sourceTemplateName={selectedSet?.name}
            // Progressive Disclosure props
            overrides={overrides}
            onOverridesChange={setOverrides}
            selectedPatientsCount={selectedPatients.length}
            // Phantom Set props
            onCreateSet={handleCreateSet}
            isCreatingSet={isCreatingSet}
            patientName={preselectedPatient?.name}
            // Rapid Builder props
            availableExercises={availableExercises}
            organizationId={organizationId}
            // Save as template props
            saveAsTemplate={saveAsTemplate}
            onSaveAsTemplateChange={setSaveAsTemplate}
            templateName={templateName}
            onTemplateNameChange={setTemplateName}
          />
        );

      case 'select-patients':
        return (
          <SelectPatientsStep
            patients={patients}
            selectedPatients={selectedPatients}
            onSelectPatients={setSelectedPatients}
            assignedPatients={assignedPatients}
            onUnassign={(assignmentId, patientName) => handleUnassignRequest(assignmentId, patientName, 'patient')}
            loading={loadingPatients}
          />
        );

      // customize step removed - Progressive Disclosure merged into select-set

      case 'schedule':
        if (!selectedSet) return null;
        return (
          <ScheduleStep
            startDate={startDate}
            endDate={endDate}
            frequency={frequency}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onFrequencyChange={setFrequency}
          />
        );

      case 'summary':
        if (!selectedSet) return null;
        return (
          <SummaryStep
            exerciseSet={selectedSet}
            selectedPatients={selectedPatients}
            startDate={startDate}
            endDate={endDate}
            frequency={frequency}
            overrides={overrides}
            excludedExercises={excludedExercises}
            onGoToStep={goToStep}
          />
        );

      default:
        return null;
    }
  };

  return (
    <>
    <DialogContent
      className="max-w-7xl w-[98vw] max-h-[95vh] h-[90vh] md:h-[85vh] flex flex-col p-0 gap-0 overflow-hidden"
      onInteractOutside={(e) => e.preventDefault()}
      onEscapeKeyDown={(e) => {
        e.preventDefault();
        onCloseAttempt();
      }}
      data-testid="assign-wizard"
    >
      {/* Header */}
      <DialogHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-xl">{stepInfo.title}</DialogTitle>
              <DialogDescription className="mt-1">{stepInfo.description}</DialogDescription>
            </div>

            {/* Floating Context Summary - mr-8 to avoid X button */}
            {selectedSet && currentStep !== 'select-set' && (
              <div className="hidden sm:flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-light/50 border border-border/50 text-xs shrink-0 mr-8">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <FolderKanban className="h-3.5 w-3.5" />
                  <span className="font-medium text-foreground max-w-[120px] truncate">{selectedSet.name}</span>
                  <span className="text-muted-foreground">
                    ({(selectedSet.exerciseMappings?.length || 0) - excludedExercises.size}
                    {excludedExercises.size > 0 && <span className="text-destructive/70">/{selectedSet.exerciseMappings?.length || 0}</span>})
                  </span>
                </div>
                {selectedPatients.length > 0 && currentStep !== 'select-patients' && (
                  <>
                    <span className="text-border">•</span>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      <span>{selectedPatients.length}</span>
                    </div>
                  </>
                )}
                {currentStep === 'summary' && (
                  <>
                    <span className="text-border">•</span>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{durationDays} dni</span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          <WizardStepIndicator
            steps={steps}
            currentStep={currentStep}
            completedSteps={completedSteps}
            onStepClick={goToStep}
            allowNavigation={completedSteps.size > 0}
            data-testid="assign-wizard-step-indicator"
          />
        </div>
      </DialogHeader>

      {/* Content - overflow-hidden dla clip animacji, scroll wewnątrz */}
      <div className="flex-1 overflow-hidden min-h-0">
        <div
          key={animationKey.current}
          className={cn(
            "h-full overflow-y-auto",
            slideDirection === 'right'
              ? 'animate-wizard-slide-in-right'
              : 'animate-wizard-slide-in-left'
          )}
        >
          {renderStepContent()}
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-border shrink-0 flex items-center justify-between gap-4">
        {/* Left side - Cancel button */}
        <Button variant="ghost" onClick={onCloseAttempt} className="text-muted-foreground hover:text-foreground" data-testid="assign-wizard-close-btn">
          Anuluj
        </Button>

        {/* Right side - Navigation */}
        <div className="flex items-center gap-3">
          {!isFirstStep && (
            <Button variant="ghost" onClick={goBack} className="text-muted-foreground hover:text-foreground" data-testid="assign-wizard-back-btn">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Wstecz
            </Button>
          )}

          <Button
            onClick={isLastStep ? handleSubmit : goNext}
            disabled={isLoading || !canProceed()}
            className={cn(
              "shadow-lg shadow-primary/20 min-w-[160px] transition-all duration-300",
              isLastStep && "bg-gradient-to-r from-primary to-emerald-500 hover:from-primary-dark hover:to-emerald-600"
            )}
            data-testid={isLastStep ? "assign-summary-submit-btn" : "assign-wizard-next-btn"}
          >
            {assigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {getNextButtonText()}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Unassign confirmation dialog */}
      <ConfirmDialog
        open={unassignConfirm?.open ?? false}
        onOpenChange={(open) => !open && setUnassignConfirm(null)}
        title={unassignConfirm?.type === 'set' ? 'Odpisać zestaw?' : 'Odpisać pacjenta?'}
        description={
          unassignConfirm?.type === 'set'
            ? `Czy na pewno chcesz odpisać zestaw "${unassignConfirm?.name}" od tego pacjenta?`
            : `Czy na pewno chcesz odpisać pacjenta "${unassignConfirm?.name}" od tego zestawu?`
        }
        confirmText="Tak, odpisz"
        cancelText="Anuluj"
        variant="destructive"
        onConfirm={handleUnassignConfirm}
        isLoading={removing}
      />

    </DialogContent>
    </>
  );
}
