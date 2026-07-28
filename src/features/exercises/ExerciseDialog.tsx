'use client';

import * as React from 'react';
import { useState, useCallback, useMemo, useRef } from 'react';
import { useMutation, useQuery, useApolloClient } from '@apollo/client/react';
import { toast } from 'sonner';
import { Clock, Lock, Sparkles, Copy, Rocket, Upload, Trash2, Wand2, Loader2, ZoomIn } from 'lucide-react';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ImageLightbox } from '@/components/shared/ImageLightbox';
import { ExerciseImageFrame } from '@/components/shared/exercise';
import { cn } from '@/lib/utils';
import { CreateExerciseWizard, type CreateExerciseWizardSuccessEvent } from './CreateExerciseWizard';
import { FeedbackBanner } from './FeedbackBanner';
import { ExerciseEditor } from './ExerciseEditor';
import { useExerciseEditorForm } from './useExerciseEditorForm';
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
import type { Exercise } from './ExerciseCard';
import { verificationCopy } from '@/features/verification/verificationCopy';
import { getNextExerciseCopyName } from './utils/getNextExerciseCopyName';
import { buildExerciseMediaChangeSet, getExerciseMediaGalleryUrls } from './utils/exerciseMedia';
import { buildEnrichmentUpdateVariables, isExerciseSaveAuthError } from './utils/buildEnrichmentUpdateVariables';
import { useExerciseImageGeneration } from './useExerciseImageGeneration';
import { ImageStylePicker } from './ImageStylePicker';
import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';

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
  /** Callback to submit exercise to organization verification */
  onSubmitToOrganizationReview?: (exercise: Exercise) => void;
}

export function ExerciseDialog({
  open,
  onOpenChange,
  exercise,
  organizationId,
  onSuccess,
  onResubmit,
  onSubmitToGlobal,
  onSubmitToOrganizationReview,
}: Readonly<ExerciseDialogProps>) {
  const isEditing = !!exercise;
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [isResubmitting, setIsResubmitting] = useState(false);
  const [existingMediaUrls, setExistingMediaUrls] = useState<string[]>([]);
  const [newMediaFiles, setNewMediaFiles] = useState<File[]>([]);
  const [isMediaLightboxOpen, setIsMediaLightboxOpen] = useState(false);
  const [activeMediaPreviewIndex, setActiveMediaPreviewIndex] = useState(0);
  const {
    generate: generateMediaWithAI,
    isGenerating: isGeneratingMedia,
    imageStyle,
    setImageStyle,
  } = useExerciseImageGeneration();
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
  const allMediaPreviewUrls = useMemo(
    () => [...existingMediaUrls, ...newMediaPreviewUrls],
    [existingMediaUrls, newMediaPreviewUrls]
  );

  const openMediaPreview = useCallback((index: number) => {
    setActiveMediaPreviewIndex(index);
    setIsMediaLightboxOpen(true);
  }, []);

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
  const isPendingOrganizationReview = exercise?.organizationVerificationStatus === 'PENDING_ORG_REVIEW';
  const isChangesRequested = exercise?.status === 'CHANGES_REQUESTED';
  const isFixMode = isChangesRequested; // Enable editing to fix issues

  // Can submit to global: ORGANIZATION scope, no existing submission, not in review
  const canSubmitToGlobal =
    onSubmitToGlobal && exercise?.scope === 'ORGANIZATION' && !exercise?.globalSubmissionId;

  const canSubmitToOrganization =
    onSubmitToOrganizationReview &&
    exercise?.scope === 'ORGANIZATION' &&
    (exercise?.organizationVerificationStatus === 'NOT_SUBMITTED' || exercise?.organizationVerificationStatus === 'ORG_CHANGES_REQUESTED');

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
      fileReader.onload = () => {
        const result = fileReader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64 ?? '');
      };
      fileReader.onerror = reject;
      fileReader.readAsDataURL(file);
    });
  }, []);

  const updateCore = useCallback(
    async (variables: Record<string, unknown>) => {
      if (!exercise) return;
      await updateExercise({
        variables: { exerciseId: exercise.id, ...variables },
        refetchQueries: [
          { query: GET_ORGANIZATION_EXERCISES_QUERY, variables: { organizationId } },
          { query: GET_EXERCISE_BY_ID_QUERY, variables: { id: exercise.id } },
        ],
        awaitRefetchQueries: true,
      });
    },
    [exercise, organizationId, updateExercise]
  );

  const updateEnrichment = useCallback(
    async (payload: ExerciseEnrichmentData) => {
      if (!exercise) return;
      await updateExercise({
        variables: buildEnrichmentUpdateVariables(exercise.id, payload),
        refetchQueries: [{ query: GET_EXERCISE_BY_ID_QUERY, variables: { id: exercise.id } }],
        awaitRefetchQueries: true,
      });
    },
    [exercise, updateExercise]
  );

  const editorForm = useExerciseEditorForm({
    source: exercise,
    updateCore,
    updateEnrichment,
  });

  React.useEffect(() => {
    setIsFormDirty(editorForm.isDirty);
  }, [editorForm.isDirty]);

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

    const currentCount = existingMediaUrls.length + newMediaFiles.length;
    if (currentCount >= 5) {
      toast.error('Maksymalna liczba zdjęć to 5');
      return;
    }

    const description = [exercise?.patientDescription, exercise?.description].filter(Boolean).join(' ');
    const generatedFile = await generateMediaWithAI({
      exerciseName: sourceName,
      exerciseDescription: description,
      exerciseType: exercise?.type?.toLowerCase() === 'time' ? 'time' : 'reps',
      style: imageStyle,
    });

    if (!generatedFile) {
      return;
    }

    setNewMediaFiles((previousFiles) => [...previousFiles, generatedFile]);
  }, [exercise, existingMediaUrls.length, newMediaFiles.length, generateMediaWithAI, imageStyle]);

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

  const handleSave = async () => {
    if (!exercise) return;
    try {
      await editorForm.save();

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

      const hadMediaMutations =
        mediaChangeSet.removedImageUrls.length > 0 || mediaChangeSet.filesToUpload.length > 0;
      if (hadMediaMutations) {
        await apolloClient.refetchQueries({
          include: [GET_ORGANIZATION_EXERCISES_QUERY, GET_AVAILABLE_EXERCISES_QUERY],
        });
      }

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
    } catch (error: unknown) {
      console.error('Błąd podczas zapisywania ćwiczenia:', error);
      if (isExerciseSaveAuthError(error)) {
        toast.error('Brak uprawnień do zapisu tych zmian');
        return;
      }
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

  // Edit locked state for PENDING_REVIEW / PENDING_ORG_REVIEW
  if (isPendingReview || isPendingOrganizationReview) {
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
              {isPendingOrganizationReview && !isPendingReview && (
                <span> To ćwiczenie jest aktualnie w lokalnej kolejce weryfikacji organizacyjnej.</span>
              )}
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

        {isFixMode && exercise?.adminReviewNotes && (
          <FeedbackBanner adminReviewNotes={exercise.adminReviewNotes} updatedAt={exercise.createdAt} />
        )}

        <div
          className="space-y-4"
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
              event.preventDefault();
              void handleSave();
            }
          }}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Zdjęcia ćwiczenia</p>
              <span className="text-xs text-muted-foreground">
                {existingMediaUrls.length + newMediaFiles.length}/5
              </span>
            </div>
            {(existingMediaUrls.length > 0 || newMediaPreviewUrls.length > 0 || isGeneratingMedia) && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {existingMediaUrls.map((mediaUrl, index) => (
                  <div
                    key={mediaUrl}
                    className="relative aspect-video overflow-hidden rounded-lg border border-border bg-surface"
                  >
                    <ExerciseImageFrame
                      src={mediaUrl}
                      alt={`Zdjęcie ćwiczenia ${index + 1}`}
                      aspectRatio=""
                      className="h-full w-full rounded-none border-0"
                      sizes="(max-width: 768px) 40vw, 180px"
                    />
                    <div className="absolute right-1.5 top-1.5 z-10 flex items-center gap-1">
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        className={cn(
                          'h-8 w-8 border border-border/60 bg-background/90 shadow-sm',
                          'dark:border-white/15 dark:bg-black/55'
                        )}
                        onClick={() => openMediaPreview(index)}
                        aria-label={`Powiększ zdjęcie ${index + 1}`}
                        data-testid={`exercise-form-media-preview-btn-${index}`}
                      >
                        <ZoomIn className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        className={cn(
                          'h-8 w-8 border border-border/60 bg-background/90 shadow-sm',
                          'hover:border-destructive/40 hover:bg-destructive hover:text-destructive-foreground',
                          'dark:border-white/15 dark:bg-black/55'
                        )}
                        onClick={() => handleRemoveExistingMedia(mediaUrl)}
                        aria-label={`Usuń zdjęcie ${index + 1}`}
                        data-testid={`exercise-form-media-remove-btn-${index}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
                {newMediaPreviewUrls.map((mediaPreviewUrl, previewIndex) => {
                  const previewId = existingMediaUrls.length + previewIndex;
                  return (
                    <div
                      key={mediaPreviewUrl}
                      className="relative aspect-video overflow-hidden rounded-lg border border-dashed border-primary/60 bg-surface"
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
                      <div className="absolute right-1.5 top-1.5 z-10 flex items-center gap-1">
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon"
                          className={cn(
                            'h-8 w-8 border border-border/60 bg-background/90 shadow-sm',
                            'dark:border-white/15 dark:bg-black/55'
                          )}
                          onClick={() => openMediaPreview(previewId)}
                          aria-label={`Powiększ nowe zdjęcie ${previewIndex + 1}`}
                          data-testid={`exercise-form-media-preview-btn-${previewId}`}
                        >
                          <ZoomIn className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon"
                          className={cn(
                            'h-8 w-8 border border-border/60 bg-background/90 shadow-sm',
                            'hover:border-destructive/40 hover:bg-destructive hover:text-destructive-foreground',
                            'dark:border-white/15 dark:bg-black/55'
                          )}
                          onClick={() => handleRemoveNewMedia(previewIndex)}
                          aria-label={`Usuń nowe zdjęcie ${previewIndex + 1}`}
                          data-testid={`exercise-form-media-remove-btn-${previewId}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {isGeneratingMedia && (
                  <div
                    className="relative flex aspect-video flex-col items-center justify-center gap-2 overflow-hidden rounded-lg border border-border bg-muted/30"
                    aria-busy
                    data-testid="exercise-form-media-ai-skeleton"
                  >
                    <div className="absolute inset-0 animate-pulse bg-muted/40" aria-hidden />
                    <Loader2 className="relative z-10 h-5 w-5 animate-spin text-secondary" />
                    <span className="relative z-10 text-xs text-muted-foreground">Generowanie…</span>
                  </div>
                )}
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => mediaFileInputRef.current?.click()}
                  disabled={isGeneratingMedia || existingMediaUrls.length + newMediaFiles.length >= 5}
                  data-testid="exercise-form-media-upload-btn"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Dodaj zdjęcie
                </Button>
                <ImageStylePicker
                  value={imageStyle}
                  onChange={setImageStyle}
                  disabled={isGeneratingMedia}
                  testIdPrefix="exercise-form-media-ai-style"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleGenerateMediaWithAI}
                disabled={isGeneratingMedia || existingMediaUrls.length + newMediaFiles.length >= 5}
                aria-busy={isGeneratingMedia}
                data-testid="exercise-form-media-ai-generate-btn"
              >
                {isGeneratingMedia ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="mr-2 h-4 w-4" />
                )}
                {isGeneratingMedia ? 'Generowanie…' : 'Generuj AI'}
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
            <ImageLightbox
              src={allMediaPreviewUrls[activeMediaPreviewIndex] ?? ''}
              alt={exercise?.name || 'Podgląd zdjęcia ćwiczenia'}
              open={isMediaLightboxOpen}
              onOpenChange={setIsMediaLightboxOpen}
              images={allMediaPreviewUrls.length > 0 ? allMediaPreviewUrls : undefined}
              currentIndex={activeMediaPreviewIndex}
              onIndexChange={setActiveMediaPreviewIndex}
            />
          </div>

          <ExerciseEditor form={editorForm} showNameField />

          <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseAttempt}
              data-testid="exercise-dialog-cancel-btn"
            >
              Anuluj
            </Button>
            <div className="flex flex-wrap items-center gap-2">
              {canSubmitToGlobal && exercise ? (
                <Button
                  type="button"
                  onClick={() => {
                    onOpenChange(false);
                    onSubmitToGlobal(exercise);
                  }}
                  className="gap-2 bg-gradient-to-r from-primary to-emerald-600 hover:from-primary/90 hover:to-emerald-600/90"
                >
                  <Rocket className="h-4 w-4" />
                  {verificationCopy.submitGlobal}
                </Button>
              ) : canSubmitToOrganization && exercise ? (
                <Button
                  type="button"
                  onClick={() => {
                    onOpenChange(false);
                    onSubmitToOrganizationReview(exercise);
                  }}
                  className="gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-600/90 hover:to-emerald-500/90"
                  data-testid="exercise-dialog-submit-org-review-btn"
                >
                  <Rocket className="h-4 w-4" />
                  {verificationCopy.submitOrganization}
                </Button>
              ) : null}
              <Button
                type="button"
                onClick={() => void handleSave()}
                disabled={
                  updating ||
                  isResubmitting ||
                  uploadingMedia ||
                  deletingMedia ||
                  isGeneratingMedia ||
                  editorForm.saveStatus === 'saving'
                }
                data-testid="exercise-dialog-save-btn"
              >
                {(updating ||
                  isResubmitting ||
                  uploadingMedia ||
                  deletingMedia ||
                  editorForm.saveStatus === 'saving') && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isFixMode ? 'Wyślij poprawki' : 'Zapisz zmiany'}
              </Button>
            </div>
          </div>
        </div>
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
