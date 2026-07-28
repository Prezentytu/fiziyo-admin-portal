'use client';

import * as React from 'react';
import { useState, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { useQuery, useMutation } from '@apollo/client/react';
import { Search, Plus, Minus, Loader2, Dumbbell, Clock, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ImagePlaceholder } from '@/components/shared/ImagePlaceholder';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import {
  DIFFICULTY_OPTIONS,
  ENABLE_EXTENDED_PATIENT_OVERRIDE_FIELDS,
  ENABLE_FULL_PATIENT_PERSONALIZATION,
  EXERCISE_FIELD_METADATA,
  SIDE_OPTIONS,
  replaceOverrideMapEntry,
} from '@/components/shared/exercise';
import { cn } from '@/lib/utils';
import { getMediaUrl } from '@/utils/mediaUrl';
import { useNumericDraft } from '@/hooks/useNumericDraft';
import { useOptionalNumericDraft } from '@/hooks/useOptionalNumericDraft';

import { GET_AVAILABLE_EXERCISES_QUERY } from '@/graphql/queries/exercises.queries';
import { UPDATE_PATIENT_EXERCISE_OVERRIDES_MUTATION } from '@/graphql/mutations/exercises.mutations';
import { GET_PATIENT_ASSIGNMENTS_BY_USER_QUERY } from '@/graphql/queries/patientAssignments.queries';
import type { PatientAssignment, ExerciseOverride } from './PatientAssignmentCard';
import { Textarea } from '@/components/ui/textarea';

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

// Generate unique ID for patient-added exercises
const generatePatientExerciseId = () => {
  return `patient-added-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
};

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

  const setsField = useNumericDraft({
    value: sets,
    onCommit: setSets,
    min: 1,
    parseMode: 'int',
  });

  const repsField = useNumericDraft({
    value: reps,
    onCommit: setReps,
    min: 1,
    parseMode: 'int',
  });

  const durationField = useOptionalNumericDraft({
    value: duration,
    onCommit: setDuration,
    min: 0,
    max: 3600,
  });

  const executionTimeField = useOptionalNumericDraft({
    value: executionTime,
    onCommit: setExecutionTime,
    min: 0,
    max: 300,
  });

  const restSetsField = useOptionalNumericDraft({
    value: restSets,
    onCommit: setRestSets,
    min: 0,
    max: 300,
  });

  const restRepsField = useOptionalNumericDraft({
    value: restReps,
    onCommit: setRestReps,
    min: 0,
    max: 300,
  });

  const preparationTimeField = useOptionalNumericDraft({
    value: preparationTime,
    onCommit: setPreparationTime,
    min: 0,
    max: 300,
  });

  const loadKgField = useOptionalNumericDraft({
    value: loadWeightKg,
    onCommit: setLoadWeightKg,
    min: 0,
    max: 500,
    parseMode: 'float',
  });

  // Get exercises from organization
  const { data: exercisesData, loading: loadingExercises } = useQuery(GET_AVAILABLE_EXERCISES_QUERY, {
    variables: { organizationId },
    skip: !organizationId,
  });

  // Mutation
  const [updateOverrides, { loading: saving }] = useMutation(UPDATE_PATIENT_EXERCISE_OVERRIDES_MUTATION);

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

  // Handle save
  const handleSave = async () => {
    if (!selectedExercise) return;

    try {
      const newId = generatePatientExerciseId();
      const newOverride: ExerciseOverride & { exerciseId?: string; isPatientAdded?: boolean } = {
        exerciseId: selectedExercise.id,
        sets,
        reps,
        duration,
        executionTime,
        restSets,
        restReps,
        notes: notes.trim() || undefined,
        exerciseSide,
        customName: customName.trim() || undefined,
        customDescription: customDescription.trim() || undefined,
        isPatientAdded: true,
      };
      if (ENABLE_EXTENDED_PATIENT_OVERRIDE_FIELDS) {
        newOverride.preparationTime = preparationTime;
        newOverride.tempo = tempo.trim() || undefined;
        newOverride.loadWeightKg = loadWeightKg;
        newOverride.rangeOfMotion = rangeOfMotion.trim() || undefined;
      }
      if (ENABLE_FULL_PATIENT_PERSONALIZATION) {
        newOverride.difficultyLevel = difficultyLevel;
        newOverride.patientDescription = patientDescription.trim() || undefined;
        newOverride.clinicalDescription = clinicalDescription.trim() || undefined;
        newOverride.audioCue = audioCue.trim() || undefined;
      }

      const exerciseOverrides = replaceOverrideMapEntry(
        assignment.exerciseOverrides,
        newId,
        newOverride
      );

      await updateOverrides({
        variables: {
          assignmentId: assignment.id,
          exerciseOverrides,
        },
        refetchQueries: [
          {
            query: GET_PATIENT_ASSIGNMENTS_BY_USER_QUERY,
            variables: { userId: patientId },
          },
        ],
      });

      toast.success(`Ćwiczenie "${selectedExercise.name}" zostało dodane do zestawu`);
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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Szukaj ćwiczeń..."
              className="pl-9"
              data-testid="add-exercise-search-input"
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
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => setSelectedExercise(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Parameters — same override field set as EditExerciseOverrideDialog */}
              <div className="space-y-4">
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Podstawowe parametry
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">{EXERCISE_FIELD_METADATA.sets.label}</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-11 w-11 shrink-0"
                        onClick={setsField.decrement}
                        disabled={!setsField.canDecrement}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        type="number"
                        value={setsField.draftValue}
                        onChange={(e) => setsField.setDraftValue(e.target.value)}
                        onFocus={setsField.handleFocus}
                        onBlur={setsField.handleBlur}
                        onKeyDown={setsField.handleKeyDown}
                        className="h-11 text-center text-lg font-semibold"
                        data-testid="add-exercise-sets-input"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-11 w-11 shrink-0"
                        onClick={setsField.increment}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">{EXERCISE_FIELD_METADATA.reps.label}</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-11 w-11 shrink-0"
                        onClick={repsField.decrement}
                        disabled={!repsField.canDecrement}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        type="number"
                        value={repsField.draftValue}
                        onChange={(e) => repsField.setDraftValue(e.target.value)}
                        onFocus={repsField.handleFocus}
                        onBlur={repsField.handleBlur}
                        onKeyDown={repsField.handleKeyDown}
                        className="h-11 text-center text-lg font-semibold"
                        data-testid="add-exercise-reps-input"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-11 w-11 shrink-0"
                        onClick={repsField.increment}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      {EXERCISE_FIELD_METADATA.executionTime.label} (s)
                    </Label>
                    <Input
                      type="number"
                      value={executionTimeField.draftValue}
                      onChange={(e) => executionTimeField.handleChange(e.target.value)}
                      onFocus={executionTimeField.handleFocus}
                      onBlur={executionTimeField.handleBlur}
                      onKeyDown={executionTimeField.handleKeyDown}
                      className="h-11"
                      data-testid="add-exercise-execution-time-input"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">{EXERCISE_FIELD_METADATA.duration.label} (s)</Label>
                    <Input
                      type="number"
                      value={durationField.draftValue}
                      onChange={(e) => durationField.handleChange(e.target.value)}
                      onFocus={durationField.handleFocus}
                      onBlur={durationField.handleBlur}
                      onKeyDown={durationField.handleKeyDown}
                      className="h-11"
                      step={5}
                      data-testid="add-exercise-duration-input"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">{EXERCISE_FIELD_METADATA.restSets.label} (s)</Label>
                    <Input
                      type="number"
                      value={restSetsField.draftValue}
                      onChange={(e) => restSetsField.handleChange(e.target.value)}
                      onFocus={restSetsField.handleFocus}
                      onBlur={restSetsField.handleBlur}
                      onKeyDown={restSetsField.handleKeyDown}
                      className="h-11"
                      data-testid="add-exercise-rest-sets-input"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">{EXERCISE_FIELD_METADATA.restReps.label} (s)</Label>
                    <Input
                      type="number"
                      value={restRepsField.draftValue}
                      onChange={(e) => restRepsField.handleChange(e.target.value)}
                      onFocus={restRepsField.handleFocus}
                      onBlur={restRepsField.handleBlur}
                      onKeyDown={restRepsField.handleKeyDown}
                      className="h-11"
                      data-testid="add-exercise-rest-reps-input"
                    />
                  </div>

                  {ENABLE_EXTENDED_PATIENT_OVERRIDE_FIELDS ? (
                    <>
                      <div className="space-y-2">
                        <Label className="text-sm">{EXERCISE_FIELD_METADATA.preparationTime.label} (s)</Label>
                        <Input
                          type="number"
                          value={preparationTimeField.draftValue}
                          onChange={(e) => preparationTimeField.handleChange(e.target.value)}
                          onFocus={preparationTimeField.handleFocus}
                          onBlur={preparationTimeField.handleBlur}
                          onKeyDown={preparationTimeField.handleKeyDown}
                          className="h-11"
                          data-testid="add-exercise-prep-time-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">{EXERCISE_FIELD_METADATA.tempo.label}</Label>
                        <Input
                          value={tempo}
                          onChange={(e) => setTempo(e.target.value)}
                          placeholder="np. 2-0-2-0"
                          className="h-11"
                          data-testid="add-exercise-tempo-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">{EXERCISE_FIELD_METADATA.load.label} (kg)</Label>
                        <Input
                          type="number"
                          value={loadKgField.draftValue}
                          onChange={(e) => loadKgField.handleChange(e.target.value)}
                          onFocus={loadKgField.handleFocus}
                          onBlur={loadKgField.handleBlur}
                          onKeyDown={loadKgField.handleKeyDown}
                          className="h-11"
                          step={0.5}
                          data-testid="add-exercise-load-kg-input"
                        />
                      </div>
                    </>
                  ) : null}

                  <div className="space-y-2 sm:col-span-2">
                    <Label className="text-sm">{EXERCISE_FIELD_METADATA.notes.label}</Label>
                    <Input
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="h-11"
                      data-testid="add-exercise-notes-input"
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label className="text-sm">{EXERCISE_FIELD_METADATA.side.label}</Label>
                    <select
                      value={exerciseSide}
                      onChange={(e) => setExerciseSide(e.target.value)}
                      className="flex h-11 w-full rounded-md border border-border bg-background px-3 text-sm"
                      data-testid="add-exercise-side-select"
                    >
                      {SIDE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {ENABLE_EXTENDED_PATIENT_OVERRIDE_FIELDS ? (
                    <div className="space-y-2 sm:col-span-2">
                      <Label className="text-sm">{EXERCISE_FIELD_METADATA.rangeOfMotion.label}</Label>
                      <Input
                        value={rangeOfMotion}
                        onChange={(e) => setRangeOfMotion(e.target.value)}
                        placeholder="np. 0–90°"
                        className="h-11"
                        data-testid="add-exercise-rom-input"
                      />
                    </div>
                  ) : null}

                  <div className="space-y-2 sm:col-span-2">
                    <Label className="text-sm">Własna nazwa</Label>
                    <Input
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="Nadpisz nazwę dla pacjenta"
                      className="h-11"
                      data-testid="add-exercise-custom-name-input"
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label className="text-sm">Własny opis</Label>
                    <Textarea
                      value={customDescription}
                      onChange={(e) => setCustomDescription(e.target.value)}
                      placeholder="Opis dla pacjenta"
                      className="min-h-[72px] resize-none"
                      data-testid="add-exercise-custom-description-input"
                    />
                  </div>

                  {ENABLE_FULL_PATIENT_PERSONALIZATION ? (
                    <>
                      <div className="space-y-2 sm:col-span-2">
                        <Label className="text-sm">{EXERCISE_FIELD_METADATA.difficultyLevel.label}</Label>
                        <select
                          value={difficultyLevel}
                          onChange={(e) => setDifficultyLevel(e.target.value)}
                          className="flex h-11 w-full rounded-md border border-border bg-background px-3 text-sm"
                          data-testid="add-exercise-difficulty-select"
                        >
                          {DIFFICULTY_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label className="text-sm">{EXERCISE_FIELD_METADATA.patientDescription.label}</Label>
                        <Textarea
                          value={patientDescription}
                          onChange={(e) => setPatientDescription(e.target.value)}
                          className="min-h-[72px] resize-none"
                          data-testid="add-exercise-patient-description-input"
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label className="text-sm">{EXERCISE_FIELD_METADATA.clinicalDescription.label}</Label>
                        <Textarea
                          value={clinicalDescription}
                          onChange={(e) => setClinicalDescription(e.target.value)}
                          className="min-h-[72px] resize-none"
                          data-testid="add-exercise-clinical-description-input"
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label className="text-sm">{EXERCISE_FIELD_METADATA.audioCue.label}</Label>
                        <Input
                          value={audioCue}
                          onChange={(e) => setAudioCue(e.target.value)}
                          className="h-11"
                          data-testid="add-exercise-audio-cue-input"
                        />
                      </div>
                    </>
                  ) : null}
                </div>
              </div>

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
                        key={exercise.id}
                        type="button"
                        onClick={() => handleSelectExercise(exercise)}
                        className={cn(
                          'flex items-start gap-3 p-3 rounded-xl border text-left transition-all',
                          'border-border/40 bg-surface/30 hover:bg-surface-light hover:border-primary/30'
                        )}
                        data-testid={`add-exercise-item-${exercise.id}`}
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
