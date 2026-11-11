'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';
import { readContraindicationTextsV33, writeContraindicationsV33 } from '../utils/contentV33';
import type { VerificationFact } from '../utils/verificationFacts';
import { MIN_THERAPIST_DESCRIPTION_LENGTH } from '../utils/verificationStages';
import { ChipListEditor } from './ChipListEditor';
import { ContractFacts } from './ContractFacts';
import { LengthHint } from './LengthHint';
import { StageSection } from './StageSection';

interface SafetyStageProps {
  enrichment: ExerciseEnrichmentData;
  therapistDescription: string;
  onTherapistDescriptionChange: (value: string) => void;
  onEnrichmentPathChange: (path: string, value: unknown) => void;
  /** Set for a record in contract v3.3: contract places replace the retired `therapist.*` lists and description. */
  v33?: { safetyFacts: VerificationFact[]; therapistFacts: VerificationFact[] };
}

export function SafetyStage({
  enrichment,
  therapistDescription,
  onTherapistDescriptionChange,
  onEnrichmentPathChange,
  v33,
}: SafetyStageProps) {
  const stopIf = enrichment.safety?.stop_if ?? '';
  const indications = enrichment.therapist?.indications ?? [];
  const contraindications = v33
    ? readContraindicationTextsV33(enrichment)
    : (enrichment.therapist?.contraindications ?? []);
  const requiresSupervision = enrichment.safety?.requires_supervision === true;
  const descriptionLength = therapistDescription.trim().length;

  return (
    <div className="flex flex-col gap-4" data-testid="verification-stage-safety">
      <StageSection title="Przerwij, gdy…" required={!v33} data-testid="verification-safety-stop-if">
        <Textarea
          value={stopIf}
          rows={4}
          aria-label="Objawy przerwania"
          placeholder={'Każdy objaw w osobnej linii, np.\n- ostry ból kolana\n- zawroty głowy'}
          className="field-sizing-content"
          onChange={(event) => onEnrichmentPathChange('safety.stop_if', event.target.value)}
          data-testid="verification-safety-stop-if-input"
        />
        <p className="text-[13px] text-label-secondary">
          Pacjent widzi ten tekst tak, jak go zapiszesz, razem z nagłówkami grup i pustymi liniami.
        </p>
      </StageSection>

      <StageSection title="Przeciwwskazania" data-testid="verification-safety-contraindications-section">
        <ChipListEditor
          items={contraindications}
          onChange={(items) =>
            v33
              ? onEnrichmentPathChange('safety.contraindications', writeContraindicationsV33(enrichment, items))
              : onEnrichmentPathChange('therapist.contraindications', items)
          }
          addLabel="Dodaj"
          inputLabel="Nowe przeciwwskazanie"
          testIdPrefix="verification-safety-contraindications"
          multiline={Boolean(v33)}
        />
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

      {v33 ? (
        <>
          <ContractFacts
            title="Reguła bólu i flagi"
            facts={v33.safetyFacts}
            hint="Tylko do odczytu. Kody ze słownika; te pola zmienisz w formularzu ćwiczenia."
            data-testid="verification-safety-facts"
          />
          <ContractFacts
            title="Dla fizjoterapeuty"
            facts={v33.therapistFacts}
            hint="Pacjent tego nie widzi. Tylko do odczytu; wskazania to kody ze słownika. Te pola zmienisz w formularzu ćwiczenia."
            data-testid="verification-safety-therapist-facts"
          />
        </>
      ) : (
        <StageSection title="Dla fizjoterapeuty" hint="Pacjent tego nie widzi.">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="verification-safety-therapist-description" className="text-[13px] text-label-secondary">
              Opis dla fizjoterapeuty
            </Label>
            <Textarea
              id="verification-safety-therapist-description"
              value={therapistDescription}
              rows={3}
              className="field-sizing-content"
              onChange={(event) => onTherapistDescriptionChange(event.target.value)}
              aria-describedby="verification-safety-therapist-description-count"
              data-testid="verification-safety-therapist-description-input"
            />
            <LengthHint
              id="verification-safety-therapist-description-count"
              length={descriptionLength}
              min={MIN_THERAPIST_DESCRIPTION_LENGTH}
              shortPrefix="Wymagane: "
            />
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
        </StageSection>
      )}
    </div>
  );
}
