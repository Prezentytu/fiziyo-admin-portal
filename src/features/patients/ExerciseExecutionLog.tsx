'use client';

import { Clock, Dumbbell } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    <Card className={cn('border-border/60 bg-surface dark:bg-surface/50', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Dumbbell className="h-4 w-4 text-primary" />
          Ostatnie wykonania
        </CardTitle>
      </CardHeader>
      <CardContent>
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
                <div key={execution.id} className="rounded-xl border border-border/60 bg-background/50 p-3">
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
      </CardContent>
    </Card>
  );
}
