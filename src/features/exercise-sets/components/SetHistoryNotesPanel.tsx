'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Archive, ChevronDown, History, Loader2, Lock, MessageSquareText, Pencil, Plus, Send, Sparkles, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { cn } from '@/lib/utils';
import { useSystemRole } from '@/hooks/useSystemRole';
import { GET_EXERCISE_SET_LOG_QUERY } from '@/graphql/queries/exerciseSetLog.queries';
import {
  ADD_EXERCISE_SET_NOTE_MUTATION,
  DELETE_EXERCISE_SET_NOTE_MUTATION,
  UPDATE_EXERCISE_SET_NOTE_MUTATION,
} from '@/graphql/mutations/exerciseSetLog.mutations';
import type {
  AddExerciseSetNoteResponse,
  DeleteExerciseSetNoteResponse,
  ExerciseSetLogEntry,
  ExerciseSetLogVisibility,
  GetExerciseSetLogResponse,
  UpdateExerciseSetNoteResponse,
} from '@/graphql/types/exerciseSetLog.types';

import {
  SET_LOG_VISIBILITY_LABELS,
  SET_NOTE_MAX_LENGTH,
  allowedSetNoteVisibilities,
  describeSetContentChange,
  formatSetLogTime,
  setLogAuthorLabel,
  sortSetLogNewestFirst,
} from '../utils/setLog';

interface SetHistoryNotesPanelProps {
  exerciseSetId: string;
  isGlobalTemplate: boolean;
  /** exerciseId → nazwa w zestawie; szczegóły zmian pokazują ćwiczenia po nazwie. */
  exerciseNames: ReadonlyMap<string, string>;
}

const EVENT_ICONS = {
  CREATED: Sparkles,
  CONTENT_CHANGED: Pencil,
  PUBLISHED: Send,
  ARCHIVED: Archive,
} as const;

function readableError(error: unknown, fallback: string): string {
  // Backend chowa treść wyjątków za ogólnym komunikatem; czytelne są tylko nasze komunikaty walidacji.
  if (error instanceof Error && error.message && !error.message.includes('Unexpected Execution Error')) {
    return error.message;
  }
  return fallback;
}

function VisibilityPicker({
  value,
  options,
  onChange,
  testId,
  disabled,
}: Readonly<{
  value: ExerciseSetLogVisibility;
  options: readonly ExerciseSetLogVisibility[];
  onChange: (value: ExerciseSetLogVisibility) => void;
  testId: string;
  disabled?: boolean;
}>) {
  return (
    <SegmentedControl
      value={value}
      options={options.map((option) => ({ value: option, label: SET_LOG_VISIBILITY_LABELS[option] }))}
      onChange={onChange}
      label="Kto widzi notatkę"
      testId={testId}
      disabled={disabled}
    />
  );
}

function EventRow({
  entry,
  exerciseNames,
}: Readonly<{ entry: ExerciseSetLogEntry; exerciseNames: ReadonlyMap<string, string> }>) {
  const [expanded, setExpanded] = useState(false);
  const Icon = entry.kind === 'NOTE' ? MessageSquareText : EVENT_ICONS[entry.kind];
  const details = entry.kind === 'CONTENT_CHANGED' ? describeSetContentChange(entry.data, exerciseNames) : [];

  return (
    <li className="flex gap-2.5" data-testid={`set-log-entry-${entry.id}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-label-secondary" aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-[14px] leading-[19px] text-foreground">{entry.body}</p>
        <p className="text-[12px] leading-4 text-label-secondary">
          {setLogAuthorLabel(entry)} · {formatSetLogTime(entry.createdAt)}
          {entry.updatedAt && entry.kind === 'CONTENT_CHANGED' && ` – ${formatSetLogTime(entry.updatedAt)}`}
        </p>
        {details.length > 0 && (
          <>
            <button
              type="button"
              className="inline-flex w-fit items-center gap-1 text-[12px] font-medium text-tint hover:text-foreground"
              aria-expanded={expanded}
              onClick={() => setExpanded((value) => !value)}
              data-testid={`set-log-entry-${entry.id}-details-btn`}
            >
              Szczegóły
              <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-180')} aria-hidden />
            </button>
            {expanded && (
              <ul className="flex flex-col gap-0.5 text-[13px] leading-[18px] text-label-secondary">
                {details.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </li>
  );
}

function NoteRow({
  entry,
  visibilityOptions,
  onSave,
  onDelete,
  saving,
}: Readonly<{
  entry: ExerciseSetLogEntry;
  visibilityOptions: readonly ExerciseSetLogVisibility[];
  onSave: (body: string, visibility: ExerciseSetLogVisibility) => Promise<boolean>;
  onDelete: () => void;
  saving: boolean;
}>) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(entry.body);
  const [visibility, setVisibility] = useState(entry.visibility);
  const options = visibilityOptions.includes(entry.visibility) ? visibilityOptions : [entry.visibility, ...visibilityOptions];
  const trimmed = draft.trim();
  const isTooLong = trimmed.length > SET_NOTE_MAX_LENGTH;

  const startEdit = () => {
    setDraft(entry.body);
    setVisibility(entry.visibility);
    setIsEditing(true);
  };

  return (
    <li className="flex gap-2.5" data-testid={`set-log-entry-${entry.id}`}>
      <MessageSquareText className="mt-2 h-4 w-4 shrink-0 text-label-secondary" aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="flex flex-wrap items-center gap-x-1.5 text-[12px] leading-4 text-label-secondary">
          <span>{setLogAuthorLabel(entry)}</span>
          <span>· {formatSetLogTime(entry.createdAt)}</span>
          {entry.updatedAt && <span>· edytowano</span>}
          <span
            className="inline-flex items-center gap-1 rounded-badge bg-tint-muted px-1.5 font-medium text-tint"
            data-testid={`set-log-entry-${entry.id}-visibility`}
          >
            {entry.visibility === 'PRIVATE' && <Lock className="h-3 w-3" aria-hidden />}
            {SET_LOG_VISIBILITY_LABELS[entry.visibility]}
          </span>
        </p>
        {isEditing ? (
          <div className="flex flex-col gap-2">
            <Textarea
              value={draft}
              rows={3}
              className="text-[14px]"
              aria-label="Treść notatki"
              aria-invalid={isTooLong}
              onChange={(event) => setDraft(event.target.value)}
              data-testid={`set-log-entry-${entry.id}-edit-input`}
            />
            <div className="flex flex-wrap items-center gap-2">
              <VisibilityPicker
                value={visibility}
                options={options}
                onChange={setVisibility}
                testId={`set-log-entry-${entry.id}-edit-visibility`}
              />
              <span className="flex-1" />
              <Button type="button" variant="plain" size="sm" onClick={() => setIsEditing(false)}>
                Anuluj
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={!trimmed || isTooLong || saving}
                onClick={async () => {
                  if (await onSave(trimmed, visibility)) setIsEditing(false);
                }}
                data-testid={`set-log-entry-${entry.id}-save-btn`}
              >
                {saving && <Loader2 className="animate-spin" />}
                Zapisz
              </Button>
            </div>
          </div>
        ) : (
          <div className="group flex items-start gap-1">
            <p className="flex-1 whitespace-pre-wrap break-words rounded-[10px] bg-grouped-tertiary px-2.5 py-1.5 text-[14px] leading-[19px] text-foreground">
              {entry.body}
            </p>
            {entry.isMine && (
              <span className="flex shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label="Edytuj notatkę"
                  title="Edytuj notatkę"
                  onClick={startEdit}
                  data-testid={`set-log-entry-${entry.id}-edit-btn`}
                >
                  <Pencil />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label="Usuń notatkę"
                  title="Usuń notatkę"
                  onClick={onDelete}
                  data-testid={`set-log-entry-${entry.id}-delete-btn`}
                >
                  <Trash2 />
                </Button>
              </span>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

/**
 * „Historia i notatki” zestawu (SPEC-063): zdarzenia z zapisu i notatki personelu. Pacjent tego nie widzi;
 * backend zwraca tylko wpisy, które wywołujący może widzieć. Backend bez logu odrzuca zapytanie, więc wtedy
 * sekcja się nie pokazuje.
 */
export function SetHistoryNotesPanel({ exerciseSetId, isGlobalTemplate, exerciseNames }: Readonly<SetHistoryNotesPanelProps>) {
  const { canReviewExercises: isFiziyoTeam, isLoading: roleLoading } = useSystemRole();
  const visibilityOptions = useMemo(
    () => allowedSetNoteVisibilities({ isFiziyoTeam, isGlobalTemplate }),
    [isFiziyoTeam, isGlobalTemplate]
  );
  const [draft, setDraft] = useState('');
  const [chosenVisibility, setChosenVisibility] = useState<ExerciseSetLogVisibility | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const visibility = chosenVisibility && visibilityOptions.includes(chosenVisibility) ? chosenVisibility : visibilityOptions[0];

  const { data, loading, error } = useQuery<GetExerciseSetLogResponse>(GET_EXERCISE_SET_LOG_QUERY, {
    variables: { exerciseSetId },
    fetchPolicy: 'cache-and-network',
  });
  const refetchQueries = [{ query: GET_EXERCISE_SET_LOG_QUERY, variables: { exerciseSetId } }];
  const [addNote, { loading: adding }] = useMutation<AddExerciseSetNoteResponse>(ADD_EXERCISE_SET_NOTE_MUTATION, {
    refetchQueries,
    awaitRefetchQueries: true,
  });
  const [updateNote, { loading: updating }] = useMutation<UpdateExerciseSetNoteResponse>(
    UPDATE_EXERCISE_SET_NOTE_MUTATION,
    { refetchQueries, awaitRefetchQueries: true }
  );
  const [deleteNote, { loading: deleting }] = useMutation<DeleteExerciseSetNoteResponse>(
    DELETE_EXERCISE_SET_NOTE_MUTATION,
    { refetchQueries, awaitRefetchQueries: true }
  );

  const entries = useMemo(() => sortSetLogNewestFirst(data?.exerciseSetLog ?? []), [data]);

  if (error && !data) return null;

  const trimmed = draft.trim();
  const isTooLong = trimmed.length > SET_NOTE_MAX_LENGTH;

  const handleAdd = async () => {
    if (!trimmed || isTooLong || adding) return;
    try {
      await addNote({ variables: { exerciseSetId, body: trimmed, visibility } });
      setDraft('');
    } catch (addError) {
      console.error('Błąd zapisu notatki zestawu:', addError);
      toast.error(readableError(addError, 'Nie udało się zapisać notatki'));
    }
  };

  const handleSave = async (id: string, body: string, nextVisibility: ExerciseSetLogVisibility) => {
    try {
      await updateNote({ variables: { id, body, visibility: nextVisibility } });
      return true;
    } catch (updateError) {
      console.error('Błąd edycji notatki zestawu:', updateError);
      toast.error(readableError(updateError, 'Nie udało się zapisać zmian'));
      return false;
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteNote({ variables: { id: deletingId } });
      setDeletingId(null);
    } catch (deleteError) {
      console.error('Błąd usuwania notatki zestawu:', deleteError);
      toast.error('Nie udało się usunąć notatki');
    }
  };

  return (
    <section className="space-y-3" aria-labelledby="set-history-notes-title" data-testid="set-history-notes">
      <div className="flex flex-col gap-0.5">
        <h2
          id="set-history-notes-title"
          className="flex items-center gap-2 text-[20px] font-semibold leading-[25px] text-foreground"
        >
          <History className="h-5 w-5 text-label-secondary" aria-hidden />
          Historia i notatki
        </h2>
        <p className="text-[13px] leading-[18px] text-label-secondary">Pacjent tego nie widzi.</p>
      </div>

      <div className="flex flex-col gap-2 rounded-card bg-grouped-tertiary p-3">
        <Textarea
          value={draft}
          rows={2}
          className="resize-none bg-card text-[14px]"
          placeholder="Notatka do zestawu, np. dlaczego zmieniono dawki"
          aria-label="Nowa notatka"
          aria-invalid={isTooLong}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              void handleAdd();
            }
          }}
          data-testid="set-history-notes-input"
        />
        <div className="flex flex-wrap items-center gap-2">
          <VisibilityPicker
            value={visibility}
            options={visibilityOptions}
            onChange={setChosenVisibility}
            testId="set-history-notes-visibility"
            disabled={roleLoading}
          />
          <span className="flex-1" />
          <Button
            type="button"
            size="sm"
            variant="tinted"
            disabled={!trimmed || isTooLong || adding || roleLoading}
            onClick={() => void handleAdd()}
            data-testid="set-history-notes-add-btn"
          >
            {adding ? <Loader2 className="animate-spin" /> : <Plus />}
            Dodaj notatkę
          </Button>
        </div>
        {isTooLong && (
          <p className="text-[12px] font-semibold text-status-danger" role="alert">
            Notatka może mieć najwyżej {SET_NOTE_MAX_LENGTH} znaków
          </p>
        )}
      </div>

      {loading && !data && (
        <p className="flex items-center gap-2 text-[13px] text-label-secondary" role="status">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Wczytywanie…
        </p>
      )}
      {data && entries.length === 0 && (
        <p className="text-[13px] text-label-secondary" data-testid="set-history-notes-empty">
          Brak wpisów. Zmiany zestawu będą się tu zapisywać same.
        </p>
      )}
      {entries.length > 0 && (
        <ul className="flex flex-col gap-3" data-testid="set-history-notes-list">
          {entries.map((entry) =>
            entry.kind === 'NOTE' ? (
              <NoteRow
                key={entry.id}
                entry={entry}
                visibilityOptions={visibilityOptions}
                saving={updating}
                onSave={(body, nextVisibility) => handleSave(entry.id, body, nextVisibility)}
                onDelete={() => setDeletingId(entry.id)}
              />
            ) : (
              <EventRow key={entry.id} entry={entry} exerciseNames={exerciseNames} />
            )
          )}
        </ul>
      )}

      <ConfirmDialog
        open={deletingId !== null}
        onOpenChange={(open) => !open && setDeletingId(null)}
        title="Usuń notatkę"
        description="Notatka zniknie z historii zestawu."
        confirmText="Usuń"
        variant="destructive"
        onConfirm={() => void handleDelete()}
        isLoading={deleting}
      />
    </section>
  );
}
