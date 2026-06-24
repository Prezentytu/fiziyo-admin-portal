'use client';

import {
  Repeat,
  Dumbbell,
  Clock,
  Timer,
  RefreshCw,
  ArrowLeftRight,
  Gauge,
  FileText,
  Volume2,
  Move,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildExerciseParameterGroups } from './utils/buildExerciseParameterGroups';
import type { ExerciseFieldValueSource } from '@/components/shared/exercise/displayRegistry';

const ICON_MAP: Record<string, LucideIcon> = {
  sets: Repeat,
  reps: Dumbbell,
  time: Clock,
  pause: Timer,
  tempo: RefreshCw,
  load: Dumbbell,
  side: ArrowLeftRight,
  range: Move,
  difficulty: Gauge,
  description: FileText,
  audio: Volume2,
  notes: FileText,
};

interface ExerciseParametersPanelProps {
  source: ExerciseFieldValueSource;
}

export function ExerciseParametersPanel({ source }: Readonly<ExerciseParametersPanelProps>) {
  const groups = buildExerciseParameterGroups(source);

  return (
    <TooltipProvider delayDuration={150}>
      <div
        className="rounded-2xl border border-border/40 bg-surface/50 divide-y divide-border/40"
        data-testid="exercise-detail-parameters-panel"
      >
        {groups.map((group) => (
          <div key={group.id} className="p-4">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
              {group.title}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {group.items.map((item) => {
                const Icon = ICON_MAP[item.iconKey] ?? Clock;
                return (
                  <div
                    key={item.key}
                    className="rounded-xl bg-surface-light/30 p-3"
                    data-testid={`exercise-param-${item.key}`}
                  >
                    <div className="flex items-center gap-1 mb-1.5">
                      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                      <span className="text-[11px] text-muted-foreground leading-none truncate">
                        {item.label}
                      </span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="ml-auto inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-muted-foreground/50 transition-colors hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50"
                            aria-label={`Informacja: ${item.label}`}
                            data-testid={`exercise-param-${item.key}-info`}
                          >
                            <Info className="h-3 w-3" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs text-xs">
                          {item.tooltip}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p
                      className={cn(
                        'text-base font-semibold leading-tight tabular-nums',
                        item.isEmpty ? 'text-muted-foreground/40' : 'text-foreground'
                      )}
                    >
                      {item.value}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </TooltipProvider>
  );
}
