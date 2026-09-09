'use client';

import * as React from 'react';
import { useState, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { useQuery, useMutation } from '@apollo/client/react';
import { Search, Loader2, Dumbbell, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ImagePlaceholder } from '@/components/shared/ImagePlaceholder';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import {
  ENABLE_EXTENDED_PATIENT_OVERRIDE_FIELDS,
  ENABLE_FULL_PATIENT_PERSONALIZATION,
  ExerciseParametersFields,
  buildMappingOverridesJson,
  buildOverrideDelta,
  mergeOverrideMap,
  type ExerciseFieldKey,
  type ExerciseParameterValues,
  type MappingOnlyFieldKey,
  type ParameterTestIdKind,
} from '@/components/shared/exercise';
import { cn } from '@/lib/utils';
import { getMediaUrl } from '@/utils/mediaUrl';
import { buildExerciseLoadMutationVars } from '@/utils/exerciseLoadMutation';

import { GET_AVAILABLE_EXERCISES_QUERY } from '@/graphql/queries/exercises.queries';
import {
  ADD_EXERCISE_TO_EXERCISE_SET_MUTATION,
  UPDATE_PATIENT_EXERCISE_OVERRIDES_MUTATION,
} from '@/graphql/mutations/exercises.mutations';
import { GET_PATIENT_ASSIGNMENTS_BY_USER_QUERY } from '@/graphql/queries/patientAssignments.queries';
import type { PatientAssignment } from './PatientAssignmentCard';

const ADD_FIELD_TESTID_MAP: Record<
  ExerciseFieldKey | MappingOnlyFieldKey,
  { input: string; info: string }
> = {
  sets: { input: 'add-exercise-sets-input', info: 'add-exercise-sets-info' },
  reps: { input: 'add-exercise-reps-input', info: 'add-exercise-reps-info' },
  executionTime: { input: 'add-exercise-execution-time-input', info: 'add-exercise-execution-time-info' },
  restSets: { input: 'add-exercise-rest-sets-input', info: 'add-exercise-rest-sets-info' },
  restReps: { input: 'add-exercise-rest-reps-input', info: 'add-exercise-rest-reps-info' },
  preparationTime: { input: 'add-exercise-prep-time-input', info: 'add-exercise-prep-time-info' },
  duration: { input: 'add-exercise-duration-input', info: 'add-exercise-duration-info' },
  load: { input: 'add-exercise-load-kg-input', info: 'add-exercise-load-kg-info' },
  tempo: { input: 'add-exercise-tempo-input', info: 'add-exercise-tempo-info' },
  side: { input: 'add-exercise-side-select', info: 'add-exercise-side-info' },
  rangeOfMotion: { input: 'add-exercise-rom-input', info: 'add-exercise-rom-info' },
  difficultyLevel: { input: 'add-exercise-difficulty-select', info: 'add-exercise-difficulty-info' },
  patientDescription: {
    input: 'add-exercise-patient-description-input',
    info: 'add-exercise-patient-description-info',
  },
  clinicalDescription: {
    input: 'add-exercise-clinical-description-input',
    info: 'add-exercise-clinical-description-info',
  },
  audioCue: { input: 'add-exercise-audio-cue-input', info: 'add-exercise-audio-cue-info' },
  notes: { input: 'add-exercise-notes-input', info: 'add-exercise-notes-info' },
  customName: { input: 'add-exercise-custom-name-input', info: 'add-exercise-custom-name-info' },
  customDescription: {
    input: 'add-exercise-custom-description-input',
    info: 'add-exercise-custom-description-info',
  },
};

// Types
interface Exercise {
  id: string;
  name: string;
  description?: string;
  patientDescription?: string;
  clinicalDescription?: string;
  audioCue?: string;
  rangeOfMotion?: string;
  difficultyLevel?: string;
  type?: string;
  side?: string;
  exerciseSide?: string;
  imageUrl?: string;
  images?: string[];
  sets?: number;
  reps?: number;
  duration?: number;
}

interface AddExerciseToPatientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment: PatientAssignment | null;
  patientId: string;
  organizationId: string;
  onSuccess?: () => void;
}

export function AddExerciseToPatientDialog({
  open,
  onOpenChange,
  assignment,
  patientId,
  organizationId,
  onSuccess,
}: AddExerciseToPatientDialogProps) {
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

  // Reset when dialog closes
  if (!open && hasChanges) {
    setHasChanges(false);
  }

  return (
    <Dialog open={open} onOpenChange={() => handleCloseAttempt()}>
      {open && assignment && (
        <AddExerciseToPatientDialogContent
          assignment={assignment}
          patientId={patientId}
          organizationId={organizationId}
          onOpenChange={onOpenChange}
          onSuccess={onSuccess}
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
        cancelText="Kontynuuj"
        variant="destructive"
        onConfirm={handleConfirmClose}
      />
    </Dialog>
  );
}

// Inner component
interface AddExerciseToPatientDialogContentProps {
  assignment: PatientAssignment;
  patientId: string;
  organizationId: string;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  onCloseAttempt: () => void;
  onHasChanges: (hasChanges: boolean) => void;
}

function AddExerciseToPatientDialogContent({
  assignment,
  patientId,
  organizationId,
  onOpenChange,
  onSuccess,
  onCloseAttempt,
  onHasChanges,
}: AddExerciseToPatientDialogContentProps) {
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(10);
  const [duration, setDuration] = useState<number | undefined>(30);
  const [executionTime, setExecutionTime] = useState<number | undefined>(undefined);
  const [restSets, setRestSets] = useState<number | undefined>(60);
  const [restReps, setRestReps] = useState<number | undefined>(undefined);
  const [preparationTime, setPreparationTime] = useState<number | undefined>(undefined);
  const [tempo, setTempo] = useState('');
  const [loadWeightKg, setLoadWeightKg] = useState<number | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [exerciseSide, setExerciseSide] = useState('both');
  const [rangeOfMotion, setRangeOfMotion] = useState('');
  const [customName, setCustomName] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [difficultyLevel, setDifficultyLevel] = useState('UNKNOWN');
  const [patientDescription, setPatientDescription] = useState('');
  const [clinicalDescription, setClinicalDescription] = useState('');
  const [audioCue, setAudioCue] = useState('');

  const parameterValues = useMemo<ExerciseParameterValues>(
    () => ({
      sets,
      reps,
      executionTime: executionTime ?? null,
      duration: duration ?? null,
      restSets: restSets ?? null,
      restReps: restReps ?? null,
      preparationTime: preparationTime ?? null,
      loadKg: loadWeightKg ?? null,
      tempo,
      rangeOfMotion,
      side: exerciseSide,
      difficultyLevel,
      patientDescription,
      clinicalDescription,
      audioCue,
      notes,
      customName,
      customDescription,
    }),
    [
      sets,
      reps,
      executionTime,
      duration,
      restSets,
      restReps,
      preparationTime,
      loadWeightKg,
      tempo,
      rangeOfMotion,
      exerciseSide,
      difficultyLevel,
      patientDescription,
      clinicalDescription,
      audioCue,
      notes,
      customName,
      customDescription,
    ]
  );

  const handleParametersChange = useCallback((patch: Partial<ExerciseParameterValues>) => {
    if ('sets' in patch && patch.sets != null) setSets(patch.sets);
    if ('reps' in patch && patch.reps != null) setReps(patch.reps);
    if ('executionTime' in patch) setExecutionTime(patch.executionTime ?? undefined);
    if ('duration' in patch) setDuration(patch.duration ?? undefined);
    if ('restSets' in patch) setRestSets(patch.restSets ?? undefined);
    if ('restReps' in patch) setRestReps(patch.restReps ?? undefined);
    if ('preparationTime' in patch) setPreparationTime(patch.preparationTime ?? undefined);
    if ('loadKg' in patch) setLoadWeightKg(patch.loadKg ?? undefined);
    if ('tempo' in patch) setTempo(patch.tempo ?? '');
    if ('rangeOfMotion' in patch) setRangeOfMotion(patch.rangeOfMotion ?? '');
    if ('side' in patch && patch.side != null) setExerciseSide(patch.side);
    if ('difficultyLevel' in patch && patch.difficultyLevel != null) {
      setDifficultyLevel(patch.difficultyLevel);
    }
    if ('patientDescription' in patch) setPatientDescription(patch.patientDescription ?? '');
    if ('clinicalDescription' in patch) setClinicalDescription(patch.clinicalDescription ?? '');
    if ('audioCue' in patch) setAudioCue(patch.audioCue ?? '');
    if ('notes' in patch) setNotes(patch.notes ?? '');
    if ('customName' in patch) setCustomName(patch.customName ?? '');
    if ('customDescription' in patch) setCustomDescription(patch.customDescription ?? '');
  }, []);

  const addTestIdFor = useCallback(
    (key: ExerciseFieldKey | MappingOnlyFieldKey, kind: ParameterTestIdKind) => {
      const mapped = ADD_FIELD_TESTID_MAP[key];
      return kind === 'info' ? mapped.info : mapped.input;
    },
    []
  );

    // Get exercises from organization
  const { data: exercisesData, loading: loadingExercises } = useQuery(GET_AVAILABLE_EXERCISES_QUERY, {
    variables: { organizationId },
    skip: !organizationId,
  });

  const [addExerciseToSet, { loading: adding }] = useMutation(ADD_EXERCISE_TO_EXERCISE_SET_MUTATION);
  const [updateOverrides, { loading: updatingOverrides }] = useMutation(
    UPDATE_PATIENT_EXERCISE_OVERRIDES_MUTATION
  );
  const saving = adding || updatingOverrides;

  // Get existing exercise IDs in the assignment to filter them out
  const existingExerciseIds = useMemo(() => {
    const ids = new Set<string>();
    assignment.exerciseSet?.exerciseMappings?.forEach((m) => {
      if (m.exerciseId) ids.add(m.exerciseId);
    });
    return ids;
  }, [assignment]);

  // Filter exercises
  const exercises: Exercise[] = useMemo(() => {
    const data = exercisesData as { availableExercises?: Exercise[] } | undefined;
    const all = data?.availableExercises || [];

    // Filter out exercises already in the set
    const filtered = all.filter((e) => !existingExerciseIds.has(e.id));

    // Apply search filter
    if (!searchQuery.trim()) return filtered;

    const query = searchQuery.toLowerCase();
    return filtered.filter((e) => e.name.toLowerCase().includes(query) || e.description?.toLowerCase().includes(query));
  }, [exercisesData, existingExerciseIds, searchQuery]);

  // Track changes
  const hasChanges = selectedExercise !== null;

  React.useEffect(() => {
    onHasChanges(hasChanges);
  }, [hasChanges, onHasChanges]);

  // When exercise is selected, initialize params
  const handleSelectExercise = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setSets(exercise.sets || 3);
    setReps(exercise.reps || 10);
    setDuration(exercise.duration || 30);
    setExecutionTime(undefined);
    setRestSets(60);
    setRestReps(undefined);
    setPreparationTime(undefined);
    setTempo('');
    setLoadWeightKg(undefined);
    setNotes('');
    setExerciseSide(
      (exercise.side ?? exercise.exerciseSide ?? 'both').toString().toLowerCase()
    );
    setRangeOfMotion(exercise.rangeOfMotion ?? '');
    setCustomName('');
    setCustomDescription('');
    setDifficultyLevel(exercise.difficultyLevel ?? 'UNKNOWN');
    setPatientDescription(exercise.patientDescription ?? exercise.description ?? '');
    setClinicalDescription(exercise.clinicalDescription ?? '');
    setAudioCue(exercise.audioCue ?? '');
  };

  // Handle save — real mapping on PATIENT_PLAN (not synthetic isPatientAdded JSON).
  const handleSave = async () => {
    if (!selectedExercise) return;
    const exerciseSetId = assignment.exerciseSetId ?? assignment.exerciseSet?.id;
    if (!exerciseSetId) {
      toast.error('Brak planu pacjenta do dodania ćwiczenia');
      return;
    }

    try {
      const nextOrder = (assignment.exerciseSet?.exerciseMappings?.length ?? 0) + 1;
      const overridesJson = buildMappingOverridesJson(
        {
          side: selectedExercise.side ?? selectedExercise.exerciseSide,
          exerciseSide: selectedExercise.exerciseSide ?? selectedExercise.side,
          rangeOfMotion: selectedExercise.rangeOfMotion,
          difficultyLevel: selectedExercise.difficultyLevel,
          patientDescription: selectedExercise.patientDescription ?? selectedExercise.description,
          clinicalDescription: selectedExercise.clinicalDescription,
          audioCue: selectedExercise.audioCue,
        },
        {
          side: exerciseSide,
          rangeOfMotion: ENABLE_EXTENDED_PATIENT_OVERRIDE_FIELDS ? rangeOfMotion : undefined,
          difficultyLevel: ENABLE_FULL_PATIENT_PERSONALIZATION ? difficultyLevel : undefined,
          patientDescription: ENABLE_FULL_PATIENT_PERSONALIZATION ? patientDescription : undefined,
          clinicalDescription: ENABLE_FULL_PATIENT_PERSONALIZATION
            ? clinicalDescription
            : undefined,
          audioCue: ENABLE_FULL_PATIENT_PERSONALIZATION ? audioCue : undefined,
        }
      );

      const refetchAssignments = [
        {
          query: GET_PATIENT_ASSIGNMENTS_BY_USER_QUERY,
          variables: { userId: patientId },
        },
      ];

      const addResult = await addExerciseToSet({
        variables: {
          exerciseId: selectedExercise.id,
          exerciseSetId,
          order: nextOrder,
          sets,
          reps,
          duration: duration ?? null,
          restSets: restSets ?? null,
          restReps: restReps ?? null,
          preparationTime: ENABLE_EXTENDED_PATIENT_OVERRIDE_FIELDS
            ? (preparationTime ?? null)
            : null,
          executionTime: executionTime ?? null,
          notes: notes.trim() || null,
          customName: customName.trim() || null,
          customDescription: customDescription.trim() || null,
          tempo: ENABLE_EXTENDED_PATIENT_OVERRIDE_FIELDS ? tempo.trim() || null : null,
          ...buildExerciseLoadMutationVars(
            ENABLE_EXTENDED_PATIENT_OVERRIDE_FIELDS ? loadWeightKg : undefined
          ),
          overridesJson: overridesJson ?? '',
        },
        refetchQueries: refetchAssignments,
        awaitRefetchQueries: true,
      });

      const mappingId = (
        addResult.data as { addExerciseToExerciseSet?: { id?: string } } | undefined
      )?.addExerciseToExerciseSet?.id;

      if (mappingId && ENABLE_FULL_PATIENT_PERSONALIZATION) {
        const clinicalDelta = buildOverrideDelta(
          {
            side: selectedExercise.side ?? selectedExercise.exerciseSide,
            exerciseSide: selectedExercise.exerciseSide ?? selectedExercise.side,
            difficultyLevel: selectedExercise.difficultyLevel,
            patientDescription: selectedExercise.patientDescription ?? selectedExercise.description,
            clinicalDescription: selectedExercise.clinicalDescription,
            audioCue: selectedExercise.audioCue,
          },
          {
            side: exerciseSide,
            difficultyLevel,
            patientDescription,
            clinicalDescription,
            audioCue,
          }
        );
        if (Object.keys(clinicalDelta).length > 0) {
          const exerciseOverrides = mergeOverrideMap(
            assignment.exerciseOverrides,
            mappingId,
            clinicalDelta
          );
          await updateOverrides({
            variables: {
              assignmentId: assignment.id,
              exerciseOverrides,
            },
          });
        }
      }

      toast.success(`Ćwiczenie "${selectedExercise.name}" zostało dodane do planu`);
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Błąd dodawania ćwiczenia:', error);
      toast.error('Nie udało się dodać ćwiczenia');
    }
  };

  const setName = assignment.exerciseSet?.name || 'Nieznany zestaw';

  return (
    <DialogContent
      className="max-w-2xl max-h-[90vh] flex flex-col p-0"
      onInteractOutside={(e) => e.preventDefault()}
      onEscapeKeyDown={(e) => {
        e.preventDefault();
        onCloseAttempt();
      }}
      data-testid="add-exercise-to-patient-dialog"
    >
      <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
        <DialogTitle className="flex items-center gap-2">
          <Dumbbell className="h-5 w-5 text-primary" />
          Dodaj ćwiczenie
        </DialogTitle>
        <DialogDescription>Dodaj ćwiczenie do zestawu &quot;{setName}&quot; tylko dla tego pacjenta</DialogDescription>
      </DialogHeader>

      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Search */}
        <div className="px-6 py-4 border-b border-border/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              data-testid="add-exercise-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Szukaj ćwiczeń..."
              className="pl-9"
            />
          </div>
        </div>

        {selectedExercise ? (
          // Selected exercise - configure params
          <div className="flex-1 overflow-auto px-6 py-4">
            <div className="space-y-6">
              {/* Selected exercise preview */}
              <div className="flex items-start gap-4 p-4 rounded-xl border border-primary/30 bg-primary/5">
                <div className="relative h-20 w-20 rounded-xl overflow-hidden shrink-0 bg-surface-light">
                  {getMediaUrl(selectedExercise.imageUrl || selectedExercise.images?.[0]) ? (
                    <Image
                      src={getMediaUrl(selectedExercise.imageUrl || selectedExercise.images?.[0]) || ''}
                      alt={selectedExercise.name}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  ) : (
                    <ImagePlaceholder type="exercise" iconClassName="h-8 w-8" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-lg">{selectedExercise.name}</p>
                  </div>
                  {selectedExercise.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{selectedExercise.description}</p>
                  )}
                </div>
                <Button
                  data-testid="add-exercise-clear-selection-btn"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => setSelectedExercise(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <ExerciseParametersFields
                surface="patientOverride"
                values={parameterValues}
                onChange={handleParametersChange}
                showContentSection
                showMappingOnlyFields
                density="comfortable"
                advancedDefaultOpen={false}
                testIdFor={addTestIdFor}
                structuralTestIdPrefix="add-exercise"
              />

                            {/* Info note */}
              <div className="rounded-xl bg-info/5 border border-info/20 p-3">
                <p className="text-xs text-muted-foreground">
                  To ćwiczenie zostanie dodane <strong>tylko dla tego pacjenta</strong>. Oryginalny zestaw nie zostanie
                  zmodyfikowany.
                </p>
              </div>
            </div>
          </div>
        ) : (
          // Exercise selection grid
          <ScrollArea className="flex-1">
            <div className="px-6 py-4">
              {loadingExercises ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : exercises.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Dumbbell className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">
                    {searchQuery ? 'Nie znaleziono ćwiczeń' : 'Brak dostępnych ćwiczeń'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {exercises.map((exercise) => {
                    const imageUrl = getMediaUrl(exercise.imageUrl || exercise.images?.[0]);
                    return (
                      <button
                        data-testid={`add-exercise-item-${exercise.id}`}
                        key={exercise.id}
                        type="button"
                        onClick={() => handleSelectExercise(exercise)}
                        className={cn(
                          'flex items-start gap-3 p-3 rounded-xl border text-left transition-all',
                          'border-border/40 bg-surface/30 hover:bg-surface-light hover:border-primary/30'
                        )}
                      >
                        <div className="relative h-14 w-14 rounded-lg overflow-hidden shrink-0 bg-surface-light">
                          {imageUrl ? (
                            <Image src={imageUrl} alt={exercise.name} fill className="object-cover" sizes="56px" />
                          ) : (
                            <ImagePlaceholder type="exercise" iconClassName="h-5 w-5" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{exercise.name}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-3 px-6 py-4 border-t border-border bg-background">
        <Button variant="outline" onClick={onCloseAttempt} data-testid="add-exercise-cancel-btn">
          Anuluj
        </Button>
        <Button
          onClick={handleSave}
          disabled={!selectedExercise || saving}
          className="shadow-lg shadow-primary/20"
          data-testid="add-exercise-submit-btn"
        >
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Dodaj ćwiczenie
        </Button>
      </div>
    </DialogContent>
  );
}
