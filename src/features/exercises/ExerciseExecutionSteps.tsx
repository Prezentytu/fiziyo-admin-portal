'use client';

import { useState } from 'react';
import { ListOrdered } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ExerciseEnrichmentData, EnrichmentInstructionStep } from '@/graphql/types/exerciseEnrichment.types';

interface StepVariant {
  key: string;
  label: string;
  steps: EnrichmentInstructionStep[];
}

interface ExerciseExecutionStepsProps {
  enrichmentData?: ExerciseEnrichmentData | null;
  patientDescription?: string;
}

function hasMeaningfulSteps(steps: EnrichmentInstructionStep[] | undefined): steps is EnrichmentInstructionStep[] {
  return Boolean(steps && steps.length > 0 && steps.some((s) => s.text?.trim()));
}

function StepsList({ steps }: { steps: EnrichmentInstructionStep[] }) {
  return (
    <ol className="space-y-3">
      {steps.map((step, index) => {
        const num = step.step ?? index + 1;
        return (
          <li
            key={`step-${num}-${step.text ?? index}`}
            className="flex gap-3"
            data-testid={`exercise-execution-step-${num}`}
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary mt-0.5">
              {num}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground leading-snug">
                {step.text ?? 'Brak opisu kroku'}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {step.phase && (
                  <span className="rounded-full bg-surface-light px-2 py-0.5 text-[10px] text-muted-foreground">
                    {step.phase}
                  </span>
                )}
                {step.duration_hint_seconds != null && step.duration_hint_seconds > 0 && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary font-medium">
                    {step.duration_hint_seconds}s
                  </span>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function ExerciseExecutionSteps({
  enrichmentData,
  patientDescription,
}: Readonly<ExerciseExecutionStepsProps>) {
  const pre = enrichmentData?.patient_instruction?.pre_exercise;

  const fullSteps = pre?.instruction_steps ?? [];
  const simpleSteps = pre?.instruction_steps_simple ?? [];
  const childSteps = pre?.instruction_steps_child ?? [];
  const technicalSteps = pre?.instruction_steps_technical ?? [];

  const variants: StepVariant[] = [
    { key: 'full', label: 'Pełne', steps: fullSteps },
    { key: 'simple', label: 'Uproszczone', steps: simpleSteps },
    { key: 'child', label: 'Dla dziecka', steps: childSteps },
    { key: 'technical', label: 'Techniczne', steps: technicalSteps },
  ].filter((v) => hasMeaningfulSteps(v.steps));

  const hasAnySteps = variants.length > 0;
  const [activeVariant, setActiveVariant] = useState<string>(variants[0]?.key ?? 'full');

  const activeSteps = variants.find((v) => v.key === activeVariant)?.steps ?? [];

  return (
    <div
      className="rounded-2xl border border-border/40 bg-surface/50 p-4 sm:p-6 space-y-4"
      data-testid="exercise-execution-steps"
    >
      <div className="flex items-center gap-2">
        <ListOrdered className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-base font-semibold text-foreground">Wykonanie krok po kroku</h2>
      </div>

      {hasAnySteps ? (
        <>
          {variants.length > 1 && (
            <div
              className="flex flex-wrap gap-1"
              role="tablist"
              aria-label="Wariant kroków wykonania"
              data-testid="exercise-execution-steps-variant-switcher"
            >
              {variants.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  role="tab"
                  aria-selected={activeVariant === v.key}
                  onClick={() => setActiveVariant(v.key)}
                  className={cn(
                    'rounded-lg px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                    activeVariant === v.key
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-surface-light/60 text-muted-foreground hover:bg-surface-light hover:text-foreground'
                  )}
                  data-testid={`exercise-execution-steps-variant-${v.key}`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          )}
          <StepsList steps={activeSteps} />
        </>
      ) : patientDescription ? (
        <div className="rounded-xl bg-surface-light/30 p-4 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
            Opis ćwiczenia
          </p>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed">
            {patientDescription}
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Brak kroków wykonania dla tego ćwiczenia.</p>
      )}
    </div>
  );
}
