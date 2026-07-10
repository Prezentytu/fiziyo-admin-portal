'use client';

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ListEditor } from '@/components/shared/enrichment/ListEditor';
import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';

interface PatientInstructionSectionProps {
  draft: ExerciseEnrichmentData;
  disabled?: boolean;
  setPath: (path: string, value: unknown) => void;
  persist: () => Promise<void>;
}

export function PatientInstructionSection({
  draft,
  disabled = false,
  setPath,
  persist,
}: Readonly<PatientInstructionSectionProps>) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Podsumowanie dla pacjenta</Label>
        <Textarea
          value={draft.patient?.summary ?? ''}
          disabled={disabled}
          placeholder="Krótki opis ćwiczenia dla pacjenta"
          onChange={(event) => setPath('patient.summary', event.target.value)}
          onBlur={() => void persist()}
          className="min-h-[70px]"
          data-testid="enrichment-patient-summary-input"
        />
      </div>

      <ListEditor
        title="Kroki wykonania"
        items={draft.patient?.steps ?? []}
        placeholder="Opisz krok wykonania ćwiczenia"
        addLabel="Dodaj krok"
        disabled={disabled}
        onChange={(items) => setPath('patient.steps', items)}
        onBlur={() => void persist()}
        testIdPrefix="enrichment-patient-steps"
      />

      <ListEditor
        title="Potrzebny sprzęt"
        items={draft.equipment ?? []}
        placeholder="np. Mata do ćwiczeń"
        addLabel="Dodaj sprzęt"
        disabled={disabled}
        onChange={(items) => setPath('equipment', items)}
        onBlur={() => void persist()}
        testIdPrefix="enrichment-equipment"
      />
    </div>
  );
}
