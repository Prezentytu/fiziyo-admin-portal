'use client';

import { AlertTriangle } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface ExerciseSaveConflictNoticeProps {
  /** Moves the draft onto the current version and keeps the unsaved edits. */
  onLoadCurrent: () => void;
}

/** Shown when someone else saved the exercise while it was being edited; the save did not happen. */
export function ExerciseSaveConflictNotice({ onLoadCurrent }: Readonly<ExerciseSaveConflictNoticeProps>) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-start gap-3 rounded-2xl border border-status-warning/40 bg-status-warning-muted p-4"
      data-testid="exercise-save-conflict-notice"
    >
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-status-warning" aria-hidden />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm font-semibold text-foreground">Ktoś zmienił to ćwiczenie w trakcie Twojej edycji</p>
        <p className="text-sm text-muted-foreground">
          Zmiany z tego ekranu nie zostały zapisane, żeby nie skasować tamtych. Wczytaj aktualną wersję: wpisana
          treść zostanie na ekranie. Potem zapisz ponownie.
        </p>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={onLoadCurrent} data-testid="exercise-save-conflict-load-btn">
        Wczytaj aktualną wersję
      </Button>
    </div>
  );
}
