'use client';

import { Info } from 'lucide-react';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ExerciseFieldLabelWithTooltipProps {
  label: string;
  tooltip: string;
  htmlFor?: string;
  className?: string;
  labelClassName?: string;
  testId: string;
}

export function ExerciseFieldLabelWithTooltip({
  label,
  tooltip,
  htmlFor,
  className,
  labelClassName,
  testId,
}: Readonly<ExerciseFieldLabelWithTooltipProps>) {
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {htmlFor ? (
        <label htmlFor={htmlFor} className={labelClassName}>
          {label}
        </label>
      ) : (
        <span className={labelClassName}>{label}</span>
      )}
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
              aria-label={`Informacja o polu: ${label}`}
              data-testid={testId}
            >
              <Info className="h-3 w-3" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs text-xs">
            {tooltip}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
