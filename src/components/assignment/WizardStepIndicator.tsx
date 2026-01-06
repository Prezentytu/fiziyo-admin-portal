"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WizardStep, WizardStepConfig } from "./types";

interface WizardStepIndicatorProps {
  steps: WizardStepConfig[];
  currentStep: WizardStep;
  completedSteps: Set<WizardStep>;
  onStepClick?: (step: WizardStep) => void;
  allowNavigation?: boolean;
}

export function WizardStepIndicator({
  steps,
  currentStep,
  completedSteps,
  onStepClick,
  allowNavigation = false,
}: WizardStepIndicatorProps) {
  const currentIndex = steps.findIndex((s) => s.id === currentStep);
  // Progress should fill to current dot position (same formula as dot positions)
  const progressPercent = steps.length > 1
    ? (currentIndex / (steps.length - 1)) * 100
    : 100;
  const currentStepConfig = steps.find((s) => s.id === currentStep);

  return (
    <div className="w-full space-y-3">
      {/* Progress bar with step dots - px-4 gives space for edge dots */}
      <div className="relative px-4 py-3">
        {/* Background track */}
        <div className="h-1.5 w-full rounded-full bg-surface-light overflow-hidden">
          {/* Animated fill */}
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary via-primary to-emerald-400 transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Step dots overlay - positioned relative to the track */}
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
                  "absolute flex items-center justify-center transition-all duration-300",
                  canClick && "cursor-pointer"
                )}
                style={{
                  left: `${dotPosition}%`,
                  transform: 'translateX(-50%)',
                }}
                title={step.label}
              >
                {/* Dot */}
                <div
                  className={cn(
                    "flex items-center justify-center rounded-full transition-all duration-300",
                    isCurrent && "h-7 w-7 bg-primary text-primary-foreground shadow-lg shadow-primary/40 ring-4 ring-primary/20",
                    isCompleted && !isCurrent && "h-5 w-5 bg-primary text-primary-foreground",
                    !isCurrent && !isCompleted && "h-4 w-4 bg-surface-light border-2 border-border",
                    canClick && !isCurrent && "hover:scale-125 hover:border-primary"
                  )}
                >
                  {isCompleted && !isCurrent && (
                    <Check className="h-3 w-3" />
                  )}
                  {isCurrent && (
                    <span className="text-xs font-bold">{index + 1}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Current step info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            Krok {currentIndex + 1} z {steps.length}
          </span>
          <span className="text-muted-foreground/40">•</span>
          <span className="text-sm font-semibold text-foreground">
            {currentStepConfig?.label}
          </span>
        </div>

        {/* Mobile: show description */}
        <p className="text-xs text-muted-foreground hidden sm:block max-w-[300px] text-right">
          {currentStepConfig?.description}
        </p>
      </div>
    </div>
  );
}
