'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WizardStep, WizardStepConfig } from './types';

interface WizardStepIndicatorProps {
  steps: WizardStepConfig[];
  currentStep: WizardStep;
  completedSteps: Set<WizardStep>;
  onStepClick?: (step: WizardStep) => void;
  allowNavigation?: boolean;
  variant?: 'default' | 'micro' | 'compact';
}

export function WizardStepIndicator({
  steps,
  currentStep,
  completedSteps,
  onStepClick,
  allowNavigation = false,
  variant = 'default',
}: WizardStepIndicatorProps) {
  const currentIndex = steps.findIndex((s) => s.id === currentStep);
  const progressPercent = steps.length > 1 ? (currentIndex / (steps.length - 1)) * 100 : 100;
  const currentStepConfig = steps.find((s) => s.id === currentStep);

  if (variant === 'micro') {
    return (
      <div className="flex items-center gap-1.5 shrink-0" data-testid="assign-wizard-step-indicator">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.has(step.id);
          const isCurrent = step.id === currentStep;
          const canClick = allowNavigation && (isCompleted || index < currentIndex);
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => canClick && onStepClick?.(step.id)}
              disabled={!canClick}
              title={currentStepConfig?.label}
              className={cn(
                'flex items-center justify-center rounded-full transition-all duration-200',
                isCurrent && 'h-5 w-5 min-w-5 bg-primary text-primary-foreground',
                isCompleted && !isCurrent && 'h-3 w-3 min-w-3 bg-primary text-primary-foreground',
                !isCurrent && !isCompleted && 'h-3 w-3 min-w-3 bg-surface-light border border-border',
                canClick && !isCurrent && 'hover:scale-110 hover:border-primary cursor-pointer'
              )}
            >
              {isCompleted && !isCurrent ? <Check className="h-2 w-2" /> : isCurrent ? index + 1 : null}
            </button>
          );
        })}
        <span className="text-[10px] font-medium text-muted-foreground tabular-nums ml-0.5">
          {currentIndex + 1}/{steps.length}
        </span>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="w-full min-w-0" data-testid="assign-wizard-step-indicator">
        <div className="relative px-3 py-1.5">
          <div className="h-1 w-full rounded-full bg-surface-light overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary via-primary to-emerald-400 transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="absolute inset-x-3 top-0 bottom-0 flex items-center">
            {steps.map((step, index) => {
              const isCompleted = completedSteps.has(step.id);
              const isCurrent = step.id === currentStep;
              const isPast = index < currentIndex;
              const canClick = allowNavigation && (isCompleted || isPast);
              const dotPosition = steps.length > 1 ? (index / (steps.length - 1)) * 100 : 50;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => canClick && onStepClick?.(step.id)}
                  disabled={!canClick}
                  className={cn(
                    'absolute flex items-center justify-center transition-all duration-200',
                    canClick && 'cursor-pointer'
                  )}
                  style={{ left: `${dotPosition}%`, transform: 'translateX(-50%)' }}
                  title={step.label}
                >
                  <div
                    className={cn(
                      'flex items-center justify-center rounded-full transition-all duration-200',
                      isCurrent &&
                        'h-4 w-4 min-w-4 bg-primary text-primary-foreground shadow-md ring-2 ring-primary/30',
                      isCompleted && !isCurrent && 'h-3 w-3 min-w-3 bg-primary text-primary-foreground',
                      !isCurrent && !isCompleted && 'h-2.5 w-2.5 min-w-2.5 bg-surface-light border border-border',
                      canClick && !isCurrent && 'hover:scale-110 hover:border-primary'
                    )}
                  >
                    {isCompleted && !isCurrent ? (
                      <Check className="h-1.5 w-1.5" />
                    ) : isCurrent ? (
                      <span className="text-[8px] font-bold leading-none">{index + 1}</span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      <div className="relative px-4 py-3">
        <div className="h-1.5 w-full rounded-full bg-surface-light overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary via-primary to-emerald-400 transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="absolute inset-x-4 top-0 bottom-0 flex items-center">
          {steps.map((step, index) => {
            const isCompleted = completedSteps.has(step.id);
            const isCurrent = step.id === currentStep;
            const isPast = index < currentIndex;
            const canClick = allowNavigation && (isCompleted || isPast);
            const dotPosition = steps.length > 1 ? (index / (steps.length - 1)) * 100 : 50;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => canClick && onStepClick?.(step.id)}
                disabled={!canClick}
                className={cn(
                  'absolute flex items-center justify-center transition-all duration-300',
                  canClick && 'cursor-pointer'
                )}
                style={{ left: `${dotPosition}%`, transform: 'translateX(-50%)' }}
                title={step.label}
              >
                <div
                  className={cn(
                    'flex items-center justify-center rounded-full transition-all duration-300',
                    isCurrent &&
                      'h-7 w-7 bg-primary text-primary-foreground shadow-lg shadow-primary/40 ring-4 ring-primary/20',
                    isCompleted && !isCurrent && 'h-5 w-5 bg-primary text-primary-foreground',
                    !isCurrent && !isCompleted && 'h-4 w-4 bg-surface-light border-2 border-border',
                    canClick && !isCurrent && 'hover:scale-125 hover:border-primary'
                  )}
                >
                  {isCompleted && !isCurrent && <Check className="h-3 w-3" />}
                  {isCurrent && <span className="text-xs font-bold">{index + 1}</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            Krok {currentIndex + 1} z {steps.length}
          </span>
          <span className="text-muted-foreground/40">•</span>
          <span className="text-sm font-semibold text-foreground">{currentStepConfig?.label}</span>
        </div>
        <p className="text-xs text-muted-foreground hidden sm:block max-w-[300px] text-right">
          {currentStepConfig?.description}
        </p>
      </div>
    </div>
  );
}
