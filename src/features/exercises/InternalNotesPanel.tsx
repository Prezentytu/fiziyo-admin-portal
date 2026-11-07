'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Loader2, Lock } from 'lucide-react';

import { Textarea } from '@/components/ui/textarea';
import { useSystemRole } from '@/hooks/useSystemRole';
import { cn } from '@/lib/utils';
import { GET_EXERCISE_INTERNAL_NOTES_QUERY } from '@/graphql/queries/adminExercises.queries';
import { UPDATE_EXERCISE_INTERNAL_NOTES_MUTATION } from '@/graphql/mutations/adminExercises.mutations';
import type {
  ExerciseInternalNotesResponse,
  UpdateExerciseInternalNotesResponse,
} from '@/graphql/types/adminExercise.types';
import { INTERNAL_NOTES_MAX_LENGTH, normalizeInternalNotes, shouldSaveInternalNotes } from './utils/internalNotes';

interface InternalNotesPanelProps {
  exerciseId: string;
  className?: string;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

/**
 * FiziYo team working notes. Same component in the exercise detail and in verification.
 * Visibility mirrors the backend (ContentManager, SiteSuperAdmin); the API returns null to anyone else.
 */
export function InternalNotesPanel({ exerciseId, className }: Readonly<InternalNotesPanelProps>) {
  const { canReviewExercises } = useSystemRole();
  const { data, loading } = useQuery<ExerciseInternalNotesResponse>(GET_EXERCISE_INTERNAL_NOTES_QUERY, {
    variables: { id: exerciseId },
    skip: !canReviewExercises || !exerciseId,
  });

  if (!canReviewExercises) return null;

  return (
    <section
      className={cn(
        'flex flex-col gap-3 rounded-2xl border border-dashed border-status-warning/40 bg-status-warning-muted/40 p-4',
        className
      )}
      aria-labelledby="internal-notes-title"
      data-testid="exercise-internal-notes-section"
    >
      <header className="flex flex-col gap-1">
        <h3 id="internal-notes-title" className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
          <Lock className="h-4 w-4 text-status-warning" aria-hidden />
          Notatki robocze (tylko FiziYo)
        </h3>
        <p className="text-[13px] leading-[18px] text-label-secondary">
          Widzi tylko zespół FiziYo. Fizjoterapeuci i pacjenci tych notatek nie dostają.
        </p>
      </header>
      {loading && !data ? (
        <div className="flex items-center gap-2 text-[13px] text-label-secondary" role="status">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Wczytywanie…
        </div>
      ) : (
        <InternalNotesEditor
          key={exerciseId}
          exerciseId={exerciseId}
          savedValue={data?.exerciseByIdForAdmin?.internalNotes ?? null}
        />
      )}
    </section>
  );
}

function InternalNotesEditor({
  exerciseId,
  savedValue,
}: Readonly<{ exerciseId: string; savedValue: string | null }>) {
  const [draft, setDraft] = useState(savedValue ?? '');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [updateNotes] = useMutation<UpdateExerciseInternalNotesResponse>(UPDATE_EXERCISE_INTERNAL_NOTES_MUTATION);

  const isTooLong = draft.length > INTERNAL_NOTES_MAX_LENGTH;

  const save = async () => {
    if (!shouldSaveInternalNotes(savedValue, draft)) return;
    setSaveState('saving');
    try {
      const result = await updateNotes({
        variables: { exerciseId, value: normalizeInternalNotes(draft) },
      });
      setSaveState(result.data?.updateExerciseField ? 'saved' : 'error');
    } catch {
      setSaveState('error');
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        data-testid="exercise-internal-notes-input"
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
          setSaveState('idle');
        }}
        onBlur={() => void save()}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            void save();
          }
        }}
        placeholder="Źródło ruchu, czym jest film, duplikaty, wątpliwości do sprawdzenia"
        aria-label="Notatki robocze (tylko FiziYo)"
        aria-invalid={isTooLong}
        rows={4}
      />
      <div className="flex items-center justify-between gap-3 text-[12px] text-label-secondary">
        <span role="status" data-testid="exercise-internal-notes-status">
          {saveState === 'saving' && 'Zapisywanie…'}
          {saveState === 'saved' && 'Zapisano'}
          {saveState === 'error' && <span className="font-semibold text-status-danger">Nie zapisano notatek</span>}
          {saveState === 'idle' && 'Zapis po wyjściu z pola'}
        </span>
        <span className={cn(isTooLong && 'font-semibold text-status-danger')}>
          {draft.length}/{INTERNAL_NOTES_MAX_LENGTH}
        </span>
      </div>
    </div>
  );
}
