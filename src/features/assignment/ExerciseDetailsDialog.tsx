'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { TooltipProvider } from '@/components/ui/tooltip';
import { FieldHelpTooltip } from '@/components/shared/FieldHelpTooltip';
import { VideoEmbed } from '@/components/shared/VideoEmbed';
import { getMediaUrl } from '@/utils/mediaUrl';
import { canOpenVideoOutsidePortal } from '@/utils/videoEmbed';
import type { ExerciseMapping } from './types';
import { buildExerciseDetailsViewModel } from './exerciseDetailsViewModel';
import {
  DIALOG_EXERCISE_FIELD_ORDER,
  EXERCISE_FIELD_METADATA,
  HIDE_EXERCISE_TAGS,
  formatFieldValueWithPlaceholder,
  fromExerciseMapping,
  type ExerciseFieldGroup,
  type ExerciseFieldMetadata,
} from '@/components/shared/exercise';
import {
  PATIENT_VIEW_DIALOG_WIDTH,
  PatientViewTabContent,
  PatientViewTabsList,
  toExercisePreviewView,
  type ExercisePreviewView,
} from '@/components/shared/exercise/patient-preview/PatientViewTabs';

interface ExerciseDetailsDialogProps {
  open: boolean;
  mapping: ExerciseMapping | null;
  onOpenChange: (open: boolean) => void;
}

const GROUP_TITLES: Record<ExerciseFieldGroup, string> = {
  dosage: 'Podstawowe parametry',
  execution: 'Parametry wykonania',
  content: 'Treści ćwiczenia',
  classification: 'Klasyfikacja',
};

function FieldInfoItem({
  field,
  value,
}: Readonly<{
  field: ExerciseFieldMetadata;
  value: string;
}>) {
  return (
    <div className="rounded-lg border border-border/60 bg-surface-light/20 p-3">
      <div className="flex items-center gap-2">
        <p className="text-xs font-medium text-muted-foreground">{field.label}</p>
        <TooltipProvider delayDuration={150}>
          <FieldHelpTooltip
            label={field.label}
            help={field.help}
            testId={`assign-set-preview-exercise-details-help-${field.key}`}
          />
        </TooltipProvider>
      </div>
      <p className="mt-1 text-sm text-foreground whitespace-pre-wrap">{value}</p>
    </div>
  );
}

export function ExerciseDetailsDialog({ open, mapping, onOpenChange }: Readonly<ExerciseDetailsDialogProps>) {
  const [view, setView] = useState<ExercisePreviewView>('details');

  useEffect(() => {
    setView('details');
  }, [mapping?.id, open]);

  const viewModel = mapping ? buildExerciseDetailsViewModel(mapping) : null;
  const patientViewExercise = useMemo(() => (mapping ? fromExerciseMapping(mapping) : null), [mapping]);
  const imageUrls = viewModel?.imageUrls ?? [];
  const primaryImage = imageUrls[0] ?? null;
  const fallbackImage = getMediaUrl(mapping?.exercise?.imageUrl) ?? null;
  const displayImage = primaryImage ?? fallbackImage;
  const dialogFields =
    viewModel == null
      ? []
      : DIALOG_EXERCISE_FIELD_ORDER.map((fieldKey) => {
          const field = EXERCISE_FIELD_METADATA[fieldKey];
          if (!field.isDialogVisible) return null;
          const value = formatFieldValueWithPlaceholder(
            field,
            viewModel,
            field.group === 'content' ? 'Nie ustawiono' : '—'
          );
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
        className={`${view === 'patient' ? `${PATIENT_VIEW_DIALOG_WIDTH} max-h-[90dvh]` : 'max-w-3xl max-h-[90vh]'} overflow-hidden p-0 flex flex-col`}
        data-testid="assign-set-preview-exercise-details-dialog"
      >
        <Tabs
          value={view}
          onValueChange={(value) => setView(toExercisePreviewView(value))}
          className="flex min-h-0 flex-1 flex-col"
        >
          <DialogHeader className="px-6 pt-6 pb-0 border-b border-border">
            <DialogTitle data-testid="assign-set-preview-exercise-details-title">
              {viewModel?.displayName ?? 'Szczegóły ćwiczenia'}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Podgląd opisu, mediów i parametrów wybranego ćwiczenia.
            </DialogDescription>
            {patientViewExercise ? <PatientViewTabsList testIdPrefix="assign-set-preview-exercise-details" /> : null}
          </DialogHeader>

          {patientViewExercise ? (
            <PatientViewTabContent
              exercise={patientViewExercise}
              view={view}
              testIdPrefix="assign-set-preview-exercise-details"
            />
          ) : null}

          <TabsContent value="details" className="mt-0 flex min-h-0 flex-1 flex-col">
            <div
              className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
              data-testid="assign-set-preview-exercise-details-content"
            >
              <div className="px-6 py-5 space-y-5">
                {displayImage && (
                  <div
                    className="relative aspect-video rounded-xl overflow-hidden border border-border bg-surface-light"
                    data-testid="assign-set-preview-exercise-details-media"
                  >
                    <Image src={displayImage} alt="" fill className="object-cover" sizes="768px" />
                  </div>
                )}

                {viewModel?.videoUrl && (
                  <div className="space-y-2" data-testid="assign-set-preview-exercise-details-video">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Film instruktażowy</p>
                    {canOpenVideoOutsidePortal(viewModel.videoUrl) ? (
                      <a
                        href={viewModel.videoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center text-sm text-primary hover:underline"
                        data-testid="assign-set-preview-exercise-details-video-link"
                      >
                        Otwórz film
                      </a>
                    ) : (
                      <div className="aspect-video w-full">
                        <VideoEmbed url={viewModel.videoUrl} title={viewModel.displayName} />
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Opis</p>
                  <p
                    className="text-sm text-foreground whitespace-pre-wrap"
                    data-testid="assign-set-preview-exercise-details-description"
                  >
                    {viewModel?.description ?? 'Brak opisu ćwiczenia.'}
                  </p>
                </div>

                <Separator />

                <div className="space-y-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Parametry i informacje kliniczne
                  </p>
                  <div className="grid gap-4" data-testid="assign-set-preview-exercise-details-params">
                    {(Object.keys(fieldsByGroup) as ExerciseFieldGroup[]).map((groupKey) => {
                      const groupFields = fieldsByGroup[groupKey];
                      if (groupFields.length === 0) return null;

                      return (
                        <div key={groupKey} className="space-y-2">
                          <p className="text-xs font-semibold text-foreground/80">{GROUP_TITLES[groupKey]}</p>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {groupFields.map(({ field, value }) => (
                              <FieldInfoItem key={field.key} field={field} value={value} />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {!HIDE_EXERCISE_TAGS && (viewModel?.mainTags.length || viewModel?.additionalTags.length) ? (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Tagi</p>
                      <div className="flex flex-wrap gap-2">
                        {viewModel?.mainTags.map((tag) => (
                          <Badge key={`main-${tag}`} variant="default">
                            {tag}
                          </Badge>
                        ))}
                        {viewModel?.additionalTags.map((tag) => (
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
            data-testid="assign-set-preview-exercise-details-close-btn"
          >
            Zamknij
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
