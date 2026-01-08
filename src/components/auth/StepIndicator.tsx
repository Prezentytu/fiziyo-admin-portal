"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  labels?: string[];
}

export function StepIndicator({
  currentStep,
  totalSteps,
  labels,
}: StepIndicatorProps) {
  return (
    <div className="mb-6 mt-4 py-2">
      <div className="flex items-start justify-between px-4">
        {Array.from({ length: totalSteps }, (_, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          const isCompleted = stepNumber < currentStep;

          return (
            <div key={stepNumber} className="flex flex-1 flex-col items-center">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-300",
                  isActive && "border-primary bg-primary",
                  isCompleted && "border-primary-dark bg-primary-dark",
                  !isActive && !isCompleted && "border-border bg-surface-light"
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4 text-foreground" />
                ) : (
                  <span
                    className={cn(
                      "text-sm font-medium",
                      isActive
                        ? "font-bold text-primary-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {stepNumber}
                  </span>
                )}
              </div>
              {labels && labels[index] && (
                <span
                  className={cn(
                    "mt-1 text-center text-xs transition-colors",
                    isActive
                      ? "font-medium text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {labels[index]}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {totalSteps > 1 && (
        <div className="mx-12 mt-2 h-0.5 rounded-full bg-border">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{
              width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%`,
            }}
          />
        </div>
      )}
    </div>
  );
}

















