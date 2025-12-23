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

  return (
    <div className="w-full">
      {/* Desktop view */}
      <div className="hidden sm:flex items-center justify-between w-full">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.has(step.id);
          const isCurrent = step.id === currentStep;
          const isPast = index < currentIndex;
          const canClick = allowNavigation && (isCompleted || isPast);

          return (
            <div 
              key={step.id} 
              className={cn(
                "flex items-center",
                index < steps.length - 1 && "flex-1"
              )}
            >
              {/* Step circle and content */}
              <button
                type="button"
                onClick={() => canClick && onStepClick?.(step.id)}
                disabled={!canClick}
                className={cn(
                  "flex items-center gap-3 group min-w-0",
                  canClick && "cursor-pointer"
                )}
              >
                {/* Circle */}
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-all duration-200",
                    isCurrent &&
                      "bg-primary text-primary-foreground shadow-lg shadow-primary/30",
                    isCompleted &&
                      !isCurrent &&
                      "bg-primary/20 text-primary border-2 border-primary",
                    !isCurrent &&
                      !isCompleted &&
                      "bg-surface-light text-muted-foreground border border-border",
                    canClick && "group-hover:border-primary group-hover:text-primary"
                  )}
                >
                  {isCompleted && !isCurrent ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </div>

                {/* Label */}
                <div className="text-left min-w-0">
                  <p
                    className={cn(
                      "text-sm font-medium transition-colors",
                      isCurrent && "text-foreground",
                      !isCurrent && "text-muted-foreground",
                      canClick && "group-hover:text-foreground"
                    )}
                  >
                    {step.label}
                  </p>
                  <p className="text-xs text-muted-foreground hidden lg:block">
                    {step.description}
                  </p>
                </div>
              </button>

              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="flex-1 mx-3 min-w-[20px]">
                  <div
                    className={cn(
                      "h-0.5 w-full rounded-full transition-colors duration-200",
                      isPast || isCompleted
                        ? "bg-primary/40"
                        : "bg-border"
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile view - compact */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between mb-3">
          {steps.map((step, index) => {
            const isCompleted = completedSteps.has(step.id);
            const isCurrent = step.id === currentStep;

            return (
              <div key={step.id} className="flex items-center flex-1">
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all",
                    isCurrent &&
                      "bg-primary text-primary-foreground shadow-lg shadow-primary/30",
                    isCompleted &&
                      !isCurrent &&
                      "bg-primary/20 text-primary",
                    !isCurrent &&
                      !isCompleted &&
                      "bg-surface-light text-muted-foreground"
                  )}
                >
                  {isCompleted && !isCurrent ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "flex-1 h-0.5 mx-2 rounded-full",
                      isCompleted ? "bg-primary/40" : "bg-border"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
        <p className="text-sm font-medium text-center">
          {steps.find((s) => s.id === currentStep)?.label}
        </p>
        <p className="text-xs text-muted-foreground text-center">
          {steps.find((s) => s.id === currentStep)?.description}
        </p>
      </div>
    </div>
  );
}


