'use client';

import type { ReactNode } from 'react';

import { TooltipProvider } from '@/components/ui/tooltip';
import { FieldHelpTooltip } from '@/components/shared/FieldHelpTooltip';
import type { FieldHelpInput } from '@/utils/fieldHelp';
import { cn } from '@/lib/utils';

interface ExerciseFieldLabelWithTooltipProps {
  label: string;
  tooltip: FieldHelpInput;
  icon?: ReactNode;
  htmlFor?: string;
  className?: string;
  labelClassName?: string;
  testId: string;
}

export function ExerciseFieldLabelWithTooltip({
  label,
  tooltip,
  icon,
  htmlFor,
  className,
  labelClassName,
  testId,
}: Readonly<ExerciseFieldLabelWithTooltipProps>) {
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {icon && (
        <span className="inline-flex h-3.5 w-3.5 items-center justify-center text-muted-foreground" data-testid={`${testId}-icon`}>
          {icon}
        </span>
      )}
      {htmlFor ? (
        <label htmlFor={htmlFor} className={labelClassName}>
          {label}
        </label>
      ) : (
        <span className={labelClassName}>{label}</span>
      )}
      <TooltipProvider delayDuration={150}>
        <FieldHelpTooltip label={label} help={tooltip} testId={testId} />
      </TooltipProvider>
    </div>
  );
}
