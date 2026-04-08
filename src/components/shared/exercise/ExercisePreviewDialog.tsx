'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Info, Play } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ImagePlaceholder } from '@/components/shared/ImagePlaceholder';
import { getMediaUrl } from '@/utils/mediaUrl';
import {
  DIALOG_EXERCISE_FIELD_ORDER,
  EXERCISE_FIELD_METADATA,
  HIDE_EXERCISE_TAGS,
  formatFieldValueWithPlaceholder,
  type ExerciseFieldGroup,
  type ExerciseFieldMetadata,
} from './displayRegistry';
import type { ExerciseExecutionCardData } from './types';

interface ExercisePreviewDialogProps {
  open: boolean;
  exercise: ExerciseExecutionCardData | null;
  onOpenChange: (open: boolean) => void;
  testIdPrefix?: string;
}

type ExerciseMediaItem =
  | { kind: 'image'; url: string }
  | { kind: 'video'; url: string };

const GROUP_TITLES: Record<ExerciseFieldGroup, string> = {
  dosage: 'Dawkowanie',
  execution: 'Parametry wykonania',
  content: 'Treści ćwiczenia',
  classification: 'Klasyfikacja',
};

function FieldInfoItem({
  field,
  value,
  testIdPrefix,
}: Readonly<{
  field: ExerciseFieldMetadata;
  value: string;
  testIdPrefix: string;
}>) {
  return (
    <div className="rounded-lg border border-border/60 bg-surface-light/20 p-3">
      <div className="flex items-center gap-2">
        <p className="text-xs font-medium text-muted-foreground">{field.label}</p>
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
                aria-label={`Informacja o polu: ${field.label}`}
                data-testid={`${testIdPrefix}-field-help-${field.key}`}
              >
                <Info className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs">
              {field.tooltip}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <p className="mt-1 text-sm text-foreground whitespace-pre-wrap">{value}</p>
    </div>
  );
}

export function ExercisePreviewDialog({
  open,
  exercise,
  onOpenChange,
  testIdPrefix = 'exercise-preview',
}: Readonly<ExercisePreviewDialogProps>) {
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);

  const galleryImages = useMemo(() => {
    if (!exercise) return [];
    const imagesFromGallery = (exercise.imageUrls ?? [])
      .map((image) => getMediaUrl(image) ?? image)
      .filter((image): image is string => Boolean(image?.trim()));
    const thumbnailFallback = exercise.thumbnailUrl
      ? (getMediaUrl(exercise.thumbnailUrl) ?? exercise.thumbnailUrl)
      : null;

    if (thumbnailFallback && !imagesFromGallery.includes(thumbnailFallback)) {
      return [thumbnailFallback, ...imagesFromGallery];
    }

    return imagesFromGallery;
  }, [exercise]);

  useEffect(() => {
    setCurrentMediaIndex(0);
  }, [exercise?.id, open]);

  if (!exercise) return null;

  const currentImage = galleryImages[0] ?? null;
  const videoUrl = getMediaUrl(exercise.videoUrl);
  const mediaItems = useMemo<ExerciseMediaItem[]>(() => {
    const imageItems: ExerciseMediaItem[] = galleryImages.map((image) => ({ kind: 'image', url: image }));
    if (!videoUrl) return imageItems;
    return [...imageItems, { kind: 'video', url: videoUrl }];
  }, [galleryImages, videoUrl]);
  const hasMultipleMedia = mediaItems.length > 1;
  const currentMedia = mediaItems[currentMediaIndex] ?? null;

  const dialogFields = DIALOG_EXERCISE_FIELD_ORDER.map((fieldKey) => {
    const field = EXERCISE_FIELD_METADATA[fieldKey];
    if (!field.isDialogVisible) return null;
    const value = formatFieldValueWithPlaceholder(field, exercise, field.group === 'content' ? 'Nie ustawiono' : '—');
    return { field, value };
  }).filter((item): item is { field: ExerciseFieldMetadata; value: string } => item !== null);

  const fieldsByGroup = dialogFields.reduce<Record<ExerciseFieldGroup, Array<{ field: ExerciseFieldMetadata; value: string }>>>(
    (accumulator, fieldData) => {
      accumulator[fieldData.field.group].push(fieldData);
      return accumulator;
    },
    {
      dosage: [],
      execution: [],
      content: [],
      classification: [],
    }
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl max-h-[90vh] overflow-hidden p-0 flex flex-col"
        data-testid={`${testIdPrefix}-dialog`}
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle data-testid={`${testIdPrefix}-title`}>{exercise.displayName}</DialogTitle>
          <DialogDescription className="sr-only">
            Podgląd opisu, mediów i parametrów wybranego ćwiczenia.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain" data-testid={`${testIdPrefix}-content`}>
          <div className="px-6 py-5 space-y-5">
            {currentMedia && (
              <div
                className="relative aspect-video rounded-xl overflow-hidden border border-border bg-surface-light"
                data-testid={`${testIdPrefix}-media`}
              >
                {currentMedia.kind === 'video' ? (
                  <video
                    src={currentMedia.url}
                    controls
                    className="w-full h-full object-contain"
                    poster={currentImage ?? undefined}
                  >
                    <track kind="captions" />
                  </video>
                ) : (
                  <Image src={currentMedia.url} alt="" fill className="object-contain" sizes="768px" />
                )}

                {hasMultipleMedia && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentMediaIndex((prevIndex) => (prevIndex === 0 ? mediaItems.length - 1 : prevIndex - 1))
                      }
                      className="absolute z-10 left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full border border-border bg-background/90 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors shadow-sm"
                      aria-label="Poprzednie medium"
                      data-testid={`${testIdPrefix}-media-prev-btn`}
                      disabled={!hasMultipleMedia}
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentMediaIndex((prevIndex) => (prevIndex === mediaItems.length - 1 ? 0 : prevIndex + 1))
                      }
                      className="absolute z-10 right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full border border-border bg-background/90 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors shadow-sm"
                      aria-label="Następne medium"
                      data-testid={`${testIdPrefix}-media-next-btn`}
                      disabled={!hasMultipleMedia}
                    >
                      <ChevronRight className="h-6 w-6" />
                    </button>
                  </>
                )}

                {currentMedia.kind === 'video' && (
                  <div className="absolute top-3 right-3 rounded-md bg-background/85 border border-border px-2 py-1 text-xs font-medium inline-flex items-center gap-1">
                    <Play className="h-3 w-3" />
                    Wideo
                  </div>
                )}

                {hasMultipleMedia && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-md bg-background/85 border border-border px-2.5 py-1 text-xs font-medium">
                    {currentMediaIndex + 1} / {mediaItems.length}
                  </div>
                )}
              </div>
            )}

            {!currentMedia && (
              <div
                className="relative aspect-video rounded-xl overflow-hidden border border-border bg-surface-light flex items-center justify-center"
                data-testid={`${testIdPrefix}-media-empty`}
              >
                <ImagePlaceholder type="exercise" iconClassName="h-16 w-16" />
              </div>
            )}

            {hasMultipleMedia && (
              <div className="flex flex-wrap items-center justify-center gap-2" data-testid={`${testIdPrefix}-media-slider`}>
                {mediaItems.map((mediaItem, mediaIndex) => (
                  <button
                    key={`${mediaItem.kind}-${mediaIndex}-${mediaItem.url}`}
                    type="button"
                    onClick={() => setCurrentMediaIndex(mediaIndex)}
                    className={`h-2.5 rounded-full transition-all ${
                      mediaIndex === currentMediaIndex
                        ? 'w-8 bg-primary'
                        : 'w-2.5 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                    }`}
                    aria-label={`Przejdź do medium ${mediaIndex + 1}`}
                    data-testid={`${testIdPrefix}-media-dot-${mediaIndex}`}
                  />
                ))}
              </div>
            )}

            <Separator />

            <div className="space-y-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Parametry i informacje kliniczne</p>
              <div className="grid gap-4" data-testid={`${testIdPrefix}-params`}>
                {(Object.keys(fieldsByGroup) as ExerciseFieldGroup[]).map((groupKey) => {
                  const groupFields = fieldsByGroup[groupKey];
                  if (groupFields.length === 0) return null;

                  return (
                    <div key={groupKey} className="space-y-2">
                      <p className="text-xs font-semibold text-foreground/80">{GROUP_TITLES[groupKey]}</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {groupFields.map(({ field, value }) => (
                          <FieldInfoItem key={field.key} field={field} value={value} testIdPrefix={testIdPrefix} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {!HIDE_EXERCISE_TAGS && (exercise.mainTags?.length || exercise.additionalTags?.length) ? (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Tagi</p>
                  <div className="flex flex-wrap gap-2">
                    {exercise.mainTags?.map((tag) => (
                      <Badge key={`main-${tag}`} variant="default">
                        {tag}
                      </Badge>
                    ))}
                    {exercise.additionalTags?.map((tag) => (
                      <Badge key={`additional-${tag}`} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border flex justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid={`${testIdPrefix}-close-btn`}
          >
            Zamknij
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
