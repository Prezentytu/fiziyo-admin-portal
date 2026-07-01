'use client';

import { ListOrdered } from 'lucide-react';
import { ListEditor } from '@/components/shared/enrichment/ListEditor';
import type { EnrichmentInstructionStep, ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';

interface ExerciseExecutionStepsProps {
  enrichmentData?: ExerciseEnrichmentData | null;
  patientDescription?: string;
  editable?: boolean;
  setPath?: (path: string, value: unknown) => void;
  persist?: () => Promise<void>;
}

const STEPS_PATH = 'patient_instruction.pre_exercise.instruction_steps';

type PreExercise = NonNullable<ExerciseEnrichmentData['patient_instruction']>['pre_exercise'];

function pickEffectiveSteps(pre?: PreExercise): EnrichmentInstructionStep[] {
  if (!pre) return [];
  const candidates = [
    pre.instruction_steps,
    pre.instruction_steps_simple,
    pre.instruction_steps_child,
    pre.instruction_steps_technical,
  ];
  return candidates.find((steps) => steps && steps.length > 0 && steps.some((step) => step.text?.trim())) ?? [];
}

export function ExerciseExecutionSteps({
  enrichmentData,
  patientDescription,
  editable = false,
  setPath,
  persist,
}: Readonly<ExerciseExecutionStepsProps>) {
  const pre = enrichmentData?.patient_instruction?.pre_exercise;
  const stepTexts = pickEffectiveSteps(pre).map((step) => step.text ?? '');
  const hasSteps = stepTexts.some((text) => text.trim());

  const commitSteps = (texts: string[]) => {
    const steps: EnrichmentInstructionStep[] = texts.map((text, index) => ({ step: index + 1, text }));
    setPath?.(STEPS_PATH, steps);
  };

  return (
    <div
      className="rounded-2xl border border-border/40 bg-surface/50 p-4 sm:p-6 space-y-4"
      data-testid="exercise-execution-steps"
    >
      <div className="flex items-center gap-2">
        <ListOrdered className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-base font-semibold text-foreground">Wykonanie krok po kroku</h2>
      </div>

      {editable ? (
        <ListEditor
          title=""
          items={stepTexts}
          placeholder="Opisz krok wykonania ćwiczenia"
          addLabel="Dodaj krok"
          onChange={commitSteps}
          onBlur={() => void persist?.()}
          testIdPrefix="exercise-execution-steps-editor"
        />
      ) : hasSteps ? (
        <ol className="space-y-3" data-testid="exercise-execution-steps-list">
          {stepTexts.map((text, index) => (
            <li key={`step-${index}-${text}`} className="flex gap-3" data-testid={`exercise-execution-step-${index + 1}`}>
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary mt-0.5">
                {index + 1}
              </span>
              <p className="flex-1 min-w-0 text-sm text-foreground leading-snug">{text || 'Brak opisu kroku'}</p>
            </li>
          ))}
        </ol>
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
