'use client';

import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { getMediaUrl } from '@/utils/mediaUrl';
import type { ExerciseMapping } from './types';
import { buildExerciseDetailsViewModel } from './exerciseDetailsViewModel';

interface ExerciseDetailsDialogProps {
  open: boolean;
  mapping: ExerciseMapping | null;
  onOpenChange: (open: boolean) => void;
}

function formatSideLabel(side?: string): string | null {
  if (!side) return null;

  const normalizedSide = side.toLowerCase();
  if (normalizedSide === 'left') return 'Lewa strona';
  if (normalizedSide === 'right') return 'Prawa strona';
  if (normalizedSide === 'both') return 'Obie strony';
  if (normalizedSide === 'alternating') return 'Naprzemiennie';
  if (normalizedSide === 'none') return 'Bez podziału';
  return null;
}

export function ExerciseDetailsDialog({ open, mapping, onOpenChange }: Readonly<ExerciseDetailsDialogProps>) {
  const viewModel = mapping ? buildExerciseDetailsViewModel(mapping) : null;
  const sideLabel = formatSideLabel(viewModel?.side);
  const imageUrls = viewModel?.imageUrls ?? [];
  const primaryImage = imageUrls[0] ?? null;
  const fallbackImage = getMediaUrl(mapping?.exercise?.imageUrl) ?? null;
  const displayImage = primaryImage ?? fallbackImage;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl p-0 flex flex-col"
        data-testid="assign-set-preview-exercise-details-dialog"
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle data-testid="assign-set-preview-exercise-details-title">
            {viewModel?.displayName ?? 'Szczegóły ćwiczenia'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Podgląd opisu, mediów i parametrów wybranego ćwiczenia.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]" data-testid="assign-set-preview-exercise-details-content">
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
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Wideo</p>
                <a
                  href={viewModel.videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center text-sm text-primary hover:underline"
                >
                  Otwórz wideo ćwiczenia
                </a>
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

            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Parametry wykonania</p>
              <div className="flex flex-wrap gap-2" data-testid="assign-set-preview-exercise-details-params">
                <Badge variant="outline">{viewModel?.sets ?? 0} serie</Badge>
                <Badge variant="outline">{viewModel?.reps ?? 0} powt.</Badge>
                {viewModel?.executionTime != null && viewModel.executionTime > 0 && (
                  <Badge variant="outline">Czas powtórzenia: {viewModel.executionTime}s</Badge>
                )}
                {viewModel?.duration != null && viewModel.duration > 0 && (
                  <Badge variant="outline">Czas serii: {viewModel.duration}s</Badge>
                )}
                {viewModel?.restSets != null && viewModel.restSets > 0 && (
                  <Badge variant="outline">Przerwa między seriami: {viewModel.restSets}s</Badge>
                )}
                {viewModel?.restReps != null && viewModel.restReps > 0 && (
                  <Badge variant="outline">Przerwa między powt.: {viewModel.restReps}s</Badge>
                )}
                {viewModel?.preparationTime != null && viewModel.preparationTime > 0 && (
                  <Badge variant="outline">Czas przygotowania: {viewModel.preparationTime}s</Badge>
                )}
                {viewModel?.tempo && <Badge variant="outline">Tempo: {viewModel.tempo}</Badge>}
                {viewModel?.loadDisplayText && <Badge variant="outline">Obciążenie: {viewModel.loadDisplayText}</Badge>}
                {sideLabel && <Badge variant="outline">Strona ciała: {sideLabel}</Badge>}
              </div>
            </div>

            {viewModel?.notes && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Notatka</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{viewModel.notes}</p>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

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

