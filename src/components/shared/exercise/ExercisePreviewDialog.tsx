'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { TooltipProvider } from '@/components/ui/tooltip';
import { FieldHelpTooltip } from '@/components/shared/FieldHelpTooltip';
import { ImagePlaceholder } from '@/components/shared/ImagePlaceholder';
import { VideoEmbed } from '@/components/shared/VideoEmbed';
import { getExerciseVideos } from '@/utils/exerciseVideos';
import { getMediaUrls } from '@/utils/mediaUrl';
import { isVimeoUrl, isYouTubeUrl } from '@/utils/videoEmbed';
import {
  DIALOG_EXERCISE_FIELD_ORDER,
  EXERCISE_FIELD_METADATA,
  HIDE_EXERCISE_TAGS,
  formatFieldValueWithPlaceholder,
  type ExerciseFieldGroup,
  type ExerciseFieldMetadata,
} from './displayRegistry';
import { resolvePatientInstruction } from './patientInstruction';
import { readExerciseSchemaVersion } from './readExerciseContent';
import { computeExerciseTimeLabels } from './computedExerciseTime';
import { ExerciseComputedTime } from './ExerciseComputedTime';
import { ExercisePatientContentFields } from './ExercisePatientContentFields';
import type { ExerciseExecutionCardData } from './types';
import {
  PATIENT_VIEW_DIALOG_WIDTH,
  PatientViewTabContent,
  PatientViewTabsList,
  toExercisePreviewView,
  type ExercisePreviewView,
} from './patient-preview/PatientViewTabs';
import { buildPreviewGallery } from './patient-preview/previewGallery';

interface ExercisePreviewDialogProps {
  open: boolean;
  exercise: ExerciseExecutionCardData | null;
  onOpenChange: (open: boolean) => void;
  testIdPrefix?: string;
}

type ExerciseMediaItem = { kind: 'image'; url: string } | { kind: 'video'; url: string };

/** Kolumny treści wycofane w kontrakcie 3.3 (§2); rekord 3.3 ich nie pokazuje, tak jak edycja w zestawie. */
const V33_RETIRED_CONTENT_FIELDS = new Set(['clinicalDescription', 'audioCue']);
/**
 * Pola treści pokazywane osobno, w pełnej szerokości: instrukcja dla pacjenta (sekcje jak w edycji)
 * i polecenie audio (w sekcji „Wskazówki”).
 */
const CONTENT_FIELDS_SHOWN_IN_SECTIONS = new Set(['patientDescription', 'audioCue']);

const noopSetPath = () => {};
const neverDirty = () => false;

const GROUP_TITLES: Record<ExerciseFieldGroup, string> = {
  dosage: 'Podstawowe parametry',
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
          <FieldHelpTooltip label={field.label} help={field.help} testId={`${testIdPrefix}-field-help-${field.key}`} />
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
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [view, setView] = useState<ExercisePreviewView>('details');

  const galleryImages = useMemo(() => buildPreviewGallery(exercise), [exercise]);

  useEffect(() => {
    setCurrentMediaIndex(0);
    setView('details');
  }, [exercise?.id, open]);

  const mediaItems = useMemo<ExerciseMediaItem[]>(() => {
    if (!exercise) return [];
    const imageItems: ExerciseMediaItem[] = galleryImages.map((image) => ({ kind: 'image', url: image }));
    const videoItems: ExerciseMediaItem[] = getMediaUrls(getExerciseVideos(exercise)).map((video) => ({
      kind: 'video',
      url: video,
    }));
    return [...imageItems, ...videoItems];
  }, [exercise, galleryImages]);

  if (!exercise) return null;

  const currentImage = galleryImages[0] ?? null;
  const hasMultipleMedia = mediaItems.length > 1;
  const currentMedia = mediaItems[currentMediaIndex] ?? null;

  // Instrukcja, którą dostanie pacjent: nadpisanie z planu albo treść rekordu (opis rekordu starego, kroki).
  const instruction = resolvePatientInstruction({
    override: exercise.patientDescriptionOverride,
    exercise: { patientDescription: exercise.patientDescription },
    enrichment: exercise.enrichment,
  });
  const contentVersion = readExerciseSchemaVersion({
    enrichmentData: exercise.templateEnrichment ?? exercise.enrichment,
  })
    ? '3.3'
    : 'legacy';
  const computedTimes = computeExerciseTimeLabels(exercise, {
    type: exercise.isTimeBased ? 'time' : 'reps',
    alternatingPerSide: exercise.alternatingPerSide,
  });

  const dialogFields = DIALOG_EXERCISE_FIELD_ORDER.map((fieldKey) => {
    const field = EXERCISE_FIELD_METADATA[fieldKey];
    if (!field.isDialogVisible) return null;
    if (CONTENT_FIELDS_SHOWN_IN_SECTIONS.has(fieldKey)) return null;
    if (contentVersion === '3.3' && V33_RETIRED_CONTENT_FIELDS.has(fieldKey)) return null;
    const value = formatFieldValueWithPlaceholder(field, exercise, field.group === 'content' ? 'Nie ustawiono' : '—');
    return { field, value };
  }).filter((item): item is { field: ExerciseFieldMetadata; value: string } => item !== null);

  const fieldsByGroup = dialogFields.reduce<
    Record<ExerciseFieldGroup, Array<{ field: ExerciseFieldMetadata; value: string }>>
  >(
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
        className={`${view === 'patient' ? `${PATIENT_VIEW_DIALOG_WIDTH} max-h-[95dvh]` : 'max-w-3xl max-h-[95vh]'} overflow-hidden p-0 flex flex-col`}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          titleRef.current?.focus();
        }}
        data-testid={`${testIdPrefix}-dialog`}
      >
        <Tabs
          value={view}
          onValueChange={(value) => setView(toExercisePreviewView(value))}
          className="flex min-h-0 flex-1 flex-col"
        >
          <DialogHeader className="px-6 pt-6 pb-0 border-b border-border">
            <DialogTitle ref={titleRef} tabIndex={-1} className="pr-8" data-testid={`${testIdPrefix}-title`}>
              {exercise.displayName}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Podgląd opisu, mediów i parametrów wybranego ćwiczenia.
            </DialogDescription>
            <PatientViewTabsList testIdPrefix={testIdPrefix} />
          </DialogHeader>

          <PatientViewTabContent exercise={exercise} view={view} testIdPrefix={testIdPrefix} />

          <TabsContent value="details" className="mt-0 flex min-h-0 flex-1 flex-col">
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain" data-testid={`${testIdPrefix}-content`}>
              <div className="px-6 py-5 space-y-5">
                {currentMedia && (
                  <div
                    className="relative aspect-video rounded-xl overflow-hidden border border-border bg-surface-light"
                    data-testid={`${testIdPrefix}-media`}
                  >
                    {currentMedia.kind === 'video' && (isYouTubeUrl(currentMedia.url) || isVimeoUrl(currentMedia.url)) ? (
                      <VideoEmbed url={currentMedia.url} title={exercise.displayName} />
                    ) : currentMedia.kind === 'video' ? (
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
                            setCurrentMediaIndex((prevIndex) =>
                              prevIndex === 0 ? mediaItems.length - 1 : prevIndex - 1
                            )
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
                            setCurrentMediaIndex((prevIndex) =>
                              prevIndex === mediaItems.length - 1 ? 0 : prevIndex + 1
                            )
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
                  <div
                    className="flex flex-wrap items-center justify-center gap-2"
                    data-testid={`${testIdPrefix}-media-slider`}
                  >
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
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Parametry i informacje kliniczne
                  </p>
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
                          {groupKey === 'dosage' ? (
                            <ExerciseComputedTime times={computedTimes} testIdPrefix={testIdPrefix} />
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <Separator />

                <div className="space-y-3" data-testid={`${testIdPrefix}-instruction`}>
                  {instruction.source === 'override' ? (
                    <div
                      className="rounded-lg border border-border/60 bg-surface-light/20 p-3"
                      data-testid={`${testIdPrefix}-instruction-override`}
                    >
                      <p className="text-xs font-medium text-muted-foreground">Opis dla pacjenta w tym planie</p>
                      <p className="mt-1 text-sm text-foreground whitespace-pre-wrap">{instruction.text}</p>
                    </div>
                  ) : null}
                  <ExercisePatientContentFields
                    readOnly
                    surface="mapping"
                    enrichment={exercise.enrichment ?? {}}
                    setPath={noopSetPath}
                    isPathDirty={neverDirty}
                    patientDescription={instruction.source === 'override' ? '' : (exercise.patientDescription ?? '')}
                    audioCue={exercise.audioCue ?? ''}
                    contentVersion={contentVersion}
                    testIdPrefix={`${testIdPrefix}-patient-content`}
                  />
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
          </TabsContent>
        </Tabs>

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
