'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { ExerciseExecutionCardData } from '../types';
import { PatientPreviewTab } from './PatientPreviewTab';
import { PATIENT_VIEW_DIALOG_WIDTH } from './PatientViewTabs';
import { buildPreviewGallery } from './previewGallery';

interface PatientPreviewDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly exercise: ExerciseExecutionCardData | null;
  readonly testIdPrefix: string;
}

/** Sam telefon „Jak u pacjenta” dla stron, które pokazują szczegóły ćwiczenia na sobie (strona ćwiczenia, weryfikacja). */
export function PatientPreviewDialog({ open, onOpenChange, exercise, testIdPrefix }: PatientPreviewDialogProps) {
  if (!exercise) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`${PATIENT_VIEW_DIALOG_WIDTH} max-h-[95vh] overflow-hidden p-0 flex flex-col`}
        data-testid={`${testIdPrefix}-dialog`}
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle data-testid={`${testIdPrefix}-title`}>{exercise.displayName}</DialogTitle>
          <DialogDescription>Tak zobaczy to ćwiczenie pacjent w aplikacji.</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {open ? (
            <PatientPreviewTab
              exercise={exercise}
              imageUrl={buildPreviewGallery(exercise)[0] ?? null}
              testIdPrefix={testIdPrefix}
            />
          ) : null}
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
