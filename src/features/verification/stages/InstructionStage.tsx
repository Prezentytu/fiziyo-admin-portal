'use client';

import { Loader2, Sparkles, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { getMediaUrl } from '@/utils/mediaUrl';
import type { ExerciseCoreDraft } from '@/features/exercises/useExerciseEditorForm';
import type { EnrichmentPatientMistakeV3, ExerciseEnrichmentPatientV3 } from '@/graphql/types/exerciseEnrichment.types';
import type { InstructionProposal } from '../utils/instructionProposal';
import {
  CUE_PHASE_OPTIONS,
  cycleStepImage,
  getCuePhase,
  getStepImage,
  removeCuePhaseAt,
  removeStepImageAt,
  setCuePhase,
} from '../utils/stepMedia';
import { MIN_NAME_LENGTH, MIN_PATIENT_DESCRIPTION_LENGTH } from '../utils/verificationStages';
import { LengthHint } from './LengthHint';
import { SegmentedControl } from './SegmentedControl';
import { StageSection } from './StageSection';

interface InstructionStageProps {
  name: string;
  patientDescription: string;
  patient: ExerciseEnrichmentPatientV3;
  imageUrls: string[];
  proposal: InstructionProposal | null;
  isGeneratingProposal: boolean;
  onCoreFieldChange: <K extends keyof ExerciseCoreDraft>(field: K, value: ExerciseCoreDraft[K]) => void;
  onPatientChange: (patient: ExerciseEnrichmentPatientV3) => void;
  onRequestProposal: () => void;
  onInsertProposal: () => void;
  onDismissProposal: () => void;
}

function StepPhotoButton({
  url,
  imageUrls,
  stepNumber,
  onCycle,
}: Readonly<{ url: string | null; imageUrls: string[]; stepNumber: number; onCycle: () => void }>) {
  const photoIndex = url ? imageUrls.indexOf(url) : -1;
  const src = url ? getMediaUrl(url) : null;
  const label = photoIndex >= 0 ? `Zdj. ${photoIndex + 1}` : '+ zdj.';

  return (
    <button
      type="button"
      data-testid={`verification-step-${stepNumber}-photo-btn`}
      onClick={onCycle}
      disabled={imageUrls.length === 0}
      aria-label={
        photoIndex >= 0
          ? `Krok ${stepNumber}: zdjęcie ${photoIndex + 1}. Kliknij, aby wybrać inne.`
          : `Krok ${stepNumber}: przypnij zdjęcie`
      }
      title={imageUrls.length === 0 ? 'Najpierw dodaj zdjęcia w etapie Materiał' : undefined}
      className={cn(
        'relative grid h-11 w-14 shrink-0 place-items-center overflow-hidden rounded-control text-[12px] font-semibold transition-colors disabled:opacity-40',
        src ? 'bg-card text-on-tint' : 'bg-card text-tint hover:bg-tint-muted'
      )}
    >
      {src && (
        // eslint-disable-next-line @next/next/no-img-element -- remote CDN thumbnails, sized by the button
        <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />
      )}
      <span className={cn('relative', src && 'rounded-badge bg-scrim px-1')}>{label}</span>
    </button>
  );
}

function ProposalCard({
  proposal,
  onInsert,
  onDismiss,
}: Readonly<{ proposal: InstructionProposal; onInsert: () => void; onDismiss: () => void }>) {
  return (
    <div
      className="flex flex-col gap-2 rounded-[14px] bg-card p-3 ring-[1.5px] ring-inset ring-tint"
      data-testid="verification-instruction-proposal"
    >
      <p className="flex items-center gap-1.5 text-[13px] font-semibold text-tint">
        <Sparkles className="h-3.5 w-3.5" />
        Propozycja agenta
      </p>
      {proposal.steps && (
        <div>
          <p className="text-[13px] text-label-secondary">Kroki</p>
          <ol className="list-decimal pl-5 text-[15px] text-foreground">
            {proposal.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      )}
      {proposal.cues && (
        <div>
          <p className="text-[13px] text-label-secondary">Wskazówki głosowe</p>
          <ul className="list-disc pl-5 text-[15px] text-foreground">
            {proposal.cues.map((cue) => (
              <li key={cue}>{cue}</li>
            ))}
          </ul>
        </div>
      )}
      {proposal.mistakes && (
        <div>
          <p className="text-[13px] text-label-secondary">Typowe błędy i korekty</p>
          <ul className="flex flex-col gap-0.5 text-[15px] text-foreground">
            {proposal.mistakes.map((entry) => (
              <li key={entry.mistake}>
                {entry.mistake}
                {entry.fix && <span className="text-label-secondary"> → {entry.fix}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant="tinted"
          onClick={onInsert}
          data-testid="verification-proposal-insert-btn"
        >
          Wstaw
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onDismiss}
          data-testid="verification-proposal-dismiss-btn"
        >
          Pomiń
        </Button>
      </div>
    </div>
  );
}

export function InstructionStage({
  name,
  patientDescription,
  patient,
  imageUrls,
  proposal,
  isGeneratingProposal,
  onCoreFieldChange,
  onPatientChange,
  onRequestProposal,
  onInsertProposal,
  onDismissProposal,
}: InstructionStageProps) {
  const steps = patient.steps ?? [];
  const cues = patient.cues ?? [];
  const mistakes = patient.mistakes ?? [];
  const descriptionLength = patientDescription.trim().length;

  const updatePatient = (changes: Partial<ExerciseEnrichmentPatientV3>) => onPatientChange({ ...patient, ...changes });

  const updateStep = (index: number, value: string) =>
    updatePatient({ steps: steps.map((step, stepIndex) => (stepIndex === index ? value : step)) });

  const removeStep = (index: number) =>
    updatePatient({
      steps: steps.filter((_step, stepIndex) => stepIndex !== index),
      step_images: removeStepImageAt(patient.step_images, index),
    });

  const updateCue = (index: number, value: string) =>
    updatePatient({ cues: cues.map((cue, cueIndex) => (cueIndex === index ? value : cue)) });

  const removeCue = (index: number) =>
    updatePatient({
      cues: cues.filter((_cue, cueIndex) => cueIndex !== index),
      cue_phases: removeCuePhaseAt(patient.cue_phases, index),
    });

  const updateMistake = (index: number, changes: EnrichmentPatientMistakeV3) =>
    updatePatient({
      mistakes: mistakes.map((entry, entryIndex) => (entryIndex === index ? { ...entry, ...changes } : entry)),
    });

  return (
    <div className="flex flex-col gap-4" data-testid="verification-stage-instruction">
      <StageSection title="Opis dla pacjenta" required>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="verification-instruction-name" className="text-[13px] text-label-secondary">
            Nazwa ćwiczenia
          </Label>
          <Input
            id="verification-instruction-name"
            value={name}
            aria-invalid={name.trim().length < MIN_NAME_LENGTH || undefined}
            onChange={(event) => onCoreFieldChange('name', event.target.value)}
            data-testid="verification-instruction-name-input"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="verification-instruction-description" className="text-[13px] text-label-secondary">
            Co pacjent przeczyta przed ćwiczeniem
          </Label>
          <Textarea
            id="verification-instruction-description"
            value={patientDescription}
            rows={4}
            onChange={(event) => onCoreFieldChange('patientDescription', event.target.value)}
            aria-describedby="verification-instruction-description-count"
            data-testid="verification-instruction-description-input"
          />
          <LengthHint
            id="verification-instruction-description-count"
            length={descriptionLength}
            min={MIN_PATIENT_DESCRIPTION_LENGTH}
          />
        </div>
      </StageSection>

      <StageSection
        title="Kroki"
        hint="Do każdego kroku przypnij zdjęcie, które go pokazuje. Pacjent zobaczy je obok tekstu."
        data-testid="verification-instruction-steps"
      >
        <ol className="flex flex-col gap-2">
          {steps.map((step, index) => (
            <li key={index} className="flex items-center gap-2">
              <span className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full bg-card text-[13px] font-bold text-label-secondary">
                {index + 1}
              </span>
              <StepPhotoButton
                url={getStepImage(patient.step_images, index)}
                imageUrls={imageUrls}
                stepNumber={index + 1}
                onCycle={() => updatePatient({ step_images: cycleStepImage(patient.step_images, index, imageUrls) })}
              />
              <Input
                value={step}
                aria-label={`Krok ${index + 1}`}
                onChange={(event) => updateStep(index, event.target.value)}
                onBlur={() => {
                  if (!step.trim()) removeStep(index);
                }}
                data-testid={`verification-step-${index + 1}-input`}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Usuń krok ${index + 1}`}
                onClick={() => removeStep(index)}
                data-testid={`verification-step-${index + 1}-remove-btn`}
              >
                <X />
              </Button>
            </li>
          ))}
        </ol>
        <Button
          type="button"
          variant="plain"
          size="sm"
          className="self-start"
          onClick={() => updatePatient({ steps: [...steps, ''] })}
          data-testid="verification-step-add-btn"
        >
          + Dodaj krok
        </Button>
      </StageSection>

      <StageSection
        title="Wskazówki głosowe"
        hint="Lektor czyta je w wybranej fazie."
        data-testid="verification-instruction-cues"
      >
        <ul className="flex flex-col gap-2">
          {cues.map((cue, index) => {
            const phase = getCuePhase(patient.cue_phases, index);
            return (
              <li key={index} className="flex flex-wrap items-center gap-2 rounded-[14px] bg-card p-1.5 pl-1">
                <Input
                  value={cue}
                  aria-label={`Wskazówka ${index + 1}`}
                  onChange={(event) => updateCue(index, event.target.value)}
                  onBlur={() => {
                    if (!cue.trim()) removeCue(index);
                  }}
                  className="h-10 min-w-[200px] flex-1"
                  data-testid={`verification-cue-${index + 1}-input`}
                />
                <SegmentedControl
                  label={`Faza wskazówki ${index + 1}`}
                  options={CUE_PHASE_OPTIONS}
                  value={phase}
                  onChange={(nextPhase) =>
                    updatePatient({ cue_phases: setCuePhase(patient.cue_phases, index, nextPhase) })
                  }
                  testIdPrefix={`verification-cue-${index + 1}-phase`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Usuń wskazówkę ${index + 1}`}
                  onClick={() => removeCue(index)}
                  data-testid={`verification-cue-${index + 1}-remove-btn`}
                >
                  <X />
                </Button>
              </li>
            );
          })}
        </ul>
        <Button
          type="button"
          variant="plain"
          size="sm"
          className="self-start"
          onClick={() => updatePatient({ cues: [...cues, ''] })}
          data-testid="verification-cue-add-btn"
        >
          + Dodaj wskazówkę
        </Button>
      </StageSection>

      <StageSection title="Typowe błędy i korekty" data-testid="verification-instruction-mistakes">
        {proposal ? (
          <ProposalCard proposal={proposal} onInsert={onInsertProposal} onDismiss={onDismissProposal} />
        ) : (
          <Button
            type="button"
            variant="tinted"
            size="sm"
            className="self-start"
            onClick={onRequestProposal}
            disabled={isGeneratingProposal || name.trim().length < MIN_NAME_LENGTH}
            data-testid="verification-proposal-request-btn"
          >
            {isGeneratingProposal ? <Loader2 className="animate-spin" /> : <Sparkles />}
            {isGeneratingProposal ? 'Agent przygotowuje propozycję…' : 'Poproś agenta o propozycję'}
          </Button>
        )}
        <ul className="flex flex-col gap-2">
          {mistakes.map((entry, index) => (
            <li key={index} className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[1fr_auto_1fr_auto]">
              <Input
                value={entry.mistake ?? ''}
                aria-label={`Błąd ${index + 1}`}
                placeholder="Błąd"
                onChange={(event) => updateMistake(index, { mistake: event.target.value })}
                data-testid={`verification-mistake-${index + 1}-input`}
              />
              <span aria-hidden="true" className="hidden text-label-tertiary sm:inline">
                →
              </span>
              <Input
                value={entry.fix ?? ''}
                aria-label={`Korekta ${index + 1}`}
                placeholder="Korekta"
                onChange={(event) => updateMistake(index, { fix: event.target.value })}
                data-testid={`verification-mistake-${index + 1}-fix-input`}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Usuń błąd ${index + 1}`}
                onClick={() =>
                  updatePatient({ mistakes: mistakes.filter((_entry, entryIndex) => entryIndex !== index) })
                }
                data-testid={`verification-mistake-${index + 1}-remove-btn`}
              >
                <X />
              </Button>
            </li>
          ))}
        </ul>
        <Button
          type="button"
          variant="plain"
          size="sm"
          className="self-start"
          onClick={() => updatePatient({ mistakes: [...mistakes, { mistake: '', fix: '' }] })}
          data-testid="verification-mistake-add-btn"
        >
          + Dodaj błąd
        </Button>
      </StageSection>
    </div>
  );
}
