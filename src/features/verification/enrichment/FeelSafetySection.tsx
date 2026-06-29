'use client';

import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ListEditor } from './ListEditor';
import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';

interface FeelSafetySectionProps {
  draft: ExerciseEnrichmentData;
  disabled?: boolean;
  setPath: (path: string, value: unknown) => void;
  persist: () => Promise<void>;
}

export function FeelSafetySection({
  draft,
  disabled = false,
  setPath,
  persist,
}: Readonly<FeelSafetySectionProps>) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 @md/enrich:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Co pacjent powinien czuć</Label>
          <Textarea
            value={draft.feel_description?.should_feel ?? ''}
            disabled={disabled}
            onChange={(event) => setPath('feel_description.should_feel', event.target.value)}
            onBlur={() => void persist()}
            className="min-h-[70px]"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Czego nie powinien czuć</Label>
          <Textarea
            value={draft.feel_description?.should_not_feel ?? ''}
            disabled={disabled}
            onChange={(event) => setPath('feel_description.should_not_feel', event.target.value)}
            onBlur={() => void persist()}
            className="min-h-[70px]"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 @md/enrich:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Bezpieczeństwo - przerwij, gdy...</Label>
          <Textarea
            value={draft.safety?.stop_if ?? ''}
            disabled={disabled}
            onChange={(event) => setPath('safety.stop_if', event.target.value)}
            onBlur={() => void persist()}
            className="min-h-[70px]"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Bezpieczeństwo - intensywność</Label>
          <Textarea
            value={draft.safety?.intensity_guide ?? ''}
            disabled={disabled}
            onChange={(event) => setPath('safety.intensity_guide', event.target.value)}
            onBlur={() => void persist()}
            className="min-h-[70px]"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-md border border-border/50 p-3">
        <Switch
          checked={Boolean(draft.safety?.requires_supervision)}
          disabled={disabled}
          onCheckedChange={(checked) => {
            setPath('safety.requires_supervision', checked);
            void persist();
          }}
        />
        <Label>Nadzór terapeuty wymagany</Label>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Dlaczego to ćwiczenie</Label>
        <Textarea
          value={draft.patient_notes?.why_this_exercise ?? ''}
          disabled={disabled}
          onChange={(event) => setPath('patient_notes.why_this_exercise', event.target.value)}
          onBlur={() => void persist()}
          className="min-h-[70px]"
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Kiedy wykonywać</Label>
        <Textarea
          value={draft.patient_notes?.when_to_do ?? ''}
          disabled={disabled}
          onChange={(event) => setPath('patient_notes.when_to_do', event.target.value)}
          onBlur={() => void persist()}
          className="min-h-[64px]"
        />
      </div>

      <ListEditor
        title="Przypomnienia techniczne"
        items={draft.patient_notes?.technique_reminders ?? []}
        placeholder="np. Nie unoś lędźwi od maty."
        addLabel="Dodaj przypomnienie"
        disabled={disabled}
        onChange={(items) => setPath('patient_notes.technique_reminders', items)}
        onBlur={() => void persist()}
      />
    </div>
  );
}
