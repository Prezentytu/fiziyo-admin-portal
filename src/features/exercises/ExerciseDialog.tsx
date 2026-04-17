'use client';

import * as React from 'react';
import { useState, useCallback, useMemo, useRef } from 'react';
import { useMutation, useQuery, useApolloClient } from '@apollo/client/react';
import { toast } from 'sonner';
import { Clock, Lock, Sparkles, Copy, Rocket, Upload, Trash2, Wand2, Loader2 } from 'lucide-react';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ExerciseImageFrame } from '@/components/shared/exercise';
import { ExerciseForm, ExerciseFormValues } from './ExerciseForm';
import { CreateExerciseWizard, type CreateExerciseWizardSuccessEvent } from './CreateExerciseWizard';
import { FeedbackBanner } from './FeedbackBanner';
import {
  UPDATE_EXERCISE_MUTATION,
  COPY_EXERCISE_TEMPLATE_MUTATION,
  UPLOAD_EXERCISE_IMAGE_MUTATION,
  DELETE_EXERCISE_IMAGE_MUTATION,
} from '@/graphql/mutations/exercises.mutations';
import {
  GET_ORGANIZATION_EXERCISES_QUERY,
  GET_AVAILABLE_EXERCISES_QUERY,
  GET_EXERCISE_BY_ID_QUERY,
} from '@/graphql/queries/exercises.queries';
import type { Exercise, ExerciseTag } from './ExerciseCard';
import { buildExerciseUpdateVariables } from './utils/buildExerciseUpdateVariables';

function normalizeTagIds(tags: Exercise['mainTags'] | Exercise['additionalTags']): string[] | null {
  if (!tags || tags.length === 0) return null;
  return (tags as Array<string | ExerciseTag>).map((tag) => (typeof tag === 'string' ? tag : tag.id));
}
import { getNextExerciseCopyName } from './utils/getNextExerciseCopyName';
import { aiService } from '@/services/aiService';
import { buildExerciseMediaChangeSet, getExerciseMediaGalleryUrls } from './utils/exerciseMedia';

export type ExerciseDialogSuccessEvent =
  | CreateExerciseWizardSuccessEvent
  | {
      action: 'updated';
      exerciseId: string;
    }
  | {
      action: 'copied';
      exerciseId: string;
    };

interface ExerciseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercise?: Exercise | null;
  organizationId: string;
  onSuccess?: (event?: ExerciseDialogSuccessEvent) => void;
  /** Callback to resubmit exercise after fixing issues */
  onResubmit?: (exerciseId: string) => Promise<void>;
  /** Callback to submit exercise to global database */
  onSubmitToGlobal?: (exercise: Exercise) => void;
}

export function ExerciseDialog({
  open,
  onOpenChange,
  exercise,
  organizationId,
  onSuccess,
  onResubmit,
  onSubmitToGlobal,
}: Readonly<ExerciseDialogProps>) {
  const isEditing = !!exercise;
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [isResubmitting, setIsResubmitting] = useState(false);
  const [existingMediaUrls, setExistingMediaUrls] = useState<string[]>([]);
  const [newMediaFiles, setNewMediaFiles] = useState<File[]>([]);
  const [isGeneratingMedia, setIsGeneratingMedia] = useState(false);
  const [isMediaStateReady, setIsMediaStateReady] = useState(false);
  const mediaFileInputRef = useRef<HTMLInputElement>(null);
  const { data: organizationExercisesData } = useQuery(GET_ORGANIZATION_EXERCISES_QUERY, {
    variables: { organizationId },
    skip: !organizationId,
  });

  const initialMediaUrls = useMemo(() => {
    if (!exercise) return [];

    return getExerciseMediaGalleryUrls({
      thumbnailUrl: exercise.thumbnailUrl,
      imageUrl: exercise.imageUrl,
      images: exercise.images,
    });
  }, [exercise]);

  const newMediaPreviewUrls = useMemo(() => newMediaFiles.map((file) => URL.createObjectURL(file)), [newMediaFiles]);

  React.useEffect(() => {
    return () => {
      newMediaPreviewUrls.forEach((previewUrl) => URL.revokeObjectURL(previewUrl));
    };
  }, [newMediaPreviewUrls]);

  const hasMediaChanges =
    isMediaStateReady &&
    (initialMediaUrls.length !== existingMediaUrls.length ||
      initialMediaUrls.some((url, index) => existingMediaUrls[index] !== url) ||
      newMediaFiles.length > 0);

  // Scope-based modes
  const isGlobalExercise = exercise?.scope === 'GLOBAL';

  // Status-based modes
  const isPendingReview = exercise?.status === 'PENDING_REVIEW';
  const isChangesRequested = exercise?.status === 'CHANGES_REQUESTED';
  const isFixMode = isChangesRequested; // Enable editing to fix issues

  // Can submit to global: ORGANIZATION scope, no existing submission, not in review
  const canSubmitToGlobal =
    onSubmitToGlobal &&
    exercise?.scope === 'ORGANIZATION' &&
    !exercise?.globalSubmissionId &&
    !isPendingReview &&
    !isChangesRequested;

  const handleCloseAttempt = useCallback(() => {
    if (isFormDirty || hasMediaChanges) {
      setShowCloseConfirm(true);
    } else {
      onOpenChange(false);
    }
  }, [hasMediaChanges, isFormDirty, onOpenChange]);

  const handleConfirmClose = useCallback(() => {
    setShowCloseConfirm(false);
    setIsFormDirty(false);
    setExistingMediaUrls(initialMediaUrls);
    setNewMediaFiles([]);
    onOpenChange(false);
  }, [initialMediaUrls, onOpenChange]);

  // Reset dirty state when dialog closes
  React.useEffect(() => {
    if (!open) {
      setIsFormDirty(false);
      setExistingMediaUrls(initialMediaUrls);
      setNewMediaFiles([]);
      setIsMediaStateReady(false);
    }
  }, [initialMediaUrls, open]);

  React.useEffect(() => {
    if (open) {
      setExistingMediaUrls(initialMediaUrls);
      setNewMediaFiles([]);
      setIsMediaStateReady(true);
    }
  }, [initialMediaUrls, open]);

  // Apollo client - potrzebny do final refetch listy cwiczen PO upload/delete
  // obrazow. `updateExercise` refetchuje liste z danymi tekstowymi, ale dzieje
  // sie to PRZED petlami upload/delete - bez final refetchu kafelek na liscie
  // pokazuje placeholder/stary obraz az do recznego F5.
  const apolloClient = useApolloClient();

  const [updateExercise, { loading: updating }] = useMutation(UPDATE_EXERCISE_MUTATION, {
    refetchQueries: [{ query: GET_ORGANIZATION_EXERCISES_QUERY, variables: { organizationId } }],
  });
  const [uploadExerciseImage, { loading: uploadingMedia }] = useMutation(UPLOAD_EXERCISE_IMAGE_MUTATION);
  const [deleteExerciseImage, { loading: deletingMedia }] = useMutation(DELETE_EXERCISE_IMAGE_MUTATION);

  // Fork mutation - copy global exercise to organization
  const [copyExercise, { loading: copying }] = useMutation(COPY_EXERCISE_TEMPLATE_MUTATION, {
    refetchQueries: [{ query: GET_AVAILABLE_EXERCISES_QUERY, variables: { organizationId } }],
  });
  const organizationExerciseNames =
    ((organizationExercisesData as { organizationExercises?: { name?: string | null }[] } | undefined)
      ?.organizationExercises ?? [])
      .map((organizationExercise) => organizationExercise.name?.trim())
      .filter((name): name is string => Boolean(name));

  const fileToBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const fileReader = new FileReader();
      fileReader.readAsDataURL(file);
      fileReader.onload = () => {
        const result = fileReader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64 ?? '');
      };
      fileReader.onerror = reject;
    });
  }, []);

  const handleMediaFilesSelected = useCallback(
    (fileList: FileList | null) => {
      if (!fileList) return;

      const incomingFiles = Array.from(fileList);
      const acceptedFiles: File[] = [];
      const maxFilesCount = 5;
      const currentCount = existingMediaUrls.length + newMediaFiles.length;

      for (const file of incomingFiles) {
        if (!file.type.startsWith('image/')) {
          toast.error(`Plik ${file.name} nie jest obrazem`);
          continue;
        }

        if (file.size > 10 * 1024 * 1024) {
          toast.error(`Plik ${file.name} przekracza limit 10MB`);
          continue;
        }

        if (currentCount + acceptedFiles.length >= maxFilesCount) {
          toast.error(`Maksymalna liczba zdjęć to ${maxFilesCount}`);
          break;
        }

        acceptedFiles.push(file);
      }

      if (acceptedFiles.length > 0) {
        setNewMediaFiles((previousFiles) => [...previousFiles, ...acceptedFiles]);
      }
    },
    [existingMediaUrls.length, newMediaFiles.length]
  );

  const handleRemoveExistingMedia = useCallback((mediaUrl: string) => {
    setExistingMediaUrls((previousUrls) => previousUrls.filter((url) => url !== mediaUrl));
  }, []);

  const handleRemoveNewMedia = useCallback((index: number) => {
    setNewMediaFiles((previousFiles) => previousFiles.filter((_, fileIndex) => fileIndex !== index));
  }, []);

  const handleGenerateMediaWithAI = useCallback(async () => {
    const sourceName = exercise?.name?.trim();
    if (!sourceName) {
      toast.error('Brak nazwy ćwiczenia do generowania obrazu');
      return;
    }

    setIsGeneratingMedia(true);
    try {
      const description = [exercise?.patientDescription, exercise?.description].filter(Boolean).join(' ');
      const generated = await aiService.generateExerciseImage(
        sourceName,
        description,
        exercise?.type?.toLowerCase() === 'time' ? 'time' : 'reps',
        'illustration'
      );

      const generatedFile = generated?.file;
      if (!generatedFile) {
        toast.error('Nie udało się wygenerować obrazu');
        return;
      }

      const currentCount = existingMediaUrls.length + newMediaFiles.length;
      if (currentCount >= 5) {
        toast.error('Maksymalna liczba zdjęć to 5');
        return;
      }
      setNewMediaFiles((previousFiles) => [...previousFiles, generatedFile]);
      toast.success('Obraz został wygenerowany');
    } catch (error: unknown) {
      console.error('Błąd podczas generowania obrazu AI:', error);
      toast.error('Nie udało się wygenerować obrazu');
    } finally {
      setIsGeneratingMedia(false);
    }
  }, [exercise, existingMediaUrls.length, newMediaFiles.length]);

  const handleForkExercise = async () => {
    if (!exercise) return;

    try {
      const result = await copyExercise({
        variables: {
          templateExerciseId: exercise.id,
          targetOrganizationId: organizationId,
        },
      });
      const copiedExerciseId = (
        result.data as
          | {
              copyExerciseTemplate?: {
                id?: string;
              };
            }
          | undefined
      )?.copyExerciseTemplate?.id;

      let copiedExerciseName = exercise.name;
      if (copiedExerciseId) {
        copiedExerciseName = getNextExerciseCopyName(exercise.name, organizationExerciseNames);
        try {
          await updateExercise({
            variables: {
              exerciseId: copiedExerciseId,
              name: copiedExerciseName,
            },
          });
        } catch (renameError: unknown) {
          console.error('Błąd podczas nadawania nazwy nowej kopii:', renameError);
        }
      }

      toast.success(`Utworzono kopię "${copiedExerciseName}" w Twoich ćwiczeniach`);
      onOpenChange(false);
      if (copiedExerciseId) {
        onSuccess?.({ action: 'copied', exerciseId: copiedExerciseId });
      }
    } catch (error: unknown) {
      console.error('Błąd podczas kopiowania ćwiczenia:', error);
      toast.error('Nie udało się skopiować ćwiczenia');
    }
  };

  const handleSubmit = async (values: ExerciseFormValues) => {
    try {
      if (isEditing && exercise) {
        // First save the changes
        await updateExercise({
          variables: buildExerciseUpdateVariables({
            exerciseId: exercise.id,
            values,
          }),
          refetchQueries: [
            { query: GET_ORGANIZATION_EXERCISES_QUERY, variables: { organizationId } },
            { query: GET_EXERCISE_BY_ID_QUERY, variables: { id: exercise.id } },
          ],
          awaitRefetchQueries: true,
        });

        const mediaChangeSet = buildExerciseMediaChangeSet({
          initialExistingUrls: initialMediaUrls,
          keptExistingUrls: existingMediaUrls,
          newFiles: newMediaFiles,
        });

        for (const removedImageUrl of mediaChangeSet.removedImageUrls) {
          await deleteExerciseImage({
            variables: {
              exerciseId: exercise.id,
              imageUrl: removedImageUrl,
            },
            refetchQueries: [{ query: GET_EXERCISE_BY_ID_QUERY, variables: { id: exercise.id } }],
            awaitRefetchQueries: true,
          });
        }

        for (const uploadFile of mediaChangeSet.filesToUpload) {
          const base64Image = await fileToBase64(uploadFile);
          await uploadExerciseImage({
            variables: {
              exerciseId: exercise.id,
              base64Image,
              contentType: uploadFile.type,
            },
            refetchQueries: [{ query: GET_EXERCISE_BY_ID_QUERY, variables: { id: exercise.id } }],
            awaitRefetchQueries: true,
          });
        }

        // Final refetch obu list cwiczen - po petlach upload/delete backend
        // ma juz pelne URL-e obrazow. Bez tego kafelek na /exercises pokazuje
        // stare miniatury (lub placeholder dla nowo dodanych) az do F5.
        const hadMediaMutations =
          mediaChangeSet.removedImageUrls.length > 0 || mediaChangeSet.filesToUpload.length > 0;
        if (hadMediaMutations) {
          await apolloClient.refetchQueries({
            include: [GET_ORGANIZATION_EXERCISES_QUERY, GET_AVAILABLE_EXERCISES_QUERY],
          });
        }

        // If in fix mode (CHANGES_REQUESTED), also resubmit for review
        if (isFixMode && onResubmit) {
          setIsResubmitting(true);
          try {
            await onResubmit(exercise.id);
            toast.success('Poprawki wysłane do weryfikacji!');
          } catch {
            toast.error('Nie udało się wysłać poprawek');
            return;
          } finally {
            setIsResubmitting(false);
          }
        } else {
          toast.success('Ćwiczenie zostało zaktualizowane');
        }

        setNewMediaFiles([]);
        onOpenChange(false);
        onSuccess?.({ action: 'updated', exerciseId: exercise.id });
      }
    } catch (error: unknown) {
      console.error('Błąd podczas zapisywania ćwiczenia:', error);
      toast.error('Nie udało się zaktualizować ćwiczenia');
    }
  };

  // For creating new exercises, use the wizard
  if (!isEditing) {
    return (
      <CreateExerciseWizard
        open={open}
        onOpenChange={onOpenChange}
        organizationId={organizationId}
        onSuccess={onSuccess}
      />
    );
  }

  // For editing, use the simple form
  // Support both new and legacy field names
  const defaultValues = exercise
    ? {
        name: exercise.name,
        description: exercise.patientDescription || exercise.description || '',
        type: (exercise.type?.toLowerCase() as 'reps' | 'time') || 'reps',
        sets: exercise.defaultSets ?? exercise.sets,
        reps: exercise.defaultReps ?? exercise.reps,
        duration: exercise.defaultDuration ?? exercise.duration,
        restSets: exercise.defaultRestBetweenSets ?? exercise.restSets ?? 60,
        restReps: exercise.defaultRestBetweenReps ?? exercise.restReps ?? null,
        preparationTime: exercise.preparationTime ?? 5,
        executionTime: exercise.defaultExecutionTime ?? exercise.executionTime ?? null,
        exerciseSide:
          ((exercise.side?.toLowerCase() || exercise.exerciseSide) as
            | 'none'
            | 'left'
            | 'right'
            | 'both'
            | 'alternating') || 'none',
        videoUrl: exercise.videoUrl ?? '',
        notes: exercise.notes ?? '',
        tempo: exercise.tempo ?? '',
        clinicalDescription: exercise.clinicalDescription ?? '',
        audioCue: exercise.audioCue ?? '',
        rangeOfMotion: exercise.rangeOfMotion ?? '',
        // Passthrough zachowujacy istniejace wartosci przy edycji formularza,
        // ktory nie eksponuje tych pol bezposrednio. Tagi przechodza w postaci
        // tablicy ID (string[]); jesli backend zwrocil obiekty ExerciseTag,
        // wyciagamy z nich id, zeby kontrakt z UPDATE_EXERCISE_MUTATION byl spojny.
        mainTags: normalizeTagIds(exercise.mainTags),
        additionalTags: normalizeTagIds(exercise.additionalTags),
      }
    : undefined;

  // Read-only view for GLOBAL exercises from FiziYo database
  if (isGlobalExercise) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet" />
              Ćwiczenie z bazy FiziYo
            </DialogTitle>
            <DialogDescription>
              &quot;{exercise?.name}&quot; pochodzi z globalnej bazy FiziYo i nie może być edytowane.
            </DialogDescription>
          </DialogHeader>

          <div className="py-6">
            <div className="flex items-start gap-3 p-6 rounded-lg bg-violet/10 border border-violet/20">
              <Lock className="h-8 w-8 text-violet shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-violet">Ćwiczenie tylko do odczytu</p>
                <p className="text-sm text-muted-foreground mt-1">
                  To jest zweryfikowane ćwiczenie z globalnej bazy FiziYo. Możesz je używać w zestawach, ale nie możesz
                  go edytować ani usunąć.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Jeśli chcesz wprowadzić zmiany, utwórz własną kopię tego ćwiczenia.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Zamknij
            </Button>
            <Button onClick={handleForkExercise} disabled={copying}>
              <Copy className="mr-2 h-4 w-4" />
              {copying ? 'Kopiowanie...' : 'Utwórz kopię do edycji'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Edit locked state for PENDING_REVIEW
  if (isPendingReview) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-amber-500" />
              Ćwiczenie oczekuje na weryfikację
            </DialogTitle>
            <DialogDescription>
              &quot;{exercise?.name}&quot; zostało zgłoszone do bazy globalnej i oczekuje na weryfikację.
            </DialogDescription>
          </DialogHeader>

          <div className="py-6">
            <div className="flex items-center justify-center gap-3 p-6 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <Clock className="h-8 w-8 text-amber-500" />
              <div>
                <p className="font-medium text-amber-600">Edycja zablokowana</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Nie możesz edytować ćwiczenia podczas weryfikacji. Poczekaj na decyzję weryfikatora.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Zamknij
            </Button>
            {/* TODO: Add "Withdraw submission" button when backend supports it */}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={() => handleCloseAttempt()}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          handleCloseAttempt();
        }}
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>{isFixMode ? 'Popraw ćwiczenie' : 'Edytuj ćwiczenie'}</DialogTitle>
            {isFixMode && (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                Do poprawy
              </Badge>
            )}
          </div>
          <DialogDescription>
            {isFixMode
              ? `Wprowadź poprawki do "${exercise?.name}" i wyślij ponownie do weryfikacji`
              : `Zmień parametry ćwiczenia "${exercise?.name}"`}
          </DialogDescription>
        </DialogHeader>

        {/* Feedback Banner for CHANGES_REQUESTED */}
        {isFixMode && exercise?.adminReviewNotes && (
          <FeedbackBanner adminReviewNotes={exercise.adminReviewNotes} updatedAt={exercise.createdAt} />
        )}

        <ExerciseForm
          defaultValues={defaultValues}
          onSubmit={handleSubmit}
          onCancel={handleCloseAttempt}
          isLoading={updating || isResubmitting || uploadingMedia || deletingMedia || isGeneratingMedia}
          submitLabel={isFixMode ? 'Wyślij poprawki' : 'Zapisz zmiany'}
          onDirtyChange={setIsFormDirty}
          mediaSection={
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Zdjęcia ćwiczenia</p>
                <span className="text-xs text-muted-foreground">{existingMediaUrls.length + newMediaFiles.length}/5</span>
              </div>
              {(existingMediaUrls.length > 0 || newMediaPreviewUrls.length > 0) && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {existingMediaUrls.map((mediaUrl, index) => (
                    <div key={mediaUrl} className="group relative aspect-video overflow-hidden rounded-lg border border-border">
                      <ExerciseImageFrame
                        src={mediaUrl}
                        alt={`Zdjęcie ćwiczenia ${index + 1}`}
                        aspectRatio=""
                        className="h-full w-full rounded-none border-0"
                        sizes="(max-width: 768px) 40vw, 180px"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute right-1 top-1 h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={() => handleRemoveExistingMedia(mediaUrl)}
                        data-testid={`exercise-form-media-remove-btn-${index}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                  {newMediaPreviewUrls.map((mediaPreviewUrl, previewIndex) => {
                    const previewId = existingMediaUrls.length + previewIndex;
                    return (
                      <div
                        key={mediaPreviewUrl}
                        className="group relative aspect-video overflow-hidden rounded-lg border border-dashed border-primary/60"
                      >
                        <ExerciseImageFrame
                          src={mediaPreviewUrl}
                          alt={`Nowe zdjęcie ćwiczenia ${previewIndex + 1}`}
                          aspectRatio=""
                          className="h-full w-full rounded-none border-0"
                          unoptimized
                          sizes="(max-width: 768px) 40vw, 180px"
                          dataTestId={`exercise-form-media-preview-${previewId}`}
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute right-1 top-1 h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
                          onClick={() => handleRemoveNewMedia(previewIndex)}
                          data-testid={`exercise-form-media-remove-btn-${previewId}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => mediaFileInputRef.current?.click()}
                  disabled={existingMediaUrls.length + newMediaFiles.length >= 5}
                  data-testid="exercise-form-media-upload-btn"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Dodaj zdjęcie
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGenerateMediaWithAI}
                  disabled={isGeneratingMedia || existingMediaUrls.length + newMediaFiles.length >= 5}
                  data-testid="exercise-form-media-ai-generate-btn"
                >
                  {isGeneratingMedia ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                  Generuj AI
                </Button>
                <input
                  ref={mediaFileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(event) => {
                    handleMediaFilesSelected(event.target.files);
                    event.target.value = '';
                  }}
                />
              </div>
            </div>
          }
          secondaryAction={
            canSubmitToGlobal && exercise ? (
              <Button
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  onSubmitToGlobal(exercise);
                }}
                className="gap-2 bg-gradient-to-r from-primary to-emerald-600 hover:from-primary/90 hover:to-emerald-600/90"
              >
                <Rocket className="h-4 w-4" />
                Wyślij do weryfikacji
              </Button>
            ) : undefined
          }
        />
      </DialogContent>

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
