'use client';

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ListEditor } from './ListEditor';
import { EXERCISE_CONTENT_LABELS as LABELS } from './enrichmentFieldLabels';
import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';

interface TherapistNotesSectionProps {
  draft: ExerciseEnrichmentData;
  disabled?: boolean;
  setPath: (path: string, value: unknown) => void;
  persist: () => Promise<void>;
}

export function TherapistNotesSection({
  draft,
  disabled = false,
  setPath,
  persist,
}: Readonly<TherapistNotesSectionProps>) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">{LABELS.clinicalNotes}</Label>
        <Textarea
          value={draft.therapist?.clinical_notes ?? ''}
          disabled={disabled}
          onChange={(event) => setPath('therapist.clinical_notes', event.target.value)}
          onBlur={() => void persist()}
          className="min-h-[80px]"
          data-testid="enrichment-clinical-notes-input"
        />
      </div>

      <ListEditor
        title={LABELS.indications}
        items={draft.therapist?.indications ?? []}
        placeholder="Wskazanie"
        addLabel="Dodaj wskazanie"
        disabled={disabled}
        onChange={(items) => setPath('therapist.indications', items)}
        onBlur={() => void persist()}
        testIdPrefix="enrichment-indications"
      />

      <ListEditor
        title={LABELS.contraindications}
        items={draft.therapist?.contraindications ?? []}
        placeholder="Przeciwwskazanie"
        addLabel="Dodaj przeciwwskazanie"
        disabled={disabled}
        onChange={(items) => setPath('therapist.contraindications', items)}
        onBlur={() => void persist()}
        testIdPrefix="enrichment-contraindications"
      />

      <ListEditor
        title={LABELS.rehabPhases}
        items={draft.therapist?.rehab_phases ?? []}
        placeholder="np. wczesna, środkowa, późna"
        addLabel="Dodaj fazę"
        disabled={disabled}
        onChange={(items) => setPath('therapist.rehab_phases', items)}
        onBlur={() => void persist()}
        testIdPrefix="enrichment-rehab-phases"
      />

      <ListEditor
        title={LABELS.clinicalBenefits}
        items={draft.therapist?.clinical_benefits ?? []}
        placeholder="Korzyść terapeutyczna"
        addLabel="Dodaj korzyść"
        disabled={disabled}
        onChange={(items) => setPath('therapist.clinical_benefits', items)}
        onBlur={() => void persist()}
        testIdPrefix="enrichment-clinical-benefits"
      />

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">{LABELS.progressionNotes}</Label>
        <Textarea
          value={draft.therapist?.progression_notes ?? ''}
          disabled={disabled}
          onChange={(event) => setPath('therapist.progression_notes', event.target.value)}
          onBlur={() => void persist()}
          className="min-h-[80px]"
          data-testid="enrichment-progression-notes-input"
        />
      </div>
    </div>
  );
}
