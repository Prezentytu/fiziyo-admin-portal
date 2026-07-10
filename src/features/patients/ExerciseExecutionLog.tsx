'use client';

import { Clock, Dumbbell } from 'lucide-react';

import { cn } from '@/lib/utils';
import { formatDateWithTime } from '@/lib/therapyStatus';
import type { ExerciseProgressData } from '@/lib/therapyStatus';

interface ExerciseExecutionLogProps {
  readonly progress: ExerciseProgressData[];
  readonly maxItems?: number;
  readonly className?: string;
}

function formatSeconds(value?: number | null): string | null {
  if (!value || value <= 0) return null;
  const minutes = Math.floor(value / 60);
  const seconds = Math.round(value % 60);
  if (minutes === 0) return `${seconds}s`;
  return seconds === 0 ? `${minutes} min` : `${minutes} min ${seconds}s`;
}

function formatMetric(label: string, value?: number | null): string | null {
  if (value === null || value === undefined || value <= 0) return null;
  return `${label}: ${value}`;
}

export function ExerciseExecutionLog({ progress, maxItems = 8, className }: ExerciseExecutionLogProps) {
  const executions = progress
    .filter((item) => item.status === 'completed' && item.completedAt)
    .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())
    .slice(0, maxItems);

  return (
    <div
      className={cn(
        'rounded-xl md:rounded-2xl border border-border/60 bg-background/40 dark:bg-background/20 p-5 md:p-6',
        className
      )}
    >
      <div className="flex items-center gap-2.5 mb-5">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Dumbbell className="h-3.5 w-3.5 text-primary" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">Ostatnie wykonania</h3>
      </div>

      {executions.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Brak zarejestrowanych wykonań.</p>
      ) : (
        <div className="space-y-3">
          {executions.map((execution) => {
            const duration = formatSeconds(execution.realDuration ?? execution.completedTime);
            const metrics = [
              formatMetric('Serie', execution.completedSets),
              formatMetric('Powt.', execution.completedReps),
              duration ? `Czas: ${duration}` : null,
              formatMetric('Ból', execution.painLevel),
              formatMetric('Trudność', execution.difficultyLevel),
            ].filter((metric): metric is string => Boolean(metric));

            return (
              <div
                key={execution.id}
                className="rounded-lg border border-border/60 bg-surface/70 dark:bg-surface/40 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {execution.exercise?.name || 'Ćwiczenie'}
                    </p>
                    <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDateWithTime(new Date(execution.completedAt!))}
                    </div>
                  </div>
                </div>

                {metrics.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {metrics.map((metric) => (
                      <span
                        key={metric}
                        className="rounded-md border border-border bg-surface-elevated px-2 py-0.5 text-[11px] text-muted-foreground"
                      >
                        {metric}
                      </span>
                    ))}
                  </div>
                )}

                {(execution.patientNotes || execution.notes) && (
                  <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                    {execution.patientNotes && <p>Pacjent: &ldquo;{execution.patientNotes}&rdquo;</p>}
                    {execution.notes && <p>Terapeuta: &ldquo;{execution.notes}&rdquo;</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
