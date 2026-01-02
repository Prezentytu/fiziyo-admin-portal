'use client';

import * as React from 'react';
import { useState, useCallback } from 'react';
import { useMutation } from '@apollo/client/react';
import { Loader2, Plus, Minus } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ImagePlaceholder } from '@/components/shared/ImagePlaceholder';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { getMediaUrl } from '@/utils/mediaUrl';

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
  notes?: string;
  customName?: string;
  customDescription?: string;
  exercise?: {
    id: string;
    name: string;
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

// Wrapper component that handles dialog state
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

  // Reset when dialog closes
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

// Inner component with form state - remounts on each dialog open
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
  // State initialized directly from props (no useEffect needed)
  const [sets, setSets] = useState(exerciseMapping.sets || 0);
  const [reps, setReps] = useState(exerciseMapping.reps || 0);
  const [duration, setDuration] = useState(exerciseMapping.duration || 0);
  const [restSets, setRestSets] = useState(exerciseMapping.restSets || 0);
  const [restReps, setRestReps] = useState(exerciseMapping.restReps || 0);
  const [notes, setNotes] = useState(exerciseMapping.notes || '');
  const [customName, setCustomName] = useState(exerciseMapping.customName || '');
  const [customDescription, setCustomDescription] = useState(exerciseMapping.customDescription || '');

  // Track changes
  const hasChanges =
    sets !== (exerciseMapping.sets || 0) ||
    reps !== (exerciseMapping.reps || 0) ||
    duration !== (exerciseMapping.duration || 0) ||
    restSets !== (exerciseMapping.restSets || 0) ||
    restReps !== (exerciseMapping.restReps || 0) ||
    notes !== (exerciseMapping.notes || '') ||
    customName !== (exerciseMapping.customName || '') ||
    customDescription !== (exerciseMapping.customDescription || '');

  // Notify parent
  React.useEffect(() => {
    onHasChanges(hasChanges);
  }, [hasChanges, onHasChanges]);

  const [updateExercise, { loading }] = useMutation(UPDATE_EXERCISE_IN_SET_MUTATION);

  const handleSave = async () => {
    if (!exerciseMapping) return;

    try {
      await updateExercise({
        variables: {
          exerciseId: exerciseMapping.exerciseId,
          exerciseSetId,
          sets: sets || null,
          reps: reps || null,
          duration: duration || null,
          restSets: restSets || null,
          restReps: restReps || null,
          notes: notes || null,
          customName: customName || null,
          customDescription: customDescription || null,
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
  };

  const exercise = exerciseMapping.exercise;
  const imageUrl = getMediaUrl(exercise?.imageUrl || exercise?.images?.[0]);

  // Tłumaczenie typów na polski
  const translateType = (type?: string) => {
    const types: Record<string, string> = {
      time: 'czasowe',
      reps: 'powtórzenia',
    };
    return type ? types[type] || type : '';
  };

  const translateSide = (side?: string) => {
    const sides: Record<string, string> = {
      left: 'lewa strona',
      right: 'prawa strona',
      both: 'obie strony',
      alternating: 'naprzemiennie',
      none: 'bez strony',
    };
    return side ? sides[side] || side : '';
  };

  return (
    <DialogContent
      className="max-w-xl max-h-[90vh] flex flex-col p-0"
      onInteractOutside={(e) => e.preventDefault()}
      onEscapeKeyDown={(e) => {
        e.preventDefault();
        onCloseAttempt();
      }}
    >
      <DialogHeader className="px-6 pt-6 pb-4">
        <DialogTitle>Edytuj parametry</DialogTitle>
        <DialogDescription>Dostosuj parametry ćwiczenia w tym zestawie</DialogDescription>
      </DialogHeader>

      <ScrollArea className="flex-1 px-6">
        <div className="space-y-5 pb-4">
          {/* Exercise preview */}
          <div className="rounded-xl border border-border bg-surface p-3">
            <div className="flex items-start gap-3">
              <div className="h-12 w-12 rounded-lg overflow-hidden shrink-0">
                {imageUrl ? (
                  <img src={imageUrl} alt={exercise?.name} className="h-full w-full object-cover" />
                ) : (
                  <ImagePlaceholder type="exercise" iconClassName="h-5 w-5" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm leading-tight">{exercise?.name || 'Nieznane ćwiczenie'}</p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {exercise?.type && (
                    <Badge variant="secondary" className="text-[10px]">
                      {translateType(exercise.type)}
                    </Badge>
                  )}
                  {exercise?.exerciseSide && exercise.exerciseSide !== 'none' && (
                    <Badge variant="outline" className="text-[10px]">
                      {translateSide(exercise.exerciseSide)}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Main parameters */}
          <div className="space-y-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Główne parametry</p>

            {/* Sets & Reps row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Serie</Label>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={() => setSets(Math.max(0, sets - 1))}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <Input
                    type="number"
                    value={sets}
                    onChange={(e) => setSets(Math.max(0, Number.parseInt(e.target.value) || 0))}
                    className="h-9 text-center font-semibold"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={() => setSets(sets + 1)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Powtórzenia</Label>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={() => setReps(Math.max(0, reps - 1))}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <Input
                    type="number"
                    value={reps}
                    onChange={(e) => setReps(Math.max(0, Number.parseInt(e.target.value) || 0))}
                    className="h-9 text-center font-semibold"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={() => setReps(reps + 1)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Duration */}
            <div className="space-y-1.5">
              <Label className="text-xs">Czas trwania (s)</Label>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={() => setDuration(Math.max(0, duration - 5))}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <Input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(Math.max(0, Number.parseInt(e.target.value) || 0))}
                  className="h-9 text-center font-semibold"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={() => setDuration(duration + 5)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>

          {/* Rest parameters */}
          <div className="space-y-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Przerwy</p>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Między seriami (s)</Label>
                <Input
                  type="number"
                  value={restSets}
                  onChange={(e) => setRestSets(Math.max(0, Number.parseInt(e.target.value) || 0))}
                  className="h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Między powt. (s)</Label>
                <Input
                  type="number"
                  value={restReps}
                  onChange={(e) => setRestReps(Math.max(0, Number.parseInt(e.target.value) || 0))}
                  className="h-9"
                />
              </div>
            </div>
          </div>

          {/* Customization */}
          <div className="space-y-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Personalizacja</p>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Własna nazwa</Label>
              <Input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder={exercise?.name || 'Zostaw puste dla domyślnej'}
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Własny opis (opcjonalnie)</Label>
              <Textarea
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                placeholder="Dodatkowy opis dla tego zestawu..."
                className="min-h-[60px] resize-none text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Notatki / instrukcje</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Wskazówki dla pacjenta..."
                className="min-h-[60px] resize-none text-sm"
              />
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Actions - fixed at bottom */}
      <div className="flex justify-end gap-3 px-6 py-4 border-t border-border bg-background">
        <Button variant="outline" onClick={onCloseAttempt} className="rounded-xl">
          Anuluj
        </Button>
        <Button onClick={handleSave} disabled={loading} className="rounded-xl font-semibold">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Zapisz
        </Button>
      </div>
    </DialogContent>
  );
}
