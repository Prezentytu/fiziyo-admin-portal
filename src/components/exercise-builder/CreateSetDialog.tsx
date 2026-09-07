'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useExerciseBuilder } from '@/contexts/ExerciseBuilderContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import {
  CREATE_EXERCISE_SET_MUTATION,
  ADD_EXERCISE_TO_EXERCISE_SET_MUTATION,
} from '@/graphql/mutations/exercises.mutations';
import { aiService } from '@/services/aiService';
import { submitCreateTemplateSet } from '@/features/exercise-sets/utils/createSetSubmit';
import { SetNameField } from '@/features/exercise-sets/components/SetNameField';
import { SetDescriptionCollapsible } from '@/features/exercise-sets/components/SetDescriptionCollapsible';
import { useDialogShortcuts } from '@/hooks/useDialogShortcuts';

interface CreateExerciseSetResponse {
  createExerciseSet: {
    id: string;
    name: string;
  };
}

interface CreateSetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateSetDialog({ open, onOpenChange }: CreateSetDialogProps) {
  const router = useRouter();
  const { currentOrganization } = useOrganization();
  const { selectedExercises, clearBuilder, exerciseCount } = useExerciseBuilder();
  const [isCreating, setIsCreating] = useState(false);
  const [isGeneratingName, setIsGeneratingName] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [showDescription, setShowDescription] = useState(false);
  const [showNameError, setShowNameError] = useState(false);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  const organizationId = currentOrganization?.organizationId;

  const [createExerciseSet] = useMutation<CreateExerciseSetResponse>(CREATE_EXERCISE_SET_MUTATION);
  const [addExerciseToSet] = useMutation(ADD_EXERCISE_TO_EXERCISE_SET_MUTATION);

  const resetForm = useCallback(() => {
    setName('');
    setDescription('');
    setShowDescription(false);
    setShowNameError(false);
    setIsGeneratingName(false);
  }, []);

  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open, resetForm]);

  const focusNameInput = useCallback(() => {
    if (!nameInputRef.current) return;
    nameInputRef.current.focus();
    nameInputRef.current.scrollIntoView?.({ block: 'center', inline: 'nearest' });
  }, []);

  const handleGenerateAiName = async () => {
    if (isCreating || isGeneratingName) {
      return;
    }

    const exerciseNames = selectedExercises
      .map((exercise) => exercise.name?.trim())
      .filter((exerciseName): exerciseName is string => Boolean(exerciseName));

    if (exerciseNames.length === 0) {
      toast.error('Brak ćwiczeń do wygenerowania nazwy');
      return;
    }

    setIsGeneratingName(true);
    try {
      const response = await aiService.suggestSetName(name, exerciseNames);
      const suggestedName = response?.suggestedName?.trim();

      if (!suggestedName) {
        toast.error('Nie udało się wygenerować nazwy');
        return;
      }

      setName(suggestedName);
      if (suggestedName.trim().length >= 2) {
        setShowNameError(false);
      }
      toast.success('Wygenerowano nazwę zestawu');
    } catch (error) {
      console.error('Error generating set name:', error);
      toast.error('Nie udało się wygenerować nazwy');
    } finally {
      setIsGeneratingName(false);
    }
  };

  const handleSubmit = async () => {
    if (!organizationId) {
      toast.error('Brak organizacji');
      return;
    }

    if (selectedExercises.length === 0) {
      toast.error('Dodaj przynajmniej jedno ćwiczenie do zestawu');
      return;
    }

    if (name.trim().length < 2) {
      setShowNameError(true);
      focusNameInput();
      return;
    }

    setIsCreating(true);

    try {
      const sanitizedName = name.trim();
      const exerciseSetId = await submitCreateTemplateSet(
        {
          createSet: (options) => createExerciseSet(options),
          addExercise: (options) => addExerciseToSet(options),
        },
        {
          organizationId,
          name: sanitizedName,
          description,
        },
        selectedExercises.map((exercise) => ({
          exerciseId: exercise.id,
          sets: exercise.sets,
          reps: exercise.reps,
          duration: exercise.duration,
          restSets: exercise.restSets,
          restReps: exercise.restReps,
          preparationTime: exercise.preparationTime,
          executionTime: exercise.executionTime,
          notes: exercise.notes,
          customName: exercise.customName,
          customDescription: exercise.customDescription,
          tempo: exercise.tempo,
          loadWeightKg: exercise.loadWeightKg,
          loadValue: exercise.loadValue,
        }))
      );

      toast.success('Zestaw został utworzony', {
        description: `${exerciseCount} ${exerciseCount === 1 ? 'ćwiczenie' : exerciseCount < 5 ? 'ćwiczenia' : 'ćwiczeń'} w zestawie`,
        action: {
          label: 'Zobacz zestaw',
          onClick: () => {
            router.push(`/exercise-sets/${exerciseSetId}`);
          },
        },
      });

      clearBuilder();
      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating exercise set:', error);
      toast.error('Nie udało się utworzyć zestawu', {
        description: error instanceof Error ? error.message : 'Spróbuj ponownie',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    if (!isCreating) {
      resetForm();
      onOpenChange(false);
    }
  };

  useDialogShortcuts({
    open,
    enabled: !isCreating,
    onSubmit: () => {
      void handleSubmit();
    },
    onClose: handleClose,
  });

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        data-testid="create-set-dialog"
        onKeyDown={(event) => {
          if (event.key !== 'Enter') return;
          if (!event.metaKey && !event.ctrlKey) return;
          event.preventDefault();
          if (isCreating) return;
          void handleSubmit();
        }}
      >
        <DialogHeader>
          <DialogTitle>Utwórz nowy zestaw</DialogTitle>
          <DialogDescription>
            Zestaw będzie zawierał {exerciseCount}{' '}
            {exerciseCount === 1 ? 'ćwiczenie' : exerciseCount < 5 ? 'ćwiczenia' : 'ćwiczeń'}. Nadaj mu nazwę i dodaj
            opis.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              Nazwa zestawu
            </span>
            <SetNameField
              value={name}
              onChange={setName}
              onGenerateAiName={() => {
                void handleGenerateAiName();
              }}
              isGeneratingName={isGeneratingName}
              showError={showNameError}
              onClearError={() => setShowNameError(false)}
              disabled={isCreating}
              inputRef={nameInputRef}
              autoFocus
              testIdPrefix="create-set"
              aiButtonTestId="create-set-ai-name-btn"
              placeholder="np. Rehabilitacja kolana"
            />
          </div>

          <SetDescriptionCollapsible
            open={showDescription}
            onOpenChange={setShowDescription}
            value={description}
            onChange={setDescription}
            disabled={isCreating}
            testIdPrefix="create-set-description"
            placeholder="Krótki opis zestawu..."
          />
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isCreating}
            data-testid="create-set-cancel-btn"
          >
            Anuluj
          </Button>
          <Button
            type="button"
            onClick={() => {
              void handleSubmit();
            }}
            disabled={isCreating}
            data-testid="create-set-submit-btn"
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Tworzenie...
              </>
            ) : (
              'Utwórz zestaw'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
