'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { EnrichmentFeedbackQuestion, EnrichmentPhase, ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';

interface DuringPostSectionProps {
  draft: ExerciseEnrichmentData;
  disabled?: boolean;
  updateDraft: (updater: (current: ExerciseEnrichmentData) => ExerciseEnrichmentData) => void;
  setPath: (path: string, value: unknown) => void;
  persist: () => Promise<void>;
}

export function DuringPostSection({
  draft,
  disabled = false,
  updateDraft,
  setPath,
  persist,
}: Readonly<DuringPostSectionProps>) {
  const duringPhases = draft.patient_instruction?.during_exercise?.phases ?? [];
  const feedbackQuestions = draft.patient_instruction?.post_exercise?.feedback_questions ?? [];

  const setPhases = (value: EnrichmentPhase[]) => {
    updateDraft((current) => ({
      ...current,
      patient_instruction: {
        ...(current.patient_instruction ?? {}),
        during_exercise: {
          ...(current.patient_instruction?.during_exercise ?? {}),
          phases: value,
        },
      },
    }));
  };

  const setQuestions = (value: EnrichmentFeedbackQuestion[]) => {
    updateDraft((current) => ({
      ...current,
      patient_instruction: {
        ...(current.patient_instruction ?? {}),
        post_exercise: {
          ...(current.patient_instruction?.post_exercise ?? {}),
          feedback_questions: value,
        },
      },
    }));
  };

  const safePhases = duringPhases.length > 0 ? duringPhases : [{ phase_name: '', description: '' }];
  const safeQuestions = feedbackQuestions.length > 0 ? feedbackQuestions : [{ id: '', question: '' }];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">Fazy podczas ćwiczenia</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled}
            onClick={() => setPhases([...safePhases, { phase_name: '', description: '' }])}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Dodaj fazę
          </Button>
        </div>
        {safePhases.map((phase, index) => (
          <div key={`phase-${index}`} className="space-y-2 rounded-md border border-border/50 p-2">
            <Input
              value={phase.phase_name ?? ''}
              disabled={disabled}
              placeholder="Nazwa fazy"
              onChange={(event) => {
                const next = [...safePhases];
                next[index] = { ...next[index], phase_name: event.target.value };
                setPhases(next);
              }}
              onBlur={() => void persist()}
            />
            <div className="flex gap-2">
              <Textarea
                value={phase.description ?? ''}
                disabled={disabled}
                placeholder="Opis fazy"
                onChange={(event) => {
                  const next = [...safePhases];
                  next[index] = { ...next[index], description: event.target.value };
                  setPhases(next);
                }}
                onBlur={() => void persist()}
                className="min-h-[64px]"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={disabled}
                onClick={() => {
                  setPhases(safePhases.filter((_, phaseIndex) => phaseIndex !== index));
                  void persist();
                }}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 @md/enrich:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Komunikat po ćwiczeniu</Label>
          <Textarea
            value={draft.patient_instruction?.post_exercise?.completion_message ?? ''}
            disabled={disabled}
            onChange={(event) =>
              setPath('patient_instruction.post_exercise.completion_message', event.target.value)
            }
            onBlur={() => void persist()}
            className="min-h-[70px]"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Pytanie do notatki pacjenta</Label>
          <Textarea
            value={draft.patient_instruction?.post_exercise?.patient_note_prompt ?? ''}
            disabled={disabled}
            onChange={(event) =>
              setPath('patient_instruction.post_exercise.patient_note_prompt', event.target.value)
            }
            onBlur={() => void persist()}
            className="min-h-[70px]"
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">Pytania po ćwiczeniu</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled}
            onClick={() => setQuestions([...safeQuestions, { id: '', question: '' }])}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Dodaj pytanie
          </Button>
        </div>
        {safeQuestions.map((question, index) => (
          <div key={`question-${index}`} className="flex min-w-0 flex-wrap gap-2">
            <Input
              value={question.id ?? ''}
              disabled={disabled}
              placeholder="ID pytania"
              className="w-[140px] shrink-0"
              onChange={(event) => {
                const next = [...safeQuestions];
                next[index] = { ...next[index], id: event.target.value };
                setQuestions(next);
              }}
              onBlur={() => void persist()}
            />
            <Input
              value={question.question ?? ''}
              disabled={disabled}
              placeholder="Treść pytania"
              className="min-w-0 flex-1"
              onChange={(event) => {
                const next = [...safeQuestions];
                next[index] = { ...next[index], question: event.target.value };
                setQuestions(next);
              }}
              onBlur={() => void persist()}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={disabled}
              onClick={() => {
                setQuestions(safeQuestions.filter((_, questionIndex) => questionIndex !== index));
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
