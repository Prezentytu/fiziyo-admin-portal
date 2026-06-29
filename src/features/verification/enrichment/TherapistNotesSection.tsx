'use client';

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ListEditor } from './ListEditor';
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
        <Label className="text-xs text-muted-foreground">Notatki kliniczne</Label>
        <Textarea
          value={draft.therapist_notes?.clinical_notes ?? ''}
          disabled={disabled}
          onChange={(event) => setPath('therapist_notes.clinical_notes', event.target.value)}
          onBlur={() => void persist()}
          className="min-h-[80px]"
        />
      </div>

      <ListEditor
        title="Wskazania kliniczne"
        items={draft.therapist_notes?.clinical_indications ?? []}
        placeholder="Wskazanie kliniczne"
        addLabel="Dodaj wskazanie"
        disabled={disabled}
        onChange={(items) => setPath('therapist_notes.clinical_indications', items)}
        onBlur={() => void persist()}
      />

      <ListEditor
        title="Przeciwwskazania"
        items={draft.therapist_notes?.contraindications ?? []}
        placeholder="Przeciwwskazanie"
        addLabel="Dodaj przeciwwskazanie"
        disabled={disabled}
        onChange={(items) => setPath('therapist_notes.contraindications', items)}
        onBlur={() => void persist()}
      />

      <ListEditor
        title="Faza rehabilitacji"
        items={draft.therapist_notes?.rehab_phase ?? []}
        placeholder="np. wczesna, środkowa, późna"
        addLabel="Dodaj fazę"
        disabled={disabled}
        onChange={(items) => setPath('therapist_notes.rehab_phase', items)}
        onBlur={() => void persist()}
      />

      <ListEditor
        title="Korzyści kliniczne"
        items={draft.therapist_notes?.clinical_benefits ?? []}
        placeholder="Korzyść kliniczna"
        addLabel="Dodaj korzyść"
        disabled={disabled}
        onChange={(items) => setPath('therapist_notes.clinical_benefits', items)}
        onBlur={() => void persist()}
      />

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Notatki o progresji</Label>
        <Textarea
          value={draft.therapist_notes?.progression_notes ?? ''}
          disabled={disabled}
          onChange={(event) => setPath('therapist_notes.progression_notes', event.target.value)}
          onBlur={() => void persist()}
          className="min-h-[80px]"
        />
      </div>
    </div>
  );
}
