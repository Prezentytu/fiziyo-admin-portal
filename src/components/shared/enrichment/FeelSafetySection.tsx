'use client';

import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
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
            value={draft.patient?.should_feel ?? ''}
            disabled={disabled}
            onChange={(event) => setPath('patient.should_feel', event.target.value)}
            onBlur={() => void persist()}
            className="min-h-[70px]"
            data-testid="enrichment-should-feel-input"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Czego nie powinien czuć</Label>
          <Textarea
            value={draft.patient?.should_not_feel ?? ''}
            disabled={disabled}
            onChange={(event) => setPath('patient.should_not_feel', event.target.value)}
            onBlur={() => void persist()}
            className="min-h-[70px]"
            data-testid="enrichment-should-not-feel-input"
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Bezpieczeństwo — przerwij, gdy...</Label>
        <Textarea
          value={draft.safety?.stop_if ?? ''}
          disabled={disabled}
          onChange={(event) => setPath('safety.stop_if', event.target.value)}
          onBlur={() => void persist()}
          className="min-h-[70px]"
          data-testid="enrichment-stop-if-input"
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Wskazówki dot. intensywności</Label>
        <Textarea
          value={draft.safety?.intensity_guide ?? ''}
          disabled={disabled}
          onChange={(event) => setPath('safety.intensity_guide', event.target.value)}
          onBlur={() => void persist()}
          className="min-h-[70px]"
          data-testid="enrichment-intensity-guide-input"
        />
      </div>

      <div className="flex items-center gap-3 rounded-md border border-border/50 p-3">
        <Switch
          checked={Boolean(draft.safety?.requires_supervision)}
          disabled={disabled}
          onCheckedChange={(checked) => {
            setPath('safety.requires_supervision', checked);
            void persist();
          }}
          data-testid="enrichment-requires-supervision-switch"
        />
        <Label>Nadzór terapeuty wymagany</Label>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Dlaczego to ćwiczenie</Label>
        <Textarea
          value={draft.patient?.why ?? ''}
          disabled={disabled}
          onChange={(event) => setPath('patient.why', event.target.value)}
          onBlur={() => void persist()}
          className="min-h-[70px]"
          data-testid="enrichment-why-input"
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Kiedy wykonywać</Label>
        <Textarea
          value={draft.patient?.when_to_do ?? ''}
          disabled={disabled}
          onChange={(event) => setPath('patient.when_to_do', event.target.value)}
          onBlur={() => void persist()}
          className="min-h-[64px]"
          data-testid="enrichment-when-to-do-input"
        />
      </div>
    </div>
  );
}
