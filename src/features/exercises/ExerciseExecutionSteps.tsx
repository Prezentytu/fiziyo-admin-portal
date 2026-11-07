'use client';

import { ListOrdered } from 'lucide-react';
import { ListEditor } from '@/components/shared/enrichment/ListEditor';
import { PlayerHintLengthCounter } from '@/components/shared/enrichment/PlayerHintLengthCounter';
import { getStepImage } from '@/features/verification/utils/stepMedia';
import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';
import { getMediaUrl } from '@/utils/mediaUrl';

interface ExerciseExecutionStepsProps {
  enrichmentData?: ExerciseEnrichmentData | null;
  editable?: boolean;
  disabled?: boolean;
  setPath?: (path: string, value: unknown) => void;
  persist?: () => Promise<void>;
}

const STEPS_PATH = 'patient.steps';

export function ExerciseExecutionSteps({
  enrichmentData,
  editable = false,
  disabled = false,
  setPath,
  persist,
}: Readonly<ExerciseExecutionStepsProps>) {
  const stepTexts = enrichmentData?.patient?.steps ?? [];
  const hasSteps = stepTexts.some((text) => text.trim());

  const commitSteps = (texts: string[]) => {
    setPath?.(STEPS_PATH, texts);
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
          disabled={disabled}
          onChange={commitSteps}
          onBlur={() => void persist?.()}
          testIdPrefix="exercise-execution-steps-editor"
          renderItemFooter={(text, index) => (
            <PlayerHintLengthCounter text={text} testId={`exercise-execution-steps-editor-length-${index}`} />
          )}
        />
      ) : hasSteps ? (
        <ol className="space-y-3" data-testid="exercise-execution-steps-list">
          {stepTexts.map((text, index) => {
            const imageUrl = getMediaUrl(getStepImage(enrichmentData?.patient?.step_images, index));
            return (
              <li
                key={`step-${index}-${text}`}
                className="flex gap-3"
                data-testid={`exercise-execution-step-${index + 1}`}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary mt-0.5">
                  {index + 1}
                </span>
                <p className="flex-1 min-w-0 text-sm text-foreground leading-snug">{text || 'Brak opisu kroku'}</p>
                {imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element -- remote CDN image
                  <img
                    src={imageUrl}
                    alt={`Zdjęcie do kroku ${index + 1}`}
                    className="h-16 w-16 shrink-0 rounded-lg border border-border/40 object-cover"
                    data-testid={`exercise-execution-step-${index + 1}-image`}
                  />
                )}
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="text-sm text-muted-foreground">Brak kroków wykonania dla tego ćwiczenia.</p>
      )}
    </div>
  );
}
