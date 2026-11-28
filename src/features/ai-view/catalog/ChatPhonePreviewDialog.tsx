'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PatientPreviewDialog } from '@/components/shared/exercise/patient-preview/PatientPreviewDialog';
import { PatientPreviewTab } from '@/components/shared/exercise/patient-preview/PatientPreviewTab';
import { PATIENT_VIEW_DIALOG_WIDTH } from '@/components/shared/exercise/patient-preview/PatientViewTabs';
import { buildPreviewGallery } from '@/components/shared/exercise/patient-preview/previewGallery';
import type { ExerciseExecutionCardData } from '@/components/shared/exercise/types';

export const CHAT_PHONE_PREVIEW_TEST_ID_PREFIX = 'chat-phone-preview';

interface ChatPhonePreviewDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly exercises: readonly ExerciseExecutionCardData[];
  readonly initialIndex?: number;
}

/**
 * Symulator telefonu „Jak u pacjenta” otwierany z kart czatu (SPEC-070).
 * Dla pojedynczego ćwiczenia deleguje wprost do `PatientPreviewDialog`; dla całego zestawu
 * lub planu dodaje przełącznik Poprzednie / Następne (`1 / N`), aby przeklikać wszystkie ćwiczenia.
 */
export function ChatPhonePreviewDialog({
  open,
  onOpenChange,
  exercises,
  initialIndex = 0,
}: ChatPhonePreviewDialogProps) {
  const safeInitial = Math.min(Math.max(0, initialIndex), Math.max(0, exercises.length - 1));
  const [index, setIndex] = useState(safeInitial);

  useEffect(() => {
    if (open) setIndex(safeInitial);
  }, [open, safeInitial]);

  const current = exercises[index] ?? exercises[0] ?? null;
  const imageUrl = useMemo(() => buildPreviewGallery(current)[0] ?? null, [current]);

  if (!current) return null;

  if (exercises.length <= 1) {
    return (
      <PatientPreviewDialog
        open={open}
        onOpenChange={onOpenChange}
        exercise={current}
        testIdPrefix={CHAT_PHONE_PREVIEW_TEST_ID_PREFIX}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`${PATIENT_VIEW_DIALOG_WIDTH} max-h-[95dvh] overflow-hidden p-0 flex flex-col gap-0`}
        data-testid={`${CHAT_PHONE_PREVIEW_TEST_ID_PREFIX}-dialog`}
      >
        <DialogHeader className="px-6 pt-6 pb-4 pr-14 border-b border-border">
          <DialogTitle data-testid={`${CHAT_PHONE_PREVIEW_TEST_ID_PREFIX}-title`}>{current.displayName}</DialogTitle>
          <DialogDescription>Tak zobaczy to ćwiczenie pacjent w aplikacji.</DialogDescription>
        </DialogHeader>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
          {open ? (
            <PatientPreviewTab
              key={current.id}
              exercise={current}
              imageUrl={imageUrl}
              testIdPrefix={CHAT_PHONE_PREVIEW_TEST_ID_PREFIX}
            />
          ) : null}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={index <= 0}
              onClick={() => setIndex((prev) => Math.max(0, prev - 1))}
              data-testid={`${CHAT_PHONE_PREVIEW_TEST_ID_PREFIX}-prev-btn`}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              Poprzednie
            </Button>
            <span
              className="px-1 text-sm tabular-nums text-muted-foreground"
              data-testid={`${CHAT_PHONE_PREVIEW_TEST_ID_PREFIX}-counter`}
            >
              {index + 1} / {exercises.length}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={index >= exercises.length - 1}
              onClick={() => setIndex((prev) => Math.min(exercises.length - 1, prev + 1))}
              data-testid={`${CHAT_PHONE_PREVIEW_TEST_ID_PREFIX}-next-btn`}
            >
              Następne
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid={`${CHAT_PHONE_PREVIEW_TEST_ID_PREFIX}-close-btn`}
          >
            Zamknij
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
