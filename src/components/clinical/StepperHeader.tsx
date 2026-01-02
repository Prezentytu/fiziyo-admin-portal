'use client';

import { Check, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Step {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface StepperHeaderProps {
  steps: Step[];
  currentStep: number;
  completedSteps: Set<number>;
  onStepClick?: (stepIndex: number) => void;
  disabled?: boolean;
  readOnly?: boolean;
}

export function StepperHeader({
  steps,
  currentStep,
  completedSteps,
  onStepClick,
  disabled = false,
  readOnly = false,
}: StepperHeaderProps) {
  return (
    <div className="w-full">
      {/* Mobile: Current step indicator */}
      <div className="sm:hidden mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">
            Krok {currentStep + 1} z {steps.length}
          </span>
          <span className="text-sm text-muted-foreground">
            {steps[currentStep]?.label}
          </span>
        </div>
        <div className="h-2 bg-surface-light rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300 ease-out rounded-full"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Desktop: Full stepper */}
      <nav aria-label="Progress" className="hidden sm:block">
        <ol className="flex items-center justify-between">
          {steps.map((step, index) => {
            const isCompleted = completedSteps.has(index);
            const isCurrent = index === currentStep;
            const isPast = index < currentStep;
            // W trybie readOnly wszystkie kroki są klikalne (nawigacja po podglądzie)
            const isClickable = readOnly || (!disabled && (isPast || isCompleted));
            const StepIcon = step.icon;

            return (
              <li key={step.id} className="flex-1 relative">
                {/* Connector line */}
                {index > 0 && (
                  <div
                    className={cn(
                      'absolute left-0 right-1/2 top-5 h-0.5 -translate-y-1/2',
                      isPast || isCompleted ? 'bg-primary' : 'bg-border'
                    )}
                    style={{ left: '-50%', right: '50%' }}
                  />
                )}
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      'absolute left-1/2 right-0 top-5 h-0.5 -translate-y-1/2',
                      isPast && index < currentStep - 1 ? 'bg-primary' : 
                      isCompleted && completedSteps.has(index + 1) ? 'bg-primary' : 'bg-border'
                    )}
                    style={{ left: '50%', right: '-50%' }}
                  />
                )}

                <button
                  type="button"
                  onClick={() => isClickable && onStepClick?.(index)}
                  disabled={!isClickable}
                  className={cn(
                    'relative flex flex-col items-center group w-full',
                    isClickable && 'cursor-pointer',
                    !isClickable && 'cursor-default'
                  )}
                >
                  {/* Step circle */}
                  <span
                    className={cn(
                      'relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-200',
                      isCurrent && 'border-primary bg-primary text-primary-foreground scale-110 shadow-lg shadow-primary/30',
                      isCompleted && !isCurrent && 'border-primary bg-primary text-primary-foreground',
                      !isCurrent && !isCompleted && 'border-border bg-surface text-muted-foreground',
                      isClickable && !isCurrent && 'group-hover:border-primary/60 group-hover:bg-primary/10'
                    )}
                  >
                    {isCompleted && !isCurrent ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <StepIcon className="h-5 w-5" />
                    )}
                  </span>

                  {/* Step label */}
                  <span
                    className={cn(
                      'mt-2 text-xs font-medium transition-colors',
                      isCurrent && 'text-primary',
                      isCompleted && !isCurrent && 'text-foreground',
                      !isCurrent && !isCompleted && 'text-muted-foreground',
                      isClickable && !isCurrent && 'group-hover:text-foreground'
                    )}
                  >
                    {step.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}

