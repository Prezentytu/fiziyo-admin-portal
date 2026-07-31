'use client';

import { Volume2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ListEditor } from '@/components/shared/enrichment/ListEditor';
import { cn } from '@/lib/utils';
import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';

const CUES_PATH = 'patient.cues';

interface ExerciseAudioCuesProps {
  audioCue?: string;
  enrichmentData?: ExerciseEnrichmentData | null;
  editable?: boolean;
  disabled?: boolean;
  onAudioCueChange?: (value: string) => void;
  setPath?: (path: string, value: unknown) => void;
  persist?: () => Promise<void>;
  /** When false, hide core TTS audioCue input (scalar lives in parameter form). Default true. */
  showTtsCue?: boolean;
}

function CueRow({ text, index }: { text: string; index: number }) {
  const trimmed = text.trim();
  if (!trimmed) return null;

  return (
    <li className="flex items-start gap-3" data-testid={`exercise-audio-cue-${index}`}>
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <Volume2 className="h-3 w-3 text-primary" />
      </span>
      <p className="flex-1 min-w-0 text-sm text-foreground leading-snug">{trimmed}</p>
    </li>
  );
}

export function ExerciseAudioCues({
  audioCue,
  enrichmentData,
  editable = false,
  disabled = false,
  onAudioCueChange,
  setPath,
  persist,
  showTtsCue = true,
}: Readonly<ExerciseAudioCuesProps>) {
  const cues = enrichmentData?.patient?.cues ?? [];
  const hasAudioCue = Boolean(audioCue?.trim());
  const hasCues = cues.some((cue) => cue.trim());
  const showTtsBlock = showTtsCue && (editable || hasAudioCue);

  return (
    <div
      className="rounded-2xl border border-border/40 bg-surface/50 p-4 sm:p-6 space-y-4"
      data-testid="exercise-audio-cues"
    >
      <div className="flex items-center gap-2">
        <Volume2 className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-base font-semibold text-foreground">Wskazówki głosowe</h2>
        <span className="rounded-full bg-surface-light px-2 py-0.5 text-[10px] text-muted-foreground">
          przed / podczas ćwiczenia
        </span>
      </div>

      {showTtsBlock && (
        <div
          className={cn(
            'rounded-xl p-3',
            hasCues ? 'bg-primary/5 border border-primary/15' : 'bg-surface-light/30'
          )}
          data-testid="exercise-audio-cue-main"
        >
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1.5">
            Komenda TTS
          </p>
          {editable ? (
            <Input
              defaultValue={audioCue ?? ''}
              placeholder="Np. „Wykonaj przysiad, utrzymując prosty kręgosłup”"
              className="h-9 text-sm"
              disabled={disabled}
              onBlur={(event) => {
                const next = event.target.value.trim();
                if (next !== (audioCue ?? '').trim()) {
                  onAudioCueChange?.(next);
                }
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.currentTarget.blur();
                }
              }}
              data-testid="exercise-audio-cue-input"
            />
          ) : (
            <p className="text-sm text-foreground">{audioCue}</p>
          )}
        </div>
      )}

      {editable ? (
        <ListEditor
          title="Wskazówki (cues)"
          items={cues}
          placeholder="Np. „Pilnuj, żeby kolano nie wychodziło za linię palców”"
          addLabel="Dodaj wskazówkę"
          disabled={disabled}
          onChange={(items) => setPath?.(CUES_PATH, items)}
          onBlur={() => void persist?.()}
          testIdPrefix="exercise-audio-cues-editor"
        />
      ) : (
        <>
          {hasCues && (
            <ul className="space-y-3" data-testid="exercise-audio-cues-list">
              {cues.map((text, index) => (
                <CueRow key={`cue-${text}-${index}`} text={text} index={index} />
              ))}
            </ul>
          )}

          {!showTtsBlock && !hasCues && (
            <p className="text-sm text-muted-foreground">Brak wskazówek głosowych dla tego ćwiczenia.</p>
          )}
        </>
      )}
    </div>
  );
}
