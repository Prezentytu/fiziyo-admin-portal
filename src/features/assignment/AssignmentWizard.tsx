'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, ArrowRight, Users, Calendar, Pencil, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { addDays, differenceInDays, format } from 'date-fns';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ExerciseDialog } from '@/features/exercises/ExerciseDialog';
import { PatientDialog } from '@/features/patients/PatientDialog';
import { defaultFrequency } from '@/features/exercise-sets/FrequencyPicker';

import { WizardStepIndicator } from './WizardStepIndicator';
import { SelectSetStep } from './SelectSetStep';
import { SelectPatientsStep } from './SelectPatientsStep';
import { CustomizeSetStep } from './CustomizeSetStep';
import { ScheduleStep } from './ScheduleStep';
import { SummaryStep } from './SummaryStep';
import { AssignmentSuccessDialog } from './AssignmentSuccessDialog';
import type { ExerciseInstance, ExerciseParams } from '@/components/shared/ExerciseSetBuilder';
import { canProceedFromStep } from './utils/assignmentWizardUtils';
import { decideAssignmentPlanMode, type AssignmentExecutionMode } from './utils/assignmentPlanDecision';
import { buildStructuredLoad, mapAvailableExercises } from './utils/availableExercisesMapper';
import { appendPatientIfMissing } from './utils/patientSelectionUtils';
import { calculateEstimatedTime } from '@/utils/exerciseTime';
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

import { aiService } from '@/services/aiService';

import {
  GET_ORGANIZATION_EXERCISE_SETS_QUERY,
  GET_EXERCISE_SET_WITH_ASSIGNMENTS_QUERY,
} from '@/graphql/queries/exerciseSets.queries';
import { GET_ORGANIZATION_PATIENTS_QUERY } from '@/graphql/queries/therapists.queries';
import {
  ASSIGN_EXERCISE_SET_TO_PATIENT_MUTATION,
  REMOVE_EXERCISE_SET_ASSIGNMENT_MUTATION,
  CREATE_EXERCISE_SET_MUTATION,
  ADD_EXERCISE_TO_EXERCISE_SET_MUTATION,
} from '@/graphql/mutations/exercises.mutations';
import { GET_AVAILABLE_EXERCISES_QUERY } from '@/graphql/queries/exercises.queries';
import { GET_PATIENT_ASSIGNMENTS_BY_USER_QUERY } from '@/graphql/queries/patientAssignments.queries';
import { GET_CURRENT_BILLING_STATUS_QUERY } from '@/graphql/queries/billing.queries';
import type { OrganizationPatientsResponse } from '@/types/apollo';

// Success dialog data type
interface SuccessDialogData {
  patients: Array<{ id: string; name: string; email?: string }>;
  setName: string;
  assignmentMode: AssignmentExecutionMode;
  premiumValidUntil: string | null;
  exerciseSet: ExerciseSet;
  frequency: Frequency;
}

// Wrapper component that handles dialog state - content remounts on each open
export function AssignmentWizard(props: AssignmentWizardProps) {
  const { open, onOpenChange, therapistId, organizationId } = props;
  const router = useRouter();
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
  const handleAssignmentSuccess = useCallback(
    (data: SuccessDialogData) => {
      // Close the wizard dialog
      onOpenChange(false);
      setSuccessData(data);
      setShowSuccessDialog(true);
    },
    [onOpenChange]
  );

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
          assignmentMode={successData.assignmentMode}
          premiumValidUntil={successData.premiumValidUntil}
          therapistId={therapistId}
          organizationId={organizationId}
          exerciseSet={successData.exerciseSet}
          frequency={successData.frequency}
          onViewPlan={() => {
            const detailQuery = new URLSearchParams({
              from: 'patient-plans',
              filter: 'patient-plans',
              highlight: successData.exerciseSet.id,
            });
            router.push(`/exercise-sets/${successData.exerciseSet.id}?${detailQuery.toString()}`);
          }}
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
  onOpenChange: _onOpenChange,
  mode,
  preselectedSet,
  preselectedPatient,
  organizationId,
  therapistId: _therapistId,
  onSuccess,
  onCloseAttempt,
  onHasChanges,
  onAssignmentSuccess,
}: AssignmentWizardContentProps) {
  // State for customize-set mode - true when creating new set, false when customizing existing
  const [isCreatingNewSet, setIsCreatingNewSet] = useState(false);

  // Compute dynamic steps based on what's preselected and if creating new set
  const steps = useMemo(
    () => getWizardSteps(mode, !!preselectedSet, !!preselectedPatient, isCreatingNewSet),
    [mode, preselectedSet, preselectedPatient, isCreatingNewSet]
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingName, setIsGeneratingName] = useState(false);

  // Ghost Copy state - lokalna tablica ćwiczeń (nie dotyka bazy)
  const [localExercises, setLocalExercises] = useState<LocalExerciseMapping[]>([]);
  // Nazwa planu dla pacjenta (Assignment name)
  const [planName, setPlanName] = useState<string>('');
  // Opcjonalny zapis kopii do biblioteki organizacji
  const [saveAsOrganizationSet, setSaveAsOrganizationSet] = useState(false);
  const [organizationSetName, setOrganizationSetName] = useState<string>('');
  // Wykluczone ćwiczenia (legacy - pustý Set bo customize step został usunięty)
  const [excludedExercises] = useState<Set<string>>(new Set());

  // State for CustomizeSetStep builder
  const [builderInstances, setBuilderInstances] = useState<ExerciseInstance[]>([]);
  const [builderParams, setBuilderParams] = useState<Map<string, ExerciseParams>>(new Map());
  const [isExerciseDialogOpen, setIsExerciseDialogOpen] = useState(false);
  const [isPatientDialogOpen, setIsPatientDialogOpen] = useState(false);

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
    // Clear create-new mode when selecting existing set
    setIsCreatingNewSet(false);

    // Ghost Copy - kopiuj ćwiczenia do lokalnego stanu (nie dotyka bazy)
    if (set?.exerciseMappings) {
      setLocalExercises(set.exerciseMappings.map(createGhostCopy));

      // Also populate builder state for customize-set step
      const instances: ExerciseInstance[] = [];
      const params = new Map<string, ExerciseParams>();

      set.exerciseMappings.forEach((mapping) => {
        const instanceId = `existing-${mapping.id}`;
        instances.push({
          instanceId,
          exerciseId: mapping.exerciseId,
        });
        params.set(instanceId, {
          sets: mapping.sets ?? undefined,
          reps: mapping.reps ?? undefined,
          duration: mapping.duration ?? undefined,
          restSets: mapping.restSets ?? undefined,
          restReps: mapping.restReps ?? undefined,
          executionTime: mapping.executionTime ?? undefined,
          preparationTime: mapping.preparationTime ?? undefined,
          tempo: mapping.tempo ?? '',
          load: mapping.load ?? undefined,
          notes: mapping.notes ?? '',
          customName: mapping.customName ?? '',
          customDescription: mapping.customDescription ?? '',
        });
      });

      setBuilderInstances(instances);
      setBuilderParams(params);
    } else {
      setLocalExercises([]);
      setBuilderInstances([]);
      setBuilderParams(new Map());
    }

    // Set plan name (dla pacjenta) i nazwa zestawu organizacji (dla biblioteki)
    const baseName = set?.name || 'Nowy Plan';
    setPlanName(baseName);
    setOrganizationSetName(`${baseName} (organizacja)`);
    setSaveAsOrganizationSet(false);

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

  // Queries - load sets if needed (from-patient mode, no preselected set, or user navigates to select-set step)
  const needsSets = mode === 'from-patient' || !preselectedSet || currentStep === 'select-set';
  const { data: setsData, loading: loadingSets } = useQuery(GET_ORGANIZATION_EXERCISE_SETS_QUERY, {
    variables: { organizationId },
    skip: !organizationId || !open || !needsSets,
  });

  // Load patients if needed (from-set mode or no preselected patient)
  const needsPatients = !preselectedPatient;
  const { data: patientsData, loading: loadingPatients, refetch: refetchPatientsList } = useQuery(GET_ORGANIZATION_PATIENTS_QUERY, {
    variables: { organizationId, filter: 'all' },
    skip: !organizationId || !open || !needsPatients,
  });
  const isLoadingPatientsInitially = loadingPatients && !patientsData;

  // Load patient's existing assignments (for from-patient mode - to show which sets are already assigned)
  const { data: patientAssignmentsData, refetch: refetchPatientAssignments } = useQuery(
    GET_PATIENT_ASSIGNMENTS_BY_USER_QUERY,
    {
      variables: { userId: preselectedPatient?.id || '' },
      skip: !preselectedPatient?.id || !open || mode !== 'from-patient',
    }
  );

  // Load exercise set's existing assignments (for from-set mode OR when a set is selected in from-patient mode)
  // This allows showing which patients already have the selected set
  const effectiveSetId = preselectedSet?.id || selectedSet?.id;
  const { data: setAssignmentsData, refetch: refetchSetAssignments } = useQuery(
    GET_EXERCISE_SET_WITH_ASSIGNMENTS_QUERY,
    {
      variables: { exerciseSetId: effectiveSetId || '' },
      skip: !effectiveSetId || !open,
    }
  );

  // Load available exercises for Rapid Builder (includes global FiziYo exercises)
  const { data: exercisesData, refetch: refetchAvailableExercises } = useQuery(GET_AVAILABLE_EXERCISES_QUERY, {
    variables: { organizationId },
    skip: !organizationId || !open,
  });

  // Mutations
  const [assignSet, { loading: assigning }] = useMutation(ASSIGN_EXERCISE_SET_TO_PATIENT_MUTATION);
  const [removeAssignment, { loading: removing }] = useMutation(REMOVE_EXERCISE_SET_ASSIGNMENT_MUTATION);
  const [createExerciseSet] = useMutation(CREATE_EXERCISE_SET_MUTATION, {
    refetchQueries: [{ query: GET_ORGANIZATION_EXERCISE_SETS_QUERY, variables: { organizationId } }],
    awaitRefetchQueries: true,
  });
  const [addExerciseToSet] = useMutation(ADD_EXERCISE_TO_EXERCISE_SET_MUTATION, {
    refetchQueries: [{ query: GET_ORGANIZATION_EXERCISE_SETS_QUERY, variables: { organizationId } }],
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
      kind: set.kind,
      templateSource: set.templateSource,
      reviewStatus: set.reviewStatus,
      sourceExerciseSetId: set.sourceExerciseSetId,
      frequency: set.frequency,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      exerciseMappings: set.exerciseMappings?.map((m: any) => {
        const mappingLoad = buildStructuredLoad({
          type: m.loadType,
          value: m.loadValue,
          unit: m.loadUnit,
          text: m.loadText,
        });
        const exerciseLoad =
          buildStructuredLoad(m.exercise?.defaultLoad) ??
          buildStructuredLoad({
            type: m.exercise?.loadType,
            value: m.exercise?.loadValue,
            unit: m.exercise?.loadUnit,
            text: m.exercise?.loadText,
          });

        return {
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
        preparationTime: m.preparationTime,
        executionTime: m.executionTime,
        tempo: m.tempo,
        load: mappingLoad,
        loadType: m.loadType,
        loadValue: m.loadValue,
        loadUnit: m.loadUnit,
        loadText: m.loadText,
        notes: m.notes,
        customName: m.customName,
        customDescription: m.customDescription,
        videoUrl: m.videoUrl,
        imageUrl: m.imageUrl,
        images: m.images,
        // Exercise data with all fields (support both new and legacy names)
        exercise: m.exercise
          ? {
              id: m.exercise.id,
              name: m.exercise.name,
              type: m.exercise.type,
              // Support both new and legacy field names
              description: m.exercise.patientDescription || m.exercise.description,
              patientDescription: m.exercise.patientDescription,
              clinicalDescription: m.exercise.clinicalDescription,
              audioCue: m.exercise.audioCue,
              rangeOfMotion: m.exercise.rangeOfMotion,
              side: m.exercise.side,
              exerciseSide: m.exercise.side?.toLowerCase() || m.exercise.exerciseSide,
              imageUrl: m.exercise.thumbnailUrl || m.exercise.imageUrl,
              thumbnailUrl: m.exercise.thumbnailUrl,
              images: m.exercise.images,
              gifUrl: m.exercise.gifUrl,
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
              tempo: m.exercise.tempo,
              defaultLoad: exerciseLoad,
              loadType: m.exercise.loadType,
              loadValue: m.exercise.loadValue,
              loadUnit: m.exercise.loadUnit,
              loadText: m.exercise.loadText,
              defaultSets: m.exercise.defaultSets,
              defaultReps: m.exercise.defaultReps,
              defaultDuration: m.exercise.defaultDuration,
              defaultRestBetweenSets: m.exercise.defaultRestBetweenSets,
              defaultRestBetweenReps: m.exercise.defaultRestBetweenReps,
              defaultExecutionTime: m.exercise.defaultExecutionTime,
              mainTags: m.exercise.mainTags,
              additionalTags: m.exercise.additionalTags,
              difficultyLevel: m.exercise.difficultyLevel,
              scope: m.exercise.scope,
              status: m.exercise.status,
            }
          : undefined,
      };
      }),
    }));
  }, [setsData]);

  const assignableSourceSets = useMemo(
    () => exerciseSets.filter((set) => set.kind === 'TEMPLATE' || set.isTemplate === true),
    [exerciseSets]
  );

  const patients: Patient[] = useMemo(() => {
    const data = patientsData as OrganizationPatientsResponse | undefined;
    return (data?.organizationPatients || [])
      .filter((entry) => !!entry.patient?.id)
      .map((entry) => ({
        id: entry.patient.id,
        name: entry.patient.fullname || 'Nieznany',
        email: entry.patient.email,
        image: entry.patient.image,
        isShadowUser: entry.patient.isShadowUser,
      }));
  }, [patientsData]);

  // Process patient's assigned sets (for from-patient mode)
  const assignedSets: AssignedSetInfo[] = useMemo(() => {
    if (mode !== 'from-patient' || !patientAssignmentsData) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const assignments = (patientAssignmentsData as any)?.patientAssignments || [];

    return (
      assignments
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((a: any) => a.exerciseSetId) // Only exercise set assignments
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((a: any) => ({
          exerciseSetId: a.exerciseSetId,
          assignmentId: a.id,
          assignedAt: a.assignedAt,
          status: a.status,
        }))
    );
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

  // Process available exercises for Rapid Builder (includes global FiziYo exercises)
  const availableExercises: Exercise[] = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = exercisesData as { availableExercises?: any[] } | undefined;
    return mapAvailableExercises(data?.availableExercises);
  }, [exercisesData]);

  // Handle create new set - sets mode to creating new and navigates to customize step
  const handleCreateSet = useCallback((searchQuery?: string) => {
    const today = format(new Date(), 'dd.MM.yyyy');

    // Użyj przekazanej nazwy z wyszukiwarki lub domyślnej
    const baseName = searchQuery && searchQuery.trim().length > 0
      ? searchQuery.trim()
      : 'Nowy zestaw';

    const setNamePattern = preselectedPatient
      ? `Plan dla ${preselectedPatient.name} - ${today}`
      : `${baseName} - ${today}`;

    // Reset builder state for new set
    setBuilderInstances([]);
    setBuilderParams(new Map());
    setPlanName(setNamePattern);
    setOrganizationSetName(`${setNamePattern} (organizacja)`);
    setSaveAsOrganizationSet(false);

    // Clear any previously selected set
    setSelectedSet(null);
    setLocalExercises([]);

    // Switch to creating-new mode and navigate to customize step
    setIsCreatingNewSet(true);
    setCurrentStep('customize-set');
  }, [preselectedPatient]);

  const restoreFocusAfterDialog = useCallback((selector: string) => {
    window.setTimeout(() => {
      const element = document.querySelector<HTMLElement>(selector);
      element?.focus();
    }, 80);
  }, []);

  const handleExerciseDialogSuccess = useCallback(
    async (event?: { action: 'updated' | 'copied' | 'created'; exerciseId: string }) => {
      if (!event || event.action !== 'created') {
        return;
      }

      const refetchResult = await refetchAvailableExercises();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const refreshedData = refetchResult.data as { availableExercises?: any[] } | undefined;
      const refreshedExercises = mapAvailableExercises(refreshedData?.availableExercises);
      const createdExercise = refreshedExercises.find((exercise) => exercise.id === event.exerciseId);

      if (!createdExercise) {
        toast.success('Ćwiczenie utworzone. Możesz dodać je z listy wyszukiwarki.');
        restoreFocusAfterDialog('[data-testid="create-set-step"], [data-testid="customize-set-step"]');
        return;
      }

      const alreadyExists = builderInstances.some((instance) => instance.exerciseId === createdExercise.id);
      if (alreadyExists) {
        toast.success(`Ćwiczenie "${createdExercise.name}" jest już w planie`);
        restoreFocusAfterDialog('[data-testid="create-set-step"], [data-testid="customize-set-step"]');
        return;
      }

      const newInstanceId = `new-${createdExercise.id}-${Date.now()}`;
      setBuilderInstances((previous) => [
        ...previous,
        {
          instanceId: newInstanceId,
          exerciseId: createdExercise.id,
        },
      ]);

      setBuilderParams((previous) => {
        const next = new Map(previous);
        next.set(newInstanceId, {
          sets: createdExercise.defaultSets ?? undefined,
          reps: createdExercise.defaultReps ?? undefined,
          duration: createdExercise.defaultDuration ?? undefined,
          restSets: createdExercise.defaultRestBetweenSets ?? undefined,
          restReps: createdExercise.defaultRestBetweenReps ?? undefined,
          executionTime: createdExercise.defaultExecutionTime ?? undefined,
          preparationTime: createdExercise.preparationTime ?? undefined,
          tempo: createdExercise.tempo ?? '',
          load: buildStructuredLoad({
            type: createdExercise.loadType ?? undefined,
            value: createdExercise.loadValue ?? undefined,
            unit: createdExercise.loadUnit ?? undefined,
            text: createdExercise.loadText ?? undefined,
          }),
          notes: createdExercise.notes ?? '',
          customName: '',
          customDescription: '',
        });
        return next;
      });

      toast.success(`Dodano ćwiczenie "${createdExercise.name}" do planu`);
      restoreFocusAfterDialog('[data-testid="create-set-step"], [data-testid="customize-set-step"]');
    },
    [builderInstances, refetchAvailableExercises, restoreFocusAfterDialog]
  );

  const handlePatientCreated = useCallback(
    (patient: Patient) => {
      setSelectedPatients((previous) => appendPatientIfMissing(previous, patient));
      toast.success(`Pacjent "${patient.name}" został dodany i zaznaczony`);
      restoreFocusAfterDialog('[data-testid="assign-patient-search"]');

      // Keep list freshness, but never block selection UX on network.
      void refetchPatientsList().catch((error) => {
        console.error('Nie udało się odświeżyć listy pacjentów po dodaniu:', error);
      });
    },
    [refetchPatientsList, restoreFocusAfterDialog]
  );

  // AI: Generowanie ulepszonej nazwy planu na podstawie wybranych ćwiczeń
  const handleGenerateAIName = useCallback(async () => {
    if (builderInstances.length === 0) {
      toast.error('Dodaj przynajmniej jedno ćwiczenie, aby AI mogło zasugerować nazwę');
      return;
    }

    try {
      setIsGeneratingName(true);
      // Pobieramy pełne nazwy ćwiczeń na podstawie instance.exerciseId
      const exerciseNames = builderInstances
        .map((instance) => availableExercises.find((e) => e.id === instance.exerciseId)?.name)
        .filter((name): name is string => Boolean(name));

      const response = await aiService.suggestSetName(planName, exerciseNames);

      if (response && response.suggestedName) {
        setPlanName(response.suggestedName);
        toast.success('Nazwa została wygenerowana');
      } else {
        toast.error('AI nie zwróciło poprawnej nazwy');
      }
    } catch (error) {
      toast.error('Nie udało się wygenerować nazwy');
      console.error(error);
    } finally {
      setIsGeneratingName(false);
    }
  }, [builderInstances, availableExercises, planName]);

  // Ghost Copy - synchronizuj localExercises gdy zmieni się selectedSet z zewnątrz (z query)
  useEffect(() => {
    if (selectedSet && exerciseSets.length > 0) {
      const updatedSet = exerciseSets.find((s) => s.id === selectedSet.id);
      // Tylko przy pierwszym załadowaniu (gdy localExercises jest puste)
      if (updatedSet && localExercises.length === 0 && updatedSet.exerciseMappings?.length) {
        setLocalExercises(updatedSet.exerciseMappings.map(createGhostCopy));
      }
    }
  }, [exerciseSets, selectedSet, localExercises.length]);

  // From set-details: preselectedSet is passed but sets query is skipped → init state from preselectedSet
  useEffect(() => {
    if (!open || !preselectedSet || localExercises.length > 0) return;
    const set = preselectedSet;
    if (set.exerciseMappings?.length) {
      setLocalExercises(set.exerciseMappings.map(createGhostCopy));
      const instances: ExerciseInstance[] = [];
      const params = new Map<string, ExerciseParams>();
      set.exerciseMappings.forEach((mapping) => {
        const instanceId = `existing-${mapping.id}`;
        instances.push({
          instanceId,
          exerciseId: mapping.exerciseId,
        });
        params.set(instanceId, {
          sets: mapping.sets ?? undefined,
          reps: mapping.reps ?? undefined,
          duration: mapping.duration ?? undefined,
          restSets: mapping.restSets ?? undefined,
          restReps: mapping.restReps ?? undefined,
          executionTime: mapping.executionTime ?? undefined,
          preparationTime: mapping.preparationTime ?? undefined,
          tempo: mapping.tempo ?? '',
          load: mapping.load ?? undefined,
          notes: mapping.notes ?? '',
          customName: mapping.customName ?? '',
          customDescription: mapping.customDescription ?? '',
        });
      });
      setBuilderInstances(instances);
      setBuilderParams(params);
    }
    setPlanName(set.name || 'Nowy Plan');
    setOrganizationSetName(`${set.name || 'Nowy Plan'} (organizacja)`);
    setSaveAsOrganizationSet(false);
    if (set.frequency) {
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
  }, [open, preselectedSet, localExercises.length]);

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

  const assignmentPlanDecision = useMemo(
    () =>
      decideAssignmentPlanMode({
        sourceSet: selectedSet,
        isCreatingNewSet,
        planName,
        saveAsTemplate: saveAsOrganizationSet,
        builderInstances,
        builderParams,
      }),
    [selectedSet, isCreatingNewSet, planName, saveAsOrganizationSet, builderInstances, builderParams]
  );

  // Determine step title and description
  const getStepInfo = () => {
    switch (currentStep) {
      case 'select-set':
        return {
          title: 'Wybierz zestaw ćwiczeń',
          description: preselectedPatient
            ? `Wybierz zestaw dla pacjenta ${preselectedPatient.name}`
            : 'Wybierz zestaw ćwiczeń do personalizacji i przypisania',
        };
      case 'customize-set':
        return {
          title: isCreatingNewSet ? 'Tworzenie planu pacjenta' : 'Personalizacja planu pacjenta',
          description: isCreatingNewSet
            ? preselectedPatient
              ? `Utwórz plan dla pacjenta ${preselectedPatient.name}`
              : 'Dodaj ćwiczenia i skonfiguruj plan pacjenta'
            : preselectedPatient
              ? `Dostosuj nazwę i ćwiczenia planu dla pacjenta ${preselectedPatient.name}`
              : 'Dostosuj nazwę i parametry planu pacjenta',
        };
      case 'select-patients':
        return {
          title: 'Wybierz pacjentów',
          description: selectedSet
            ? `Wybierz pacjentów dla planu "${selectedSet.name}"`
            : planName
              ? `Wybierz pacjentów dla planu "${planName}"`
              : 'Wybierz pacjentów do przypisania',
        };
      case 'schedule':
        return {
          title: 'Harmonogram',
          description: 'Ustal okres i częstotliwość wykonywania ćwiczeń',
        };
      case 'summary':
        return {
          title: 'Podsumowanie',
          description: 'Sprawdź i potwierdź utworzenie planu oraz przypisanie',
        };
      default:
        return { title: '', description: '' };
    }
  };

  const stepInfo = getStepInfo();

  // Navigation
  const canProceed = useCallback(
    () =>
      canProceedFromStep(currentStep, {
        selectedSet,
        builderInstancesLength: builderInstances.length,
        planNameTrimLength: planName.trim().length,
        selectedPatientsCount: selectedPatients.length,
      }),
    [currentStep, selectedSet, builderInstances.length, planName, selectedPatients.length]
  );

  // Track animation direction
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');
  const [_isAnimating, _setIsAnimating] = useState(false);
  const animationKey = useRef(0);

  const goToStep = (step: WizardStep) => {
    const targetIndex = steps.findIndex((s) => s.id === step);
    const currentIdx = steps.findIndex((s) => s.id === currentStep);
    setSlideDirection(targetIndex > currentIdx ? 'right' : 'left');
    animationKey.current += 1;
    setCurrentStep(step);
  };

  const goNext = useCallback(() => {
    const currentIndex = steps.findIndex((s) => s.id === currentStep);
    if (currentIndex < steps.length - 1) {
      setSlideDirection('right');
      animationKey.current += 1;
      setCompletedSteps((prev) => new Set([...prev, currentStep]));
      setCurrentStep(steps[currentIndex + 1].id);
    }
  }, [steps, currentStep]);

  const goBack = useCallback(() => {
    const currentIndex = steps.findIndex((s) => s.id === currentStep);
    if (currentIndex > 0) {
      setSlideDirection('left');
      animationKey.current += 1;
      setCurrentStep(steps[currentIndex - 1].id);
    }
  }, [steps, currentStep]);

  // Calculate duration for context summary
  const durationDays = differenceInDays(endDate, startDate);

  const estimatedSessionDurationSeconds = useMemo(() => {
    return builderInstances.reduce((totalSeconds, instance) => {
      const params = builderParams.get(instance.instanceId);
      const exercise = availableExercises.find((item) => item.id === instance.exerciseId);
      const exerciseType = exercise?.type?.toLowerCase();
      const isTimeBasedExercise = exerciseType === 'time';

      const sets = params?.sets ?? exercise?.defaultSets ?? 3;
      const reps = params?.reps ?? exercise?.defaultReps ?? 10;
      const executionTime = params?.executionTime ?? exercise?.defaultExecutionTime;
      const restBetweenSets = params?.restSets ?? exercise?.defaultRestBetweenSets ?? 60;
      const duration = isTimeBasedExercise ? (params?.duration ?? exercise?.defaultDuration) : undefined;

      return (
        totalSeconds +
        calculateEstimatedTime({
          sets,
          reps,
          duration,
          executionTime,
          rest: restBetweenSets,
        })
      );
    }, 0);
  }, [availableExercises, builderInstances, builderParams]);

  const buildAddExerciseVariables = useCallback(
    (instance: ExerciseInstance, exerciseSetId: string, order: number) => {
      const params = builderParams.get(instance.instanceId);
      const exercise = availableExercises.find((item) => item.id === instance.exerciseId);

      const normalizeText = (value?: string) => {
        if (!value) return null;
        const trimmedValue = value.trim();
        return trimmedValue.length > 0 ? trimmedValue : null;
      };

      return {
        exerciseId: instance.exerciseId,
        exerciseSetId,
        order,
        sets: params?.sets ?? exercise?.defaultSets ?? 3,
        reps: params?.reps ?? exercise?.defaultReps ?? 10,
        duration: params?.duration ?? exercise?.defaultDuration ?? null,
        restSets: params?.restSets ?? exercise?.defaultRestBetweenSets ?? null,
        restReps: params?.restReps ?? exercise?.defaultRestBetweenReps ?? null,
        preparationTime: params?.preparationTime ?? exercise?.preparationTime ?? null,
        executionTime: params?.executionTime ?? exercise?.defaultExecutionTime ?? null,
        tempo: normalizeText(params?.tempo),
        notes: normalizeText(params?.notes),
        customName: normalizeText(params?.customName),
        customDescription: normalizeText(params?.customDescription),
        loadType: normalizeText(params?.loadType),
        loadValue: params?.loadValue ?? null,
        loadUnit: normalizeText(params?.loadUnit),
        loadText: normalizeText(params?.loadText),
      };
    },
    [availableExercises, builderParams]
  );

  const handleSubmit = async () => {
    // Need either: creating new set with exercises, or customizing existing set
    if (builderInstances.length === 0) return;
    if (selectedPatients.length === 0) return;
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      let lastPremiumValidUntil: string | null = null;

      let exerciseSetIdToAssign = '';
      let effectiveSetForSuccess: ExerciseSet | null = null;

      setIsCreatingSet(true);
      try {
        const createResult = await createExerciseSet({
          variables: {
            organizationId,
            name: planName.trim(),
            description: isCreatingNewSet ? null : `Plan pacjenta utworzony na bazie: ${selectedSet?.name || 'zestawu'}`,
            kind: 'PATIENT_PLAN',
            sourceExerciseSetId: selectedSet?.id ?? null,
            isTemplate: false,
          },
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const newSet = (createResult.data as any)?.createExerciseSet;
        if (!newSet?.id) {
          throw new Error('Nie udało się utworzyć planu pacjenta');
        }

        for (let i = 0; i < builderInstances.length; i++) {
          const instance = builderInstances[i];
          const exercise = availableExercises.find((item) => item.id === instance.exerciseId);

          try {
            await addExerciseToSet({
              variables: buildAddExerciseVariables(instance, newSet.id, i + 1),
            });
          } catch (error) {
            const exerciseName = exercise?.name || 'Nieznane cwiczenie';
            console.error('Błąd dodawania ćwiczenia do planu:', error);
            throw new Error(`Nie udalo sie dodac cwiczenia "${exerciseName}" do planu pacjenta`);
          }
        }

        exerciseSetIdToAssign = newSet.id;
        effectiveSetForSuccess = {
          id: newSet.id,
          name: planName.trim(),
          description: undefined,
          exerciseMappings: [],
        };
      } catch (createError) {
        console.error('Błąd tworzenia planu pacjenta:', createError);
        toast.error('Nie udało się utworzyć planu pacjenta');
        setIsCreatingSet(false);
        return;
      } finally {
        setIsCreatingSet(false);
      }

      // Jeśli saveAsOrganizationSet - utwórz DODATKOWY zestaw organizacji (kopia do ponownego użycia)
      if (saveAsOrganizationSet && organizationSetName.trim() && builderInstances.length > 0) {
        try {
          const organizationSetResult = await createExerciseSet({
            variables: {
              organizationId,
              name: organizationSetName.trim(),
              description: `Zestaw organizacji utworzony z planu: ${planName}`,
              kind: 'TEMPLATE',
              templateSource: 'ORGANIZATION_PRIVATE',
              reviewStatus: 'DRAFT',
              sourceExerciseSetId: exerciseSetIdToAssign,
              isTemplate: true,
            },
          });

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const organizationSet = (organizationSetResult.data as any)?.createExerciseSet;
          if (organizationSet?.id) {
            for (let i = 0; i < builderInstances.length; i++) {
              const instance = builderInstances[i];
              const exercise = availableExercises.find((item) => item.id === instance.exerciseId);

              try {
                await addExerciseToSet({
                  variables: buildAddExerciseVariables(instance, organizationSet.id, i + 1),
                });
              } catch (error) {
                const exerciseName = exercise?.name || 'Nieznane cwiczenie';
                console.error('Błąd dodawania ćwiczenia do zestawu organizacji:', error);
                throw new Error(`Nie udalo sie dodac cwiczenia "${exerciseName}" do zestawu organizacji`);
              }
            }
            toast.success(`Zapisano zestaw organizacji "${organizationSetName}"`);
          }
        } catch (organizationSetError) {
          console.error('Błąd tworzenia zestawu organizacji:', organizationSetError);
          toast.error('Nie udało się zapisać zestawu organizacji, ale przypisanie będzie kontynuowane');
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
        const effectiveTimesPerWeek = selectedDaysCount > 0 ? selectedDaysCount : frequency.timesPerWeek || 3;

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
            // Refresh sets list to update assignment counters on cards
            { query: GET_ORGANIZATION_EXERCISE_SETS_QUERY, variables: { organizationId } },
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

      }

      if (!effectiveSetForSuccess) {
        throw new Error('Nie udało się przygotować danych utworzonego planu');
      }

      // 🎯 Beta Pilot Flow: Pokazuj QR dialog zamiast zamykać od razu
      // Call parent to show success dialog (lifted state to wrapper)
      onAssignmentSuccess({
        patients: selectedPatients.map((p) => ({
          id: p.id,
          name: p.name,
          email: p.email,
        })),
        setName: planName || effectiveSetForSuccess?.name || 'Nowy plan pacjenta',
        assignmentMode: assignmentPlanDecision.mode,
        premiumValidUntil: lastPremiumValidUntil,
        exerciseSet: effectiveSetForSuccess,
        frequency,
      });

      // Notify success callback
      onSuccess?.();
    } catch (error) {
      console.error('Błąd przypisywania:', error);
      const errorMessage = error instanceof Error ? error.message : null;
      toast.error(errorMessage || 'Nie udało się przypisać zestawu');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = loadingSets || loadingPatients || assigning || removing || isSubmitting;
  const isFirstStep = steps.length > 0 && currentStep === steps[0].id;
  const isLastStep = currentStep === 'summary';
  const handleSubmitRef = useRef(handleSubmit);

  useEffect(() => {
    handleSubmitRef.current = handleSubmit;
  }, [handleSubmit]);

  // Get contextual next button text
  const getNextButtonText = () => {
    const currentIndex = steps.findIndex((s) => s.id === currentStep);
    const nextStep = steps[currentIndex + 1];

    if (isLastStep) {
      if (isSubmitting) {
        return 'Tworzenie planu...';
      }
      return 'Utwórz plan i przypisz';
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
          handleSubmitRef.current();
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
  }, [isFirstStep, isLastStep, canProceed, goNext, goBack]);

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 'select-set':
        return (
          <SelectSetStep
            exerciseSets={assignableSourceSets}
            selectedSet={selectedSet}
            onSelectSet={handleSetChange}
            assignedSets={assignedSets}
            onUnassign={(assignmentId, setName) => handleUnassignRequest(assignmentId, setName, 'set')}
            loading={loadingSets}
            // Phantom Set props
            onCreateSet={handleCreateSet}
            isCreatingSet={isCreatingSet}
            patientName={preselectedPatient?.name}
          />
        );

      case 'customize-set':
        return (
          <CustomizeSetStep
            planName={planName}
            onPlanNameChange={setPlanName}
            isCreatingNew={isCreatingNewSet}
            sourceSetName={selectedSet?.name}
            selectedInstances={builderInstances}
            onSelectedInstancesChange={setBuilderInstances}
            exerciseParams={builderParams}
            onExerciseParamsChange={setBuilderParams}
            availableExercises={availableExercises}
            loadingExercises={false}
            organizationId={organizationId}
            patientName={preselectedPatient?.name}
            showAI={true}
            hideNameSection
            onCreateExercise={() => setIsExerciseDialogOpen(true)}
            isCreatingExercise={isExerciseDialogOpen}
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
            loading={isLoadingPatientsInitially}
            onCreatePatient={_therapistId ? () => setIsPatientDialogOpen(true) : undefined}
            isCreatingPatient={isPatientDialogOpen}
          />
        );

      case 'schedule':
        // When creating new set, we use builderInstances instead of selectedSet
        if (!isCreatingNewSet && !selectedSet) return null;
        return (
          <ScheduleStep
            startDate={startDate}
            endDate={endDate}
            frequency={frequency}
            estimatedSessionDurationSeconds={estimatedSessionDurationSeconds}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onFrequencyChange={setFrequency}
          />
        );

      case 'summary': {
        // Need either a selected set (customized) or creating new set
        if (builderInstances.length === 0) return null;

        // Always build exercise set from builder state (it's always customized in customize-set step)
        const summaryExerciseSet: ExerciseSet = {
          id: isCreatingNewSet ? 'new-set' : selectedSet?.id || 'customized-set',
          name: planName,
          description: selectedSet?.description,
          exerciseMappings: builderInstances.map((instance, index) => {
            const exercise = availableExercises.find((e) => e.id === instance.exerciseId);
            const params = builderParams.get(instance.instanceId);
            return {
              id: instance.instanceId,
              exerciseId: instance.exerciseId,
              order: index + 1,
              sets: params?.sets,
              reps: params?.reps,
              duration: params?.duration,
              restSets: params?.restSets,
              restReps: params?.restReps,
              executionTime: params?.executionTime,
              preparationTime: params?.preparationTime,
              tempo: params?.tempo,
              load: params?.load,
              notes: params?.notes,
              customName: params?.customName,
              customDescription: params?.customDescription,
              exercise: exercise,
            };
          }),
        };

        const summaryLocalExercises =
          summaryExerciseSet.exerciseMappings?.map((m) => ({
            ...m,
            isNew: isCreatingNewSet,
          })) || [];

        return (
          <SummaryStep
            exerciseSet={summaryExerciseSet}
            localExercises={summaryLocalExercises}
            selectedPatients={selectedPatients}
            startDate={startDate}
            endDate={endDate}
            frequency={frequency}
            overrides={overrides}
            excludedExercises={excludedExercises}
            saveAsTemplate={saveAsOrganizationSet}
            onSaveAsTemplateChange={setSaveAsOrganizationSet}
            onGoToStep={goToStep}
          />
        );
      }

      default:
        return null;
    }
  };

  return (
    <>
      <DialogContent
        className="max-w-7xl w-[98vw] max-h-[95vh] h-[90vh] md:h-[85vh] flex flex-col p-0 gap-0 overflow-hidden"
        hideCloseButton
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          onCloseAttempt();
        }}
        data-testid="assign-wizard"
      >
        <VisuallyHidden.Root>
          <DialogTitle>Personalizacja i przypisanie – {stepInfo.title}</DialogTitle>
        </VisuallyHidden.Root>
        {/* Toolbar: row-1 = eyebrow (h-7), row-2 = input + stepper + X (h-9). All on same grid → perfect alignment */}
        <div className="shrink-0 bg-surface/95 backdrop-blur-sm border-b border-border px-6">
          {/* Row 1: eyebrow — fixed height with padding */}
          <div className="h-7 flex items-end pb-1">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 leading-none">
              Personalizacja i przypisanie
            </span>
          </div>
          {/* Row 2: input (left) + stepper + X (right) — all h-9, same row → centers aligned by definition */}
          <div className="h-11 flex items-center gap-0 -mx-1">
            {/* Left: plan name editable or step title */}
            <div className="w-full lg:w-[40%] min-w-0 pr-3 flex items-center gap-1">
              {(currentStep !== 'select-set' || selectedSet || isCreatingNewSet) ? (
                <label className="flex-1 flex h-9 items-center min-w-0 rounded-md border border-transparent px-1.5 focus-within:bg-surface focus-within:border-border focus-within:ring-1 focus-within:ring-primary/20 transition-colors cursor-text hover:bg-surface-light/50">
                  <input
                    type="text"
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    placeholder="Nazwa planu pacjenta"
                    autoComplete="off"
                    data-testid="wizard-plan-name-input"
                    className="peer flex-1 min-w-0 bg-transparent text-base font-semibold text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-0 border-none p-0 cursor-text"
                  />
                  <Pencil className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0 ml-2 peer-focus:hidden transition-opacity pointer-events-none" aria-hidden />
                  <button
                    type="button"
                    title="Wygeneruj nazwę AI"
                    className={cn(
                      "p-1.5 rounded-md text-muted-foreground hover:text-secondary hover:bg-secondary/10 shrink-0 transition-colors ml-1 relative z-10",
                      isGeneratingName && "opacity-50 pointer-events-none cursor-not-allowed"
                    )}
                    data-testid="wizard-plan-name-ai-btn"
                    aria-label="Wygeneruj nazwę AI"
                    onClick={(e) => { e.preventDefault(); handleGenerateAIName(); }}
                    disabled={isGeneratingName}
                  >
                    {isGeneratingName ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                  </button>
                </label>
              ) : (
                <span className="flex h-9 items-center text-base font-semibold text-muted-foreground/60 truncate min-w-0 px-1.5">
                  {stepInfo.title}
                </span>
              )}
            </div>
            {/* Right: context chip + stepper + X — all h-9, centered in the same row */}
            <div className="flex-1 flex items-center gap-3 min-w-0 pl-3">
              {selectedPatients.length > 0 || currentStep === 'summary' ? (
                <div className="hidden sm:flex items-center gap-2 px-2 py-1 rounded-md bg-surface-light/40 text-[10px] text-muted-foreground shrink-0">
                  {selectedPatients.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span className="font-medium">{selectedPatients.length} {selectedPatients.length === 1 ? 'pacjent' : 'pacjentów'}</span>
                    </div>
                  )}
                  {selectedPatients.length > 0 && currentStep === 'summary' && (
                    <span className="text-border">·</span>
                  )}
                  {currentStep === 'summary' && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span className="font-medium">{durationDays} dni</span>
                    </div>
                  )}
                </div>
              ) : null}
              <div className="flex-1 min-w-0 flex items-center justify-end gap-2">
                <WizardStepIndicator
                  steps={steps}
                  currentStep={currentStep}
                  completedSteps={completedSteps}
                  onStepClick={goToStep}
                  allowNavigation={completedSteps.size > 0}
                  variant="compact"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onCloseAttempt}
                className="h-9 w-9 min-w-9 shrink-0 text-muted-foreground hover:text-foreground rounded-md"
                data-testid="assign-wizard-close-btn"
                aria-label="Zamknij"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {/* Bottom padding row — same height as eyebrow row to center the main row vertically */}
          <div className="h-7" />
        </div>

        {/* Content - overflow-hidden dla clip animacji, scroll wewnątrz */}
        <div className="flex-1 overflow-hidden min-h-0">
          <div
            key={animationKey.current}
            className={cn(
              'h-full overflow-y-auto',
              slideDirection === 'right' ? 'animate-wizard-slide-in-right' : 'animate-wizard-slide-in-left'
            )}
          >
            {renderStepContent()}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border shrink-0 flex items-center justify-between gap-4">
          {/* Left side - Cancel button */}
          <Button
            variant="ghost"
            onClick={onCloseAttempt}
            className="text-muted-foreground hover:text-foreground"
            data-testid="assign-wizard-close-btn"
          >
            Anuluj
          </Button>

          {/* Right side - Navigation */}
          <div className="flex items-center gap-3">
            {currentStep === 'schedule' && (
              <label
                className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-surface-light/40 px-3 py-2"
                data-testid="assign-schedule-save-template-toggle"
              >
                <Switch
                  checked={saveAsOrganizationSet}
                  onCheckedChange={setSaveAsOrganizationSet}
                  data-testid="assign-schedule-save-template-switch"
                />
                <span className="text-xs font-medium text-foreground" data-testid="assign-schedule-save-template-label">
                  Zapisz także jako zestaw organizacji
                </span>
              </label>
            )}
            {!isFirstStep && (
              <Button
                variant="ghost"
                onClick={goBack}
                className="text-muted-foreground hover:text-foreground"
                data-testid="assign-wizard-back-btn"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Wstecz
              </Button>
            )}

            <Button
              onClick={isLastStep ? handleSubmit : goNext}
              disabled={isLoading || !canProceed()}
              className={cn(
                'shadow-lg shadow-primary/20 min-w-[160px] transition-all duration-300',
                isLastStep &&
                  'bg-linear-to-r from-primary to-primary hover:from-primary-dark hover:to-primary-dark'
              )}
              data-testid={isLastStep ? 'assign-summary-submit-btn' : 'assign-wizard-next-btn'}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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

      <ExerciseDialog
        open={isExerciseDialogOpen}
        onOpenChange={setIsExerciseDialogOpen}
        organizationId={organizationId}
        onSuccess={handleExerciseDialogSuccess}
      />

      {_therapistId && (
        <PatientDialog
          open={isPatientDialogOpen}
          onOpenChange={setIsPatientDialogOpen}
          organizationId={organizationId}
          therapistId={_therapistId}
          embeddedMode="assignment"
          onPatientCreated={handlePatientCreated}
        />
      )}
    </>
  );
}
