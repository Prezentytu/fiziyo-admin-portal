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
  Info,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { buildExerciseParameterGroups } from './utils/buildExerciseParameterGroups';
import type { ExerciseParameterItem } from './utils/buildExerciseParameterGroups';
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

export interface ExerciseParameterSummaryStat {
  label: string;
  value: string;
  tooltip: string;
}

interface ExerciseParametersPanelProps {
  source: ExerciseFieldValueSource;
  summaryStat?: ExerciseParameterSummaryStat;
}

const PRIMARY_GROUP_ID = 'dosage';

export function ExerciseParametersPanel({
  source,
  summaryStat,
}: Readonly<ExerciseParametersPanelProps>) {
  const groups = buildExerciseParameterGroups(source);
  const primaryGroup = groups.find((group) => group.id === PRIMARY_GROUP_ID);
  const secondaryGroups = groups.filter((group) => group.id !== PRIMARY_GROUP_ID);

  const renderItemTile = (item: ExerciseParameterItem, emphasized: boolean) => {
    const Icon = ICON_MAP[item.iconKey] ?? Clock;
    return (
      <div
        key={item.key}
        className={cn(
          'rounded-xl',
          emphasized ? 'bg-surface p-4 shadow-sm' : 'bg-surface-light/30 p-3'
        )}
        data-testid={`exercise-param-${item.key}`}
      >
        <div className="mb-1.5 flex items-center gap-1">
          <Icon
            className={cn('shrink-0 text-muted-foreground/60', emphasized ? 'h-4 w-4' : 'h-3.5 w-3.5')}
          />
          <span
            className={cn(
              'truncate leading-none',
              emphasized
                ? 'text-xs font-medium text-muted-foreground'
                : 'text-[11px] text-muted-foreground'
            )}
          >
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
            'font-semibold leading-tight tabular-nums',
            emphasized ? 'text-xl' : 'text-base',
            item.isEmpty ? 'text-muted-foreground/40' : 'text-foreground'
          )}
        >
          {item.value}
        </p>
      </div>
    );
  };

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-3">
        {primaryGroup && (
          <div
            className="rounded-2xl border border-primary/30 bg-primary/5 p-4"
            data-testid="exercise-detail-parameters-primary-group"
          >
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-primary">
              {primaryGroup.title}
            </p>
            {summaryStat && (
              <div
                className="mb-2 flex items-center justify-between rounded-xl bg-surface p-4 shadow-sm"
                data-testid="exercise-param-summary-stat"
              >
                <div className="flex items-center gap-1">
                  <span className="text-xs font-medium text-muted-foreground">{summaryStat.label}</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-muted-foreground/50 transition-colors hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50"
                        aria-label={`Informacja: ${summaryStat.label}`}
                        data-testid="exercise-param-summary-stat-info"
                      >
                        <Info className="h-3 w-3" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs text-xs">
                      {summaryStat.tooltip}
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-xl font-bold leading-tight tabular-nums text-foreground">
                  {summaryStat.value}
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              {primaryGroup.items.map((item) => renderItemTile(item, true))}
            </div>
          </div>
        )}

        <div
          className="divide-y divide-border/40 rounded-2xl border border-border/40 bg-surface/50"
          data-testid="exercise-detail-parameters-panel"
        >
          {secondaryGroups.map((group) => (
            <div key={group.id} className="p-4">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                {group.title}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {group.items.map((item) => renderItemTile(item, false))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}
