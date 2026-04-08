'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Play, Info, ArrowLeftRight, ChevronLeft, ChevronRight, ImageIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { ImagePlaceholder } from '@/components/shared/ImagePlaceholder';
import {
  EXERCISE_FIELD_METADATA,
  formatFieldValueWithPlaceholder,
  normalizeExerciseFieldValues,
} from '@/components/shared/exercise';
import { getMediaUrl } from '@/utils/mediaUrl';
import type { ExerciseMapping, ExerciseOverride } from './PatientAssignmentCard';
import type { ExerciseLoad } from '@/features/assignment/types';
import { translateExerciseSidePolish } from '@/components/pdf/polishUtils';

interface ExercisePreviewDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mapping: ExerciseMapping | null;
  override?: ExerciseOverride;
  onEdit?: () => void;
}

type ExerciseWithPreviewFields = NonNullable<ExerciseMapping['exercise']> & {
  executionTime?: number;
  restSets?: number;
  restReps?: number;
  preparationTime?: number;
  tempo?: string;
  loadText?: string;
  defaultLoad?: ExerciseLoad;
  rangeOfMotion?: string;
  difficultyLevel?: string;
  audioCue?: string;
};

type ExerciseOverrideWithPreviewFields = ExerciseOverride & {
  executionTime?: number;
  preparationTime?: number;
  tempo?: string;
};

type ExerciseMappingWithPreviewFields = ExerciseMapping & {
  preparationTime?: number;
  loadText?: string;
};

export function ExercisePreviewDrawer({ open, onOpenChange, mapping, override, onEdit }: ExercisePreviewDrawerProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  if (!mapping) return null;

  const normalizedMapping = mapping as ExerciseMappingWithPreviewFields;
  const exercise = normalizedMapping.exercise as ExerciseWithPreviewFields | undefined;
  const normalizedOverride = override as ExerciseOverrideWithPreviewFields | undefined;
  const videoUrl = getMediaUrl(exercise?.videoUrl);

  // Build array of all images (original + custom)
  const allImages: { url: string; isCustom: boolean }[] = [];

  // Add original image(s)
  const originalImageUrl = getMediaUrl(exercise?.imageUrl);
  if (originalImageUrl) {
    allImages.push({ url: originalImageUrl, isCustom: false });
  }
  if (exercise?.images) {
    for (const img of exercise.images) {
      const url = getMediaUrl(img);
      if (url && url !== originalImageUrl) {
        allImages.push({ url, isCustom: false });
      }
    }
  }

  // Add custom images from override
  if (normalizedOverride?.customImages) {
    for (const img of normalizedOverride.customImages) {
      allImages.push({ url: img, isCustom: true });
    }
  }

  const hasMultipleImages = allImages.length > 1;
  const currentImage = allImages[currentImageIndex];

  const goToPrevious = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentImageIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
  };

  // Get effective params (with overrides)
  const effectiveSets = normalizedOverride?.sets ?? normalizedMapping.sets ?? exercise?.defaultSets ?? exercise?.sets;
  const effectiveReps = normalizedOverride?.reps ?? normalizedMapping.reps ?? exercise?.defaultReps ?? exercise?.reps;
  const effectiveDuration =
    normalizedOverride?.duration ?? normalizedMapping.duration ?? exercise?.defaultDuration ?? exercise?.duration;
  const effectiveExecutionTime =
    normalizedOverride?.executionTime ??
    normalizedMapping.executionTime ??
    exercise?.defaultExecutionTime ??
    exercise?.executionTime;
  const effectiveRestSets =
    normalizedOverride?.restSets ??
    normalizedMapping.restSets ??
    exercise?.defaultRestBetweenSets ??
    exercise?.restSets;
  const effectiveRestReps =
    normalizedOverride?.restReps ??
    normalizedMapping.restReps ??
    exercise?.defaultRestBetweenReps ??
    exercise?.restReps;
  const effectivePreparationTime =
    normalizedOverride?.preparationTime ?? normalizedMapping.preparationTime ?? exercise?.preparationTime;
  const effectiveTempo = normalizedOverride?.tempo ?? normalizedMapping.tempo ?? exercise?.tempo;
  const effectiveLoadDisplayText = normalizedMapping.loadText ?? exercise?.defaultLoad?.text ?? exercise?.loadText;
  const effectiveName = normalizedOverride?.customName ?? normalizedMapping.customName ?? exercise?.name;
  const effectivePatientDescription =
    normalizedOverride?.customDescription ??
    normalizedMapping.customDescription ??
    exercise?.patientDescription ??
    exercise?.description ??
    '';
  const effectiveClinicalDescription = exercise?.clinicalDescription ?? '';
  const effectiveSide = normalizedOverride?.exerciseSide ?? exercise?.exerciseSide;
  const normalizedFields = normalizeExerciseFieldValues({
    defaultSets: effectiveSets,
    defaultReps: effectiveReps,
    defaultDuration: effectiveDuration,
    defaultExecutionTime: effectiveExecutionTime,
    defaultRestBetweenSets: effectiveRestSets,
    defaultRestBetweenReps: effectiveRestReps,
    preparationTime: effectivePreparationTime,
    tempo: effectiveTempo,
    side: effectiveSide,
    rangeOfMotion: exercise?.rangeOfMotion,
    difficultyLevel: exercise?.difficultyLevel,
    patientDescription: effectivePatientDescription,
    clinicalDescription: effectiveClinicalDescription,
    audioCue: exercise?.audioCue,
    notes: normalizedOverride?.notes || normalizedMapping.notes,
    loadText: effectiveLoadDisplayText,
    defaultLoad: exercise?.defaultLoad,
  });
  const parameterFieldOrder = [
    EXERCISE_FIELD_METADATA.sets,
    EXERCISE_FIELD_METADATA.reps,
    EXERCISE_FIELD_METADATA.duration,
    EXERCISE_FIELD_METADATA.executionTime,
    EXERCISE_FIELD_METADATA.restSets,
    EXERCISE_FIELD_METADATA.restReps,
    EXERCISE_FIELD_METADATA.preparationTime,
    EXERCISE_FIELD_METADATA.tempo,
    EXERCISE_FIELD_METADATA.load,
    EXERCISE_FIELD_METADATA.side,
    EXERCISE_FIELD_METADATA.rangeOfMotion,
    EXERCISE_FIELD_METADATA.difficultyLevel,
  ];

  const hasOverride =
    normalizedOverride &&
    (normalizedOverride.sets !== undefined ||
      normalizedOverride.reps !== undefined ||
      normalizedOverride.duration !== undefined ||
      normalizedOverride.customName ||
      normalizedOverride.customImages?.length);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 flex flex-col" data-testid="exercise-preview-dialog">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <DialogTitle className="text-lg">{effectiveName || 'Nieznane ćwiczenie'}</DialogTitle>
            {hasOverride && (
              <Badge variant="outline" className="text-xs border-primary/40 text-primary">
                Zmodyfikowane
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="max-h-[calc(90vh-180px)] overflow-y-auto">
          <div className="px-6 py-6 space-y-6">
            {/* Media - Image Gallery or Video */}
            <div className="relative aspect-video rounded-xl overflow-hidden bg-surface-light">
              {videoUrl ? (
                <video
                  src={videoUrl}
                  controls
                  className="w-full h-full object-contain"
                  poster={currentImage?.url || undefined}
                >
                  <track kind="captions" />
                </video>
              ) : currentImage ? (
                <>
                  <div className="relative w-full h-full">
                    <Image
                      src={currentImage.url}
                      alt={effectiveName || 'Ćwiczenie'}
                      fill
                      className="object-contain"
                      sizes="(max-width: 768px) 100vw, 400px"
                    />
                  </div>
                  {currentImage.isCustom && (
                    <span className="absolute top-3 left-3 bg-primary text-primary-foreground text-xs font-medium px-2 py-1 rounded-md flex items-center gap-1">
                      <ImageIcon className="h-3 w-3" />
                      Dla pacjenta
                    </span>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <ImagePlaceholder type="exercise" iconClassName="h-16 w-16" />
                </div>
              )}

              {/* Navigation arrows */}
              {hasMultipleImages && !videoUrl && (
                <>
                  <button
                    type="button"
                    onClick={goToPrevious}
                    className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    type="button"
                    onClick={goToNext}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              )}

              {/* Dots indicator */}
              {hasMultipleImages && !videoUrl && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {allImages.map((img, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setCurrentImageIndex(index)}
                      className={`h-2 rounded-full transition-all ${
                        index === currentImageIndex
                          ? 'w-6 bg-primary'
                          : `w-2 ${img.isCustom ? 'bg-primary/40' : 'bg-white/60'} hover:bg-white/80`
                      }`}
                    />
                  ))}
                </div>
              )}

              {videoUrl && !open && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <div className="h-16 w-16 rounded-full bg-white/90 flex items-center justify-center">
                    <Play className="h-8 w-8 text-foreground ml-1" />
                  </div>
                </div>
              )}
            </div>

            {/* Parameters */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Parametry</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {parameterFieldOrder.map((field) => (
                  <div key={field.key} className="rounded-xl border border-border/40 bg-surface/30 p-3">
                    <p className="text-xs text-muted-foreground">{field.label}</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {formatFieldValueWithPlaceholder(field, normalizedFields, field.group === 'content' ? 'Nie ustawiono' : '—')}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Additional info */}
            {translateExerciseSidePolish(effectiveSide) && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-light/50 border border-border/40">
                <ArrowLeftRight className="h-5 w-5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Strona wykonania</p>
                  <p className="text-sm font-medium">{translateExerciseSidePolish(effectiveSide)}</p>
                </div>
              </div>
            )}

            {/* Patient description */}
            {effectivePatientDescription && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Opis dla pacjenta
                  </h3>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{effectivePatientDescription}</p>
                </div>
              </>
            )}

            {effectiveClinicalDescription && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Opis dla fizjoterapeuty
                  </h3>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{effectiveClinicalDescription}</p>
                </div>
              </>
            )}

            {/* Notes */}
            {(normalizedOverride?.notes || normalizedMapping.notes) && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Notatki dla pacjenta
                  </h3>
                  <div className="rounded-xl bg-primary/5 border border-primary/20 p-4">
                    <p className="text-sm text-foreground whitespace-pre-wrap">
                      {normalizedOverride?.notes || normalizedMapping.notes}
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* Override info */}
            {hasOverride && (
              <>
                <Separator />
                <div className="rounded-xl bg-info/5 border border-info/20 p-4">
                  <p className="text-xs text-muted-foreground">
                    <strong className="text-info">Uwaga:</strong> To ćwiczenie ma zmodyfikowane parametry specjalnie dla
                    tego pacjenta. Oryginalne wartości z zestawu mogą być inne.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Zamknij
          </Button>
          {onEdit && (
            <Button onClick={onEdit} className="shadow-lg shadow-primary/20">
              Edytuj parametry
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
