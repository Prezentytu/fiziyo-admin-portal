'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { Loader2, ArrowLeft, ArrowRight, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { addDays } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { defaultFrequency } from '@/components/exercise-sets/FrequencyPicker';

import { WizardStepIndicator } from './WizardStepIndicator';
import { SelectSetStep } from './SelectSetStep';
import { SelectPatientsStep } from './SelectPatientsStep';
import { CustomizeExercisesStep } from './CustomizeExercisesStep';
import { ScheduleStep } from './ScheduleStep';
import { SummaryStep } from './SummaryStep';
import {
  getWizardSteps,
  type AssignmentWizardProps,
  type WizardStep,
  type ExerciseSet,
  type Patient,
  type Frequency,
  type ExerciseOverride,
} from './types';

import { GET_ORGANIZATION_EXERCISE_SETS_QUERY } from '@/graphql/queries/exerciseSets.queries';
import { GET_THERAPIST_PATIENTS_QUERY } from '@/graphql/queries/therapists.queries';
import { ASSIGN_EXERCISE_SET_TO_PATIENT_MUTATION } from '@/graphql/mutations/exercises.mutations';
import { GET_PATIENT_ASSIGNMENTS_BY_USER_QUERY } from '@/graphql/queries/patientAssignments.queries';
import { GET_EXERCISE_SET_WITH_ASSIGNMENTS_QUERY } from '@/graphql/queries/exerciseSets.queries';
import type { TherapistPatientsResponse } from '@/types/apollo';

// Wrapper component that handles dialog state - content remounts on each open
export function AssignmentWizard(props: AssignmentWizardProps) {
  const { open, onOpenChange } = props;
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

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

  // Reset when dialog opens
  if (!open && hasChanges) {
    setHasChanges(false);
  }

  return (
    <Dialog open={open} onOpenChange={() => handleCloseAttempt()}>
      {open && (
        <AssignmentWizardContent
          {...props}
          onCloseAttempt={handleCloseAttempt}
          onHasChanges={setHasChanges}
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
  );
}

// Extended props for inner component
interface AssignmentWizardContentProps extends AssignmentWizardProps {
  onCloseAttempt: () => void;
  onHasChanges: (hasChanges: boolean) => void;
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

  // Track changes for close confirmation
  const hasChanges = !preselectedSet ? selectedSet !== null : selectedPatients.length > (preselectedPatient ? 1 : 0);
  
  // Notify parent about changes
  useMemo(() => {
    onHasChanges(hasChanges);
  }, [hasChanges, onHasChanges]);

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

  // Mutation
  const [assignSet, { loading: assigning }] = useMutation(ASSIGN_EXERCISE_SET_TO_PATIENT_MUTATION);

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
        // Exercise data with all fields
        exercise: m.exercise
          ? {
              id: m.exercise.id,
              name: m.exercise.name,
              type: m.exercise.type,
              description: m.exercise.description,
              exerciseSide: m.exercise.exerciseSide,
              imageUrl: m.exercise.imageUrl,
              images: m.exercise.images,
              videoUrl: m.exercise.videoUrl,
              notes: m.exercise.notes,
              // Exercise default values
              sets: m.exercise.sets,
              reps: m.exercise.reps,
              duration: m.exercise.duration,
              restSets: m.exercise.restSets,
              restReps: m.exercise.restReps,
              preparationTime: m.exercise.preparationTime,
              executionTime: m.exercise.executionTime,
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
      case 'customize':
        return {
          title: 'Personalizacja ćwiczeń',
          description: 'Dostosuj parametry ćwiczeń dla wybranych pacjentów (opcjonalnie)',
        };
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
      case 'customize':
        return true; // Always can skip
      case 'schedule':
        return true;
      case 'summary':
        return true;
      default:
        return false;
    }
  };

  const goToStep = (step: WizardStep) => {
    setCurrentStep(step);
  };

  const goNext = () => {
    const currentIndex = steps.findIndex((s) => s.id === currentStep);
    if (currentIndex < steps.length - 1) {
      setCompletedSteps((prev) => new Set([...prev, currentStep]));
      setCurrentStep(steps[currentIndex + 1].id);
    }
  };

  const goBack = () => {
    const currentIndex = steps.findIndex((s) => s.id === currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].id);
    }
  };

  const handleQuickAssign = async () => {
    if (!selectedSet || selectedPatients.length === 0) return;

    try {
      for (const patient of selectedPatients) {
        await assignSet({
          variables: {
            exerciseSetId: selectedSet.id,
            patientId: patient.id,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            frequency: {
              timesPerDay: String(frequency.timesPerDay),
              timesPerWeek: String(Object.values(frequency).filter((v) => v === true).length),
              breakBetweenSets: String(frequency.breakBetweenSets),
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
      }

      const patientCount = selectedPatients.length;
      toast.success(
        `Zestaw "${selectedSet.name}" przypisany do ${patientCount} pacjent${
          patientCount === 1 ? 'a' : patientCount < 5 ? 'ów' : 'ów'
        }`
      );
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Błąd przypisywania:', error);
      toast.error('Nie udało się przypisać zestawu');
    }
  };

  const handleSubmit = async () => {
    if (!selectedSet || selectedPatients.length === 0) return;

    try {
      for (const patient of selectedPatients) {
        await assignSet({
          variables: {
            exerciseSetId: selectedSet.id,
            patientId: patient.id,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            frequency: {
              timesPerDay: String(frequency.timesPerDay),
              timesPerWeek: String(Object.values(frequency).filter((v) => v === true).length),
              breakBetweenSets: String(frequency.breakBetweenSets),
              monday: frequency.monday,
              tuesday: frequency.tuesday,
              wednesday: frequency.wednesday,
              thursday: frequency.thursday,
              friday: frequency.friday,
              saturday: frequency.saturday,
              sunday: frequency.sunday,
            },
            // TODO: Add overrides when backend supports it
          },
          refetchQueries: [
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
      }

      const patientCount = selectedPatients.length;
      toast.success(
        `Zestaw "${selectedSet.name}" przypisany do ${patientCount} pacjent${
          patientCount === 1 ? 'a' : patientCount < 5 ? 'ów' : 'ów'
        }`
      );
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Błąd przypisywania:', error);
      toast.error('Nie udało się przypisać zestawu');
    }
  };

  const isLoading = loadingSets || loadingPatients || assigning;
  const isFirstStep = steps.length > 0 && currentStep === steps[0].id;
  const isLastStep = currentStep === 'summary';

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 'select-set':
        return (
          <SelectSetStep
            exerciseSets={exerciseSets}
            selectedSet={selectedSet}
            onSelectSet={setSelectedSet}
            loading={loadingSets}
          />
        );

      case 'select-patients':
        return (
          <SelectPatientsStep
            patients={patients}
            selectedPatients={selectedPatients}
            onSelectPatients={setSelectedPatients}
            loading={loadingPatients}
          />
        );

      case 'customize':
        if (!selectedSet) return null;
        return (
          <CustomizeExercisesStep exerciseSet={selectedSet} overrides={overrides} onOverridesChange={setOverrides} />
        );

      case 'schedule':
        if (!selectedSet) return null;
        return (
          <ScheduleStep
            exerciseSet={selectedSet}
            selectedPatients={selectedPatients}
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
          />
        );

      default:
        return null;
    }
  };

  return (
    <DialogContent
      className="max-w-5xl w-[95vw] max-h-[90vh] h-[85vh] flex flex-col p-0 gap-0"
      onInteractOutside={(e) => e.preventDefault()}
      onEscapeKeyDown={(e) => {
        e.preventDefault();
        onCloseAttempt();
      }}
    >
      {/* Header */}
      <DialogHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
        <div className="flex flex-col gap-4">
          <div>
            <DialogTitle className="text-xl">{stepInfo.title}</DialogTitle>
            <DialogDescription className="mt-1">{stepInfo.description}</DialogDescription>
          </div>
          <WizardStepIndicator
            steps={steps}
            currentStep={currentStep}
            completedSteps={completedSteps}
            onStepClick={goToStep}
            allowNavigation={completedSteps.size > 0}
          />
        </div>
      </DialogHeader>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">{renderStepContent()}</div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-border shrink-0 flex items-center justify-between gap-4">
        <div>
          {isFirstStep && canProceed() && (
            <Button variant="outline" onClick={handleQuickAssign} disabled={isLoading} className="gap-2">
              <Zap className="h-4 w-4" />
              Szybkie przypisanie
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {isFirstStep ? (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Anuluj
            </Button>
          ) : (
            <Button variant="outline" onClick={goBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Wstecz
            </Button>
          )}

          {isLastStep ? (
            <Button
              onClick={handleSubmit}
              disabled={isLoading || !canProceed()}
              className="shadow-lg shadow-primary/20 min-w-[140px]"
            >
              {assigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Przypisz zestaw
            </Button>
          ) : (
            <Button onClick={goNext} disabled={!canProceed()} className="shadow-lg shadow-primary/20">
              Dalej
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </DialogContent>
  );
}
