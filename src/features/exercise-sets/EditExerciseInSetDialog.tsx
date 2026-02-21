'use client';

import * as React from 'react';
import { useState, useCallback, useMemo } from 'react';
import { useMutation } from '@apollo/client/react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ExerciseExecutionCard } from '@/components/shared/exercise';
import type { ExerciseExecutionCardData } from '@/components/shared/exercise';

import { UPDATE_EXERCISE_IN_SET_MUTATION } from '@/graphql/mutations/exercises.mutations';
import { GET_EXERCISE_SET_WITH_ASSIGNMENTS_QUERY } from '@/graphql/queries/exerciseSets.queries';

interface ExerciseMapping {
  id: string;
  exerciseId: string;
  exerciseSetId?: string;
  order?: number;
  sets?: number;
  reps?: number;
  duration?: number;
  restSets?: number;
  restReps?: number;
  preparationTime?: number;
  executionTime?: number;
  tempo?: string;
  notes?: string;
  customName?: string;
  customDescription?: string;
  exercise?: {
    id: string;
    name: string;
    patientDescription?: string;
    side?: string;
    thumbnailUrl?: string;
    defaultSets?: number;
    defaultReps?: number;
    defaultDuration?: number;
    defaultExecutionTime?: number;
    defaultRestBetweenSets?: number;
    defaultRestBetweenReps?: number;
    preparationTime?: number;
    description?: string;
    type?: string;
    imageUrl?: string;
    images?: string[];
    exerciseSide?: string;
  };
}

interface EditExerciseInSetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exerciseMapping: ExerciseMapping | null;
  exerciseSetId: string;
  onSuccess?: () => void;
}

function mappingToCardData(mapping: ExerciseMapping): ExerciseExecutionCardData {
  const exercise = mapping.exercise;
  const type = exercise?.type?.toLowerCase();
  const isTimeBased = type === 'time';
  return {
    id: mapping.id,
    displayName: mapping.customName ?? exercise?.name ?? 'Ćwiczenie',
    thumbnailUrl: exercise?.thumbnailUrl ?? exercise?.imageUrl ?? exercise?.images?.[0],
    sets: mapping.sets ?? exercise?.defaultSets ?? 3,
    reps: mapping.reps ?? exercise?.defaultReps ?? 10,
    duration: mapping.duration ?? exercise?.defaultDuration,
    executionTime: mapping.executionTime ?? exercise?.defaultExecutionTime,
    restSets: mapping.restSets ?? exercise?.defaultRestBetweenSets ?? 60,
    restReps: mapping.restReps ?? exercise?.defaultRestBetweenReps,
    preparationTime: mapping.preparationTime ?? exercise?.preparationTime,
    tempo: mapping.tempo,
    notes: mapping.notes ?? '',
    customName: mapping.customName,
    customDescription: mapping.customDescription,
    side: (exercise?.side ?? exercise?.exerciseSide ?? 'none')?.toLowerCase(),
    isTimeBased,
  };
}

export function EditExerciseInSetDialog({
  open,
  onOpenChange,
  exerciseMapping,
  exerciseSetId,
  onSuccess,
}: EditExerciseInSetDialogProps) {
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

  if (!open && hasChanges) {
    setHasChanges(false);
  }

  return (
    <Dialog open={open} onOpenChange={() => handleCloseAttempt()}>
      {open && exerciseMapping && (
        <EditExerciseInSetDialogContent
          exerciseMapping={exerciseMapping}
          exerciseSetId={exerciseSetId}
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
        cancelText="Kontynuuj edycję"
        variant="destructive"
        onConfirm={handleConfirmClose}
      />
    </Dialog>
  );
}

interface EditExerciseInSetDialogContentProps {
  exerciseMapping: ExerciseMapping;
  exerciseSetId: string;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  onCloseAttempt: () => void;
  onHasChanges: (hasChanges: boolean) => void;
}

function EditExerciseInSetDialogContent({
  exerciseMapping,
  exerciseSetId,
  onOpenChange,
  onSuccess,
  onCloseAttempt,
  onHasChanges,
}: EditExerciseInSetDialogContentProps) {
  const initialData = useMemo(() => mappingToCardData(exerciseMapping), [exerciseMapping]);
  const [draft, setDraft] = useState<ExerciseExecutionCardData>(initialData);

  const hasChanges = useMemo(() => {
    return (
      draft.sets !== initialData.sets ||
      draft.reps !== initialData.reps ||
      (draft.duration ?? 0) !== (initialData.duration ?? 0) ||
      (draft.executionTime ?? 0) !== (initialData.executionTime ?? 0) ||
      (draft.restSets ?? 0) !== (initialData.restSets ?? 0) ||
      (draft.restReps ?? 0) !== (initialData.restReps ?? 0) ||
      (draft.preparationTime ?? 0) !== (initialData.preparationTime ?? 0) ||
      (draft.notes ?? '') !== (initialData.notes ?? '') ||
      (draft.customName ?? '') !== (initialData.customName ?? '') ||
      (draft.customDescription ?? '') !== (initialData.customDescription ?? '') ||
      (draft.tempo ?? '') !== (initialData.tempo ?? '')
    );
  }, [draft, initialData]);

  React.useEffect(() => {
    onHasChanges(hasChanges);
  }, [hasChanges, onHasChanges]);

  const [updateExercise, { loading }] = useMutation(UPDATE_EXERCISE_IN_SET_MUTATION);

  const handleSave = useCallback(async () => {
    try {
      await updateExercise({
        variables: {
          exerciseId: exerciseMapping.exerciseId,
          exerciseSetId,
          sets: draft.sets ?? null,
          reps: draft.reps ?? null,
          duration: draft.duration ?? null,
          restSets: draft.restSets ?? null,
          restReps: draft.restReps ?? null,
          preparationTime: draft.preparationTime ?? null,
          executionTime: draft.executionTime ?? null,
          notes: draft.notes || null,
          customName: draft.customName || null,
          customDescription: draft.customDescription ?? null,
          tempo: draft.tempo || null,
        },
        refetchQueries: [
          {
            query: GET_EXERCISE_SET_WITH_ASSIGNMENTS_QUERY,
            variables: { exerciseSetId },
          },
        ],
      });

      toast.success('Parametry ćwiczenia zostały zaktualizowane');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Błąd podczas aktualizacji:', error);
      toast.error('Nie udało się zaktualizować parametrów');
    }
  }, [draft, exerciseMapping.exerciseId, exerciseSetId, onOpenChange, onSuccess, updateExercise]);

  const handleChange = useCallback((patch: Partial<ExerciseExecutionCardData>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  }, []);

  return (
    <DialogContent
      className="max-w-xl max-h-[90vh] flex flex-col p-0 overflow-hidden"
      onInteractOutside={(e) => e.preventDefault()}
      onEscapeKeyDown={(e) => {
        e.preventDefault();
        onCloseAttempt();
      }}
      data-testid="set-edit-exercise-dialog"
    >
      <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
        <DialogTitle>Edytuj parametry</DialogTitle>
        <DialogDescription>Dostosuj parametry ćwiczenia w tym zestawie</DialogDescription>
      </DialogHeader>

      <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-4">
        <ExerciseExecutionCard
          mode="edit"
          exercise={draft}
          onChange={handleChange}
          testIdPrefix="set-edit-exercise"
          defaultExpanded
        />
      </div>

      <div className="flex justify-end gap-3 px-6 py-4 border-t border-border bg-background/95 backdrop-blur-sm shrink-0">
        <Button variant="outline" onClick={onCloseAttempt} className="rounded-xl">
          Anuluj
        </Button>
        <Button
          onClick={handleSave}
          disabled={loading}
          className="rounded-xl font-semibold"
          data-testid="set-edit-exercise-submit-btn"
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Zapisz
        </Button>
      </div>
    </DialogContent>
  );
}
