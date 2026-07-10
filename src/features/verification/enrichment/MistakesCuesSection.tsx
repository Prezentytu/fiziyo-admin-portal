'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ListEditor } from '@/components/shared/enrichment/ListEditor';
import type { EnrichmentPatientMistakeV3, ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';

interface MistakesCuesSectionProps {
  draft: ExerciseEnrichmentData;
  disabled?: boolean;
  updateDraft: (updater: (current: ExerciseEnrichmentData) => ExerciseEnrichmentData) => void;
  setPath: (path: string, value: unknown) => void;
  persist: () => Promise<void>;
}

export function MistakesCuesSection({
  draft,
  disabled = false,
  updateDraft,
  setPath,
  persist,
}: Readonly<MistakesCuesSectionProps>) {
  const mistakes = draft.patient?.mistakes ?? [];

  const setMistakes = (value: EnrichmentPatientMistakeV3[]) => {
    updateDraft((current) => ({
      ...current,
      patient: {
        ...(current.patient ?? {}),
        mistakes: value,
      },
    }));
  };

  const safeMistakes = mistakes.length > 0 ? mistakes : [{ mistake: '', fix: '' }];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">Typowe błędy</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled}
            onClick={() => setMistakes([...safeMistakes, { mistake: '', fix: '' }])}
            data-testid="enrichment-mistakes-add-btn"
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Dodaj błąd
          </Button>
        </div>
        {safeMistakes.map((item, index) => (
          <div key={`mistake-${index}`} className="space-y-2 rounded-md border border-border/50 p-2">
            <Input
              value={item.mistake ?? ''}
              disabled={disabled}
              placeholder="Błąd"
              onChange={(event) => {
                const next = [...safeMistakes];
                next[index] = { ...next[index], mistake: event.target.value };
                setMistakes(next);
              }}
              onBlur={() => void persist()}
              data-testid={`enrichment-mistake-text-${index}`}
            />
            <div className="flex gap-2">
              <Input
                value={item.fix ?? ''}
                disabled={disabled}
                placeholder="Jak poprawić"
                onChange={(event) => {
                  const next = [...safeMistakes];
                  next[index] = { ...next[index], fix: event.target.value };
                  setMistakes(next);
                }}
                onBlur={() => void persist()}
                data-testid={`enrichment-mistake-fix-${index}`}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={disabled}
                onClick={() => {
                  setMistakes(safeMistakes.filter((_, itemIndex) => itemIndex !== index));
                  void persist();
                }}
                data-testid={`enrichment-mistake-remove-${index}`}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <ListEditor
        title="Wskazówki (cues)"
        items={draft.patient?.cues ?? []}
        placeholder="Np. „Pilnuj, żeby kolano nie wychodziło za linię palców”"
        addLabel="Dodaj wskazówkę"
        disabled={disabled}
        onChange={(items) => setPath('patient.cues', items)}
        onBlur={() => void persist()}
        testIdPrefix="enrichment-cues"
      />
    </div>
  );
}
