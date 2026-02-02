'use client';

import { useMemo } from 'react';
import { Check, AlertCircle, FileEdit } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface CompletionBarProps {
  /** Completion percentage (0-100) */
  percentage: number;
  /** Color status based on completion level */
  colorStatus: 'critical' | 'draft' | 'ready';
  /** List of missing critical fields */
  criticalMissing?: string[];
  /** List of missing recommended fields */
  recommendedMissing?: string[];
  /** Show milestone markers (40%, 100%) */
  showMilestones?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * CompletionBar - Visual progress indicator with milestone markers
 *
 * Features:
 * - Smooth animated progress bar
 * - Color changes based on completion status (red → amber → green)
 * - Milestone markers at 40% (draft) and 100% (publish)
 * - Tooltip showing missing fields
 * - Status text indicator
 */
export function CompletionBar({
  percentage,
  colorStatus,
  criticalMissing = [],
  recommendedMissing = [],
  showMilestones = true,
  className,
}: CompletionBarProps) {
  // Determine bar color based on status
  const barColorClass = useMemo(() => {
    switch (colorStatus) {
      case 'critical':
        return 'bg-red-500';
      case 'draft':
        return 'bg-amber-500';
      case 'ready':
        return 'bg-emerald-500';
      default:
        return 'bg-amber-500';
    }
  }, [colorStatus]);

  // Status text and icon
  const statusInfo = useMemo(() => {
    if (percentage >= 100) {
      return {
        text: 'Gotowe do publikacji',
        icon: Check,
        textClass: 'text-emerald-500',
      };
    }
    if (percentage >= 40) {
      return {
        text: 'Szkic',
        icon: FileEdit,
        textClass: 'text-amber-500',
      };
    }
    return {
      text: 'Uzupełnij dane',
      icon: AlertCircle,
      textClass: 'text-red-500',
    };
  }, [percentage]);

  const StatusIcon = statusInfo.icon;

  // Build tooltip content
  const tooltipContent = useMemo(() => {
    const items: string[] = [];

    if (criticalMissing.length > 0) {
      items.push(`Wymagane: ${criticalMissing.join(', ')}`);
    }
    if (recommendedMissing.length > 0) {
      items.push(`Sugerowane: ${recommendedMissing.join(', ')}`);
    }

    if (items.length === 0) {
      return 'Wszystkie pola wypełnione!';
    }

    return items.join(' • ');
  }, [criticalMissing, recommendedMissing]);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn('w-full', className)}
            data-testid="common-completion-bar"
          >
            {/* Status text row */}
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <StatusIcon className={cn('h-3.5 w-3.5', statusInfo.textClass)} />
                <span className={cn('text-xs font-medium', statusInfo.textClass)}>
                  {statusInfo.text}
                </span>
              </div>
              <span className="text-xs text-muted-foreground font-medium">
                {percentage}%
              </span>
            </div>

            {/* Progress bar container */}
            <div className="relative h-1.5 w-full rounded-full bg-surface-light overflow-hidden">
              {/* Animated progress indicator */}
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500 ease-out',
                  barColorClass
                )}
                style={{ width: `${percentage}%` }}
              />

              {/* Milestone markers */}
              {showMilestones && (
                <>
                  {/* 40% milestone (draft threshold) */}
                  <div
                    className={cn(
                      'absolute top-1/2 -translate-y-1/2 w-0.5 h-3 rounded-full transition-colors duration-300',
                      percentage >= 40 ? 'bg-amber-500/50' : 'bg-border'
                    )}
                    style={{ left: '40%' }}
                  />
                  {/* 100% milestone (publish threshold) - at the end */}
                  <div
                    className={cn(
                      'absolute top-1/2 -translate-y-1/2 right-0 w-0.5 h-3 rounded-full transition-colors duration-300',
                      percentage >= 100 ? 'bg-emerald-500' : 'bg-border'
                    )}
                  />
                </>
              )}
            </div>

            {/* Milestone labels */}
            {showMilestones && (
              <div className="relative mt-1 h-3">
                <span
                  className={cn(
                    'absolute text-[10px] -translate-x-1/2 transition-colors duration-300',
                    percentage >= 40 ? 'text-amber-500/70' : 'text-muted-foreground/50'
                  )}
                  style={{ left: '40%' }}
                >
                  Szkic
                </span>
                <span
                  className={cn(
                    'absolute right-0 text-[10px] transition-colors duration-300',
                    percentage >= 100 ? 'text-emerald-500' : 'text-muted-foreground/50'
                  )}
                >
                  Publikuj
                </span>
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          className="max-w-xs text-xs"
          data-testid="common-completion-bar-tooltip"
        >
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
