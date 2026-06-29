'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { EnrichmentCoachingCue, EnrichmentCommonMistake, ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';

interface MistakesCuesSectionProps {
  draft: ExerciseEnrichmentData;
  disabled?: boolean;
  updateDraft: (updater: (current: ExerciseEnrichmentData) => ExerciseEnrichmentData) => void;
  persist: () => Promise<void>;
}

export function MistakesCuesSection({
  draft,
  disabled = false,
  updateDraft,
  persist,
}: Readonly<MistakesCuesSectionProps>) {
  const mistakes = draft.common_mistakes ?? [];
  const cues = draft.therapist_notes?.coaching_cues ?? [];

  const setMistakes = (value: EnrichmentCommonMistake[]) => {
    updateDraft((current) => ({ ...current, common_mistakes: value }));
  };

  const setCues = (value: EnrichmentCoachingCue[]) => {
    updateDraft((current) => ({
      ...current,
      therapist_notes: {
        ...(current.therapist_notes ?? {}),
        coaching_cues: value,
      },
    }));
  };

  const safeMistakes = mistakes.length > 0 ? mistakes : [{ mistake: '', fix: '' }];
  const safeCues = cues.length > 0 ? cues : [{ text: '', phases: [], priority: 1, repeat: false }];

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
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">Wskazówki werbalne</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled}
            onClick={() => setCues([...safeCues, { text: '', phases: [], priority: 1, repeat: false }])}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Dodaj wskazówkę
          </Button>
        </div>
        {safeCues.map((item, index) => (
          <div
            key={`cue-${index}`}
            className="grid min-w-0 grid-cols-1 gap-2 @md/enrich:grid-cols-[minmax(0,1fr)_140px_90px_90px_auto] @md/enrich:items-start"
          >
            <Input
              value={item.text ?? ''}
              disabled={disabled}
              placeholder="Treść wskazówki"
              className="min-w-0 w-full"
              onChange={(event) => {
                const next = [...safeCues];
                next[index] = { ...next[index], text: event.target.value };
                setCues(next);
              }}
              onBlur={() => void persist()}
            />
            <Input
              value={(item.phases ?? []).join(', ')}
              disabled={disabled}
              placeholder="Fazy: praca, przygotowanie"
              className="w-full @md/enrich:w-[140px]"
              onChange={(event) => {
                const next = [...safeCues];
                next[index] = {
                  ...next[index],
                  phases: event.target.value
                    .split(',')
                    .map((entry) => entry.trim())
                    .filter(Boolean),
                };
                setCues(next);
              }}
              onBlur={() => void persist()}
            />
            <Input
              type="number"
              min={1}
              value={item.priority ?? 1}
              disabled={disabled}
              placeholder="Priorytet"
              className="w-full @md/enrich:w-[90px]"
              onChange={(event) => {
                const next = [...safeCues];
                next[index] = { ...next[index], priority: Number(event.target.value) || 1 };
                setCues(next);
              }}
              onBlur={() => void persist()}
            />
            <Input
              value={item.repeat ? 'TAK' : 'NIE'}
              disabled={disabled}
              placeholder="Powtarzaj"
              className="w-full @md/enrich:w-[90px]"
              onChange={(event) => {
                const next = [...safeCues];
                next[index] = { ...next[index], repeat: event.target.value.trim().toLowerCase() === 'tak' };
                setCues(next);
              }}
              onBlur={() => void persist()}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={disabled}
              className="justify-self-end @md/enrich:justify-self-auto"
              onClick={() => {
                setCues(safeCues.filter((_, itemIndex) => itemIndex !== index));
                void persist();
              }}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
