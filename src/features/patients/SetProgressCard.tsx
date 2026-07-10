'use client';

import { CheckCircle2, FolderKanban } from 'lucide-react';

import { cn } from '@/lib/utils';
import { formatRelativeDate } from '@/lib/therapyStatus';

interface ExerciseSetProgressSummary {
  assignmentId: string;
  exerciseSetId?: string | null;
  exerciseSetName?: string | null;
  totalExercises: number;
  completedExercises: number;
  lastCompletedAt?: string | null;
}

interface AssignmentLabel {
  id: string;
  completionCount?: number | null;
  currentCycleStartedAt?: string | null;
  exerciseSet?: {
    name?: string | null;
  } | null;
}

interface SetProgressCardProps {
  readonly progress: ExerciseSetProgressSummary[];
  readonly assignments: AssignmentLabel[];
  readonly className?: string;
}

export function SetProgressCard({ progress, assignments, className }: SetProgressCardProps) {
  const assignmentNameById = new Map(
    assignments.map((assignment) => [assignment.id, assignment.exerciseSet?.name || 'Zestaw ćwiczeń'])
  );
  const assignmentById = new Map(assignments.map((assignment) => [assignment.id, assignment]));

  return (
    <div
      className={cn(
        'rounded-xl md:rounded-2xl border border-border/60 bg-background/40 dark:bg-background/20 p-5 md:p-6',
        className
      )}
    >
      <div className="flex items-center gap-2.5 mb-5">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <FolderKanban className="h-3.5 w-3.5 text-primary" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">Postęp zestawów</h3>
      </div>

      {progress.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Brak danych o postępie zestawów.</p>
      ) : (
        <div className="space-y-3">
          {progress.map((item) => {
            const total = item.totalExercises || 0;
            const completed = Math.min(item.completedExercises || 0, total);
            const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
            const isComplete = total > 0 && completed >= total;
            const name = item.exerciseSetName || assignmentNameById.get(item.assignmentId) || 'Zestaw ćwiczeń';
            const assignment = assignmentById.get(item.assignmentId);
            const completedCycles =
              total > 0 && assignment?.completionCount ? Math.floor(assignment.completionCount / total) : 0;

            return (
              <div
                key={item.assignmentId}
                className="rounded-lg border border-border/60 bg-surface/70 dark:bg-surface/40 p-3"
              >
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{name}</p>
                    {item.lastCompletedAt && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Ostatnio: {formatRelativeDate(item.lastCompletedAt)}
                      </p>
                    )}
                    {assignment?.currentCycleStartedAt && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Bieżący cykl od {formatRelativeDate(assignment.currentCycleStartedAt)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-sm font-semibold text-foreground">
                    {isComplete && <CheckCircle2 className="h-4 w-4 text-success" />}
                    {completed}/{total}
                  </div>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-200"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                {completedCycles > 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">Zamknięte cykle: {completedCycles}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
