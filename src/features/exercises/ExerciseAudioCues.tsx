'use client';

import { Volume2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ListEditor } from '@/components/shared/enrichment/ListEditor';
import { cn } from '@/lib/utils';
import type { EnrichmentCoachingCue, ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';

const COACHING_CUES_PATH = 'therapist_notes.coaching_cues';

interface ExerciseAudioCuesProps {
  audioCue?: string;
  enrichmentData?: ExerciseEnrichmentData | null;
  editable?: boolean;
  onAudioCueChange?: (value: string) => void;
  setPath?: (path: string, value: unknown) => void;
  persist?: () => Promise<void>;
}

function PhaseBadge({ phase }: { phase: string }) {
  return (
    <span className="rounded-full bg-surface-light px-2 py-0.5 text-[10px] text-muted-foreground">
      {phase}
    </span>
  );
}

function CueRow({ cue, index }: { cue: EnrichmentCoachingCue; index: number }) {
  const text = cue.text?.trim();
  if (!text) return null;

  const phases = cue.phases?.filter(Boolean) ?? [];

  return (
    <li
      className="flex items-start gap-3"
      data-testid={`exercise-audio-cue-${index}`}
    >
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <Volume2 className="h-3 w-3 text-primary" />
      </span>
      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-sm text-foreground leading-snug">{text}</p>
        <div className="flex flex-wrap gap-1.5">
          {phases.map((phase) => (
            <PhaseBadge key={phase} phase={phase} />
          ))}
          {cue.repeat && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary font-medium">
              powtarzaj
            </span>
          )}
          {cue.priority != null && cue.priority <= 1 && (
            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-600 font-medium">
              ważne
            </span>
          )}
        </div>
      </div>
    </li>
  );
}

export function ExerciseAudioCues({
  audioCue,
  enrichmentData,
  editable = false,
  onAudioCueChange,
  setPath,
  persist,
}: Readonly<ExerciseAudioCuesProps>) {
  const coachingCues = enrichmentData?.therapist_notes?.coaching_cues ?? [];
  const cueTexts = coachingCues.map((cue) => cue.text ?? '');
  const hasAudioCue = Boolean(audioCue?.trim());
  const hasCues = coachingCues.some((c) => c.text?.trim());
  const showTtsBlock = editable || hasAudioCue;

  const commitCues = (texts: string[]) => {
    const cues: EnrichmentCoachingCue[] = texts.map((text) => ({ text }));
    setPath?.(COACHING_CUES_PATH, cues);
  };

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
          title="Wskazówki AI (coaching cues)"
          items={cueTexts}
          placeholder="Np. „Pilnuj, żeby kolano nie wychodziło za linię palców”"
          addLabel="Dodaj wskazówkę"
          onChange={commitCues}
          onBlur={() => void persist?.()}
          testIdPrefix="exercise-audio-cues-editor"
        />
      ) : (
        <>
          {hasCues && (
            <ul className="space-y-3" data-testid="exercise-audio-cues-list">
              {coachingCues.map((cue, index) => (
                <CueRow key={`cue-${cue.text ?? ''}-${index}`} cue={cue} index={index} />
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
