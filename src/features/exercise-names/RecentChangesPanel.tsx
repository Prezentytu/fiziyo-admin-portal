'use client';

import { RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { ExerciseNameReviewLogEntry } from '@/graphql/types/exerciseNameReview.types';

const ACTION_LABEL: Record<ExerciseNameReviewLogEntry['action'], string> = {
  RENAMED: 'Nowa nazwa',
  KEPT_NAME: 'Nazwa bez zmian',
  UNDONE: 'Cofnięte',
};

interface RecentChangesPanelProps {
  entries: ReadonlyArray<ExerciseNameReviewLogEntry>;
  loading: boolean;
  undoingId: string | null;
  pillarName: (exerciseId: string | null) => string | null;
  onUndo: (exerciseId: string) => void;
}

/** Decision log: who, when, old and new name; the latest still valid decision of an exercise can be undone. */
export function RecentChangesPanel({ entries, loading, undoingId, pillarName, onUndo }: RecentChangesPanelProps) {
  if (loading && entries.length === 0) {
    return <p className="text-sm text-muted-foreground">Wczytuję ostatnie zmiany…</p>;
  }
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">Jeszcze nikt nie zapisał decyzji w tej organizacji.</p>;
  }

  return (
    <ul className="flex flex-col divide-y divide-border" data-testid="name-review-log">
      {entries.map((entry) => {
        const variant = pillarName(entry.newPillarExerciseId);
        return (
          <li key={entry.id} className="flex items-start justify-between gap-3 py-2" data-testid={`name-review-log-${entry.id}`}>
            <div className="min-w-0 text-sm">
              <p className="text-xs text-muted-foreground">
                {ACTION_LABEL[entry.action]} · {entry.userName ?? entry.userId} ·{' '}
                {new Date(entry.createdAt).toLocaleString('pl-PL')}
              </p>
              {entry.oldName !== entry.newName ? (
                <p className="min-w-0">
                  <span className="text-muted-foreground line-through">{entry.oldName}</span>
                  {' → '}
                  <span className="font-medium text-foreground">{entry.newName}</span>
                </p>
              ) : (
                <p className="truncate font-medium text-foreground">{entry.newName}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {entry.newIsPillar ? 'Filarowe' : variant ? `Wariant: ${variant}` : 'Bez wariantu'}
              </p>
            </div>
            {entry.canUndo && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={undoingId === entry.exerciseId}
                data-testid={`name-review-log-undo-${entry.id}`}
                onClick={() => onUndo(entry.exerciseId)}
              >
                <RotateCcw aria-hidden />
                Cofnij
              </Button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
