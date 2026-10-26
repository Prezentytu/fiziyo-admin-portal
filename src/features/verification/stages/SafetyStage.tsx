'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';
import { MIN_THERAPIST_DESCRIPTION_LENGTH, parseStopIf, serializeStopIf } from '../utils/verificationStages';
import { ChipListEditor } from './ChipListEditor';
import { StageSection } from './StageSection';

interface SafetyStageProps {
  enrichment: ExerciseEnrichmentData;
  therapistDescription: string;
  onTherapistDescriptionChange: (value: string) => void;
  onEnrichmentPathChange: (path: string, value: unknown) => void;
}

export function SafetyStage({
  enrichment,
  therapistDescription,
  onTherapistDescriptionChange,
  onEnrichmentPathChange,
}: SafetyStageProps) {
  const stopIf = parseStopIf(enrichment.safety?.stop_if);
  const indications = enrichment.therapist?.indications ?? [];
  const contraindications = enrichment.therapist?.contraindications ?? [];
  const requiresSupervision = enrichment.safety?.requires_supervision === true;
  const descriptionLength = therapistDescription.trim().length;

  return (
    <div className="flex flex-col gap-4" data-testid="verification-stage-safety">
      <StageSection
        title="Przerwij, gdy…"
        hint="Pacjent zobaczy te objawy przed ćwiczeniem i w trakcie."
        required
        data-testid="verification-safety-stop-if"
      >
        <ChipListEditor
          items={stopIf}
          onChange={(items) => onEnrichmentPathChange('safety.stop_if', serializeStopIf(items))}
          addLabel="Dodaj objaw"
          inputLabel="Nowy objaw przerwania"
          placeholder="np. ostry ból kolana"
          testIdPrefix="verification-safety-stop-if"
        />
      </StageSection>

      <StageSection
        title="Dla fizjoterapeuty"
        hint="Widzą to tylko fizjoterapeuci, którzy dobierają ćwiczenie do planu."
      >
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <Label htmlFor="verification-safety-therapist-description" className="text-[13px] text-label-secondary">
              Opis dla fizjoterapeuty
            </Label>
          </div>
          <Textarea
            id="verification-safety-therapist-description"
            value={therapistDescription}
            rows={3}
            onChange={(event) => onTherapistDescriptionChange(event.target.value)}
            aria-describedby="verification-safety-therapist-description-count"
            data-testid="verification-safety-therapist-description-input"
          />
          <p
            id="verification-safety-therapist-description-count"
            className={cn(
              'text-[12px]',
              descriptionLength < MIN_THERAPIST_DESCRIPTION_LENGTH ? 'text-status-warning' : 'text-label-secondary'
            )}
          >
            {descriptionLength < MIN_THERAPIST_DESCRIPTION_LENGTH
              ? `Wymagane: ${descriptionLength} z co najmniej ${MIN_THERAPIST_DESCRIPTION_LENGTH} znaków`
              : `${descriptionLength} znaków`}
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <p className="text-[13px] text-label-secondary">Wskazania</p>
          <ChipListEditor
            items={indications}
            onChange={(items) => onEnrichmentPathChange('therapist.indications', items)}
            addLabel="Dodaj"
            inputLabel="Nowe wskazanie"
            testIdPrefix="verification-safety-indications"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <p className="text-[13px] text-label-secondary">Przeciwwskazania</p>
          <ChipListEditor
            items={contraindications}
            onChange={(items) => onEnrichmentPathChange('therapist.contraindications', items)}
            addLabel="Dodaj"
            inputLabel="Nowe przeciwwskazanie"
            testIdPrefix="verification-safety-contraindications"
          />
        </div>
        <div className="flex items-center gap-3 border-t-[0.5px] border-separator pt-3">
          <Checkbox
            id="verification-safety-supervision"
            checked={requiresSupervision}
            onCheckedChange={(checked) => onEnrichmentPathChange('safety.requires_supervision', checked === true)}
            data-testid="verification-safety-supervision-checkbox"
          />
          <Label htmlFor="verification-safety-supervision" className="text-[15px] font-normal text-foreground">
            Tylko pod nadzorem fizjoterapeuty, nie do ćwiczeń w domu
          </Label>
        </div>
      </StageSection>
    </div>
  );
}
