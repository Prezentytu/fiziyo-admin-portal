'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { ArrowUp, Bot, CheckCheck, Loader2, MessageSquareText, Send, UserCheck, UserPlus, Wrench, X } from 'lucide-react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  ADD_EXERCISE_REVIEW_NOTE_MUTATION,
  ASSIGN_EXERCISES_FOR_REVIEW_MUTATION,
  COMPLETE_INTERNAL_EXERCISE_FIXES_MUTATION,
  SEND_EXERCISE_REVIEW_NOTES_MUTATION,
} from '@/graphql/mutations/exerciseReviewNotes.mutations';
import {
  GET_EXERCISE_REVIEW_NOTES_QUERY,
  GET_EXERCISE_REVIEW_WORKFLOW_QUERY,
} from '@/graphql/queries/exerciseReviewNotes.queries';
import { GET_VERIFICATION_STATS_QUERY } from '@/graphql/queries/adminExercises.queries';
import type {
  AddExerciseReviewNoteResponse,
  AssignExercisesForReviewResponse,
  ExerciseReviewNote,
  ExerciseReviewNotesTarget,
  GetExerciseReviewNotesResponse,
  GetExerciseReviewWorkflowResponse,
} from '@/graphql/types/exerciseReviewNote.types';

import {
  REVIEW_NOTE_MAX_LENGTH,
  buildReviewThread,
  formatReviewNoteTime,
  isReviewMarker,
  reviewMarkerLabel,
  unsentReviewNotes,
} from './utils/reviewNotes';

const OPEN_STORAGE_KEY = 'fiziyo.verification.reviewNotesOpen';

interface ReviewNotesPanelProps {
  exerciseId: string;
  /** Screen the reviewer is on; saved with every note so it is clear what the note refers to. */
  context: { key: string; label: string };
  /** The exercise waits for a decision, so it can go back to its author. */
  canSendToAuthor: boolean;
  /** Przydział osobie istnieje tylko w kolejce globalnej; w kolejce gabinetu wiersz przydziału jest ukryty. */
  canAssign: boolean;
  /** Saves pending edits; a rejection stops the send. */
  beforeSend: () => Promise<void>;
  onSent: (target: ExerciseReviewNotesTarget) => void;
  /** The docked panel covers the right edge; the workspace makes room for it while it is open. */
  onOpenChange?: (isOpen: boolean) => void;
}

function readStoredOpen(): boolean {
  try {
    return globalThis.localStorage?.getItem(OPEN_STORAGE_KEY) !== '0';
  } catch {
    return true;
  }
}

function authorLabel(note: ExerciseReviewNote): string {
  if (note.authorRole === 'ASSISTANT') return 'AI';
  if (note.authorRole === 'AUTHOR') return `Autor${note.authorName ? ` · ${note.authorName}` : ''}`;
  return note.isMine ? 'Ty' : note.authorName || 'Weryfikator';
}

function NoteBubble({ note, isReply = false }: Readonly<{ note: ExerciseReviewNote; isReply?: boolean }>) {
  return (
    <div className={cn('flex flex-col gap-1', isReply && 'ml-4')} data-testid={`review-note-${note.id}`}>
      <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] leading-4 text-label-secondary">
        {note.authorRole === 'ASSISTANT' && <Bot className="h-3 w-3" aria-hidden />}
        <span>{authorLabel(note)}</span>
        <span>· {formatReviewNoteTime(note.createdAt)}</span>
        {note.contextLabel && (
          <span className="rounded-badge bg-tint-muted px-1.5 font-medium text-tint">{note.contextLabel}</span>
        )}
      </p>
      <p
        className={cn(
          'whitespace-pre-wrap break-words rounded-[10px] px-2.5 py-1.5 text-[13px] leading-[18px] text-foreground',
          note.authorRole === 'REVIEWER' ? 'bg-grouped-tertiary' : 'bg-status-success-muted'
        )}
      >
        {note.body}
      </p>
    </div>
  );
}

function RoundMarker({ note }: Readonly<{ note: ExerciseReviewNote }>) {
  return (
    <div
      className="flex items-center gap-2 text-[11px] font-medium leading-4 text-status-warning"
      role="separator"
      data-testid={`review-note-marker-${note.kind}`}
    >
      <span className="h-px flex-1 bg-status-warning/40" />
      <span>
        {reviewMarkerLabel(note.kind)} · {formatReviewNoteTime(note.createdAt)}
      </span>
      <span className="h-px flex-1 bg-status-warning/40" />
    </div>
  );
}

/**
 * Reviewer notes for one exercise, docked to the right edge on every verification stage. Notes are only
 * collected here; one of the two send actions cuts the round and moves the exercise on. FiziYo team only:
 * the backend returns nothing to other roles.
 */
export function ReviewNotesPanel({
  exerciseId,
  context,
  canSendToAuthor,
  canAssign,
  beforeSend,
  onSent,
  onOpenChange,
}: Readonly<ReviewNotesPanelProps>) {
  const [isOpen, setIsOpen] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState<ExerciseReviewNotesTarget | null>(null);
  const listEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => setIsOpen(readStoredOpen()), []);
  useEffect(() => onOpenChange?.(isOpen), [isOpen, onOpenChange]);

  const { data, loading, error } = useQuery<GetExerciseReviewNotesResponse>(GET_EXERCISE_REVIEW_NOTES_QUERY, {
    variables: { exerciseId },
    fetchPolicy: 'cache-and-network',
  });
  const { data: workflowData } = useQuery<GetExerciseReviewWorkflowResponse>(GET_EXERCISE_REVIEW_WORKFLOW_QUERY, {
    variables: { id: exerciseId },
    fetchPolicy: 'cache-and-network',
  });
  const refetchQueries = [
    { query: GET_EXERCISE_REVIEW_NOTES_QUERY, variables: { exerciseId } },
    { query: GET_EXERCISE_REVIEW_WORKFLOW_QUERY, variables: { id: exerciseId } },
  ];
  const [addNote, { loading: adding }] = useMutation<AddExerciseReviewNoteResponse>(ADD_EXERCISE_REVIEW_NOTE_MUTATION, {
    refetchQueries,
    awaitRefetchQueries: true,
  });
  const [sendNotes] = useMutation(SEND_EXERCISE_REVIEW_NOTES_MUTATION, {
    refetchQueries: [...refetchQueries, { query: GET_VERIFICATION_STATS_QUERY }],
  });
  const [assign, { loading: assigning }] = useMutation<AssignExercisesForReviewResponse>(
    ASSIGN_EXERCISES_FOR_REVIEW_MUTATION,
    { refetchQueries }
  );
  const [completeFixes, { loading: completingFixes }] = useMutation(COMPLETE_INTERNAL_EXERCISE_FIXES_MUTATION, {
    refetchQueries: [...refetchQueries, { query: GET_VERIFICATION_STATS_QUERY }],
  });
  const [takeOverOpen, setTakeOverOpen] = useState(false);

  const thread = data?.exerciseReviewNotes ?? [];
  const unsentCount = unsentReviewNotes(thread).length;
  const workflow = workflowData?.exerciseByIdForAdmin?.reviewWorkflow ?? null;
  const noteCount = thread.length;

  useEffect(() => {
    if (isOpen) listEndRef.current?.scrollIntoView?.({ block: 'nearest' });
  }, [isOpen, noteCount]);

  const toggleOpen = (next: boolean) => {
    setIsOpen(next);
    try {
      globalThis.localStorage?.setItem(OPEN_STORAGE_KEY, next ? '1' : '0');
    } catch {
      // Private mode: the panel still works, it just opens by default next time.
    }
  };

  const trimmed = draft.trim();
  const isTooLong = trimmed.length > REVIEW_NOTE_MAX_LENGTH;

  const handleAdd = async () => {
    if (!trimmed || isTooLong || adding) return;
    try {
      await addNote({
        variables: { exerciseId, body: trimmed, contextKey: context.key, contextLabel: context.label },
      });
      setDraft('');
    } catch (addError) {
      console.error('Błąd zapisu uwagi:', addError);
      toast.error('Nie udało się zapisać uwagi');
    }
  };

  const handleSend = async (target: ExerciseReviewNotesTarget) => {
    if (unsentCount === 0 || sending) return;
    setSending(target);
    try {
      await beforeSend();
      await sendNotes({ variables: { exerciseId, target } });
      toast.success(target === 'AUTHOR' ? 'Uwagi odesłane do autora' : 'Uwagi wysłane do poprawek wewnętrznych');
      onSent(target);
    } catch (sendError) {
      console.error('Błąd wysyłania uwag:', sendError);
      // Backend hides exception text behind a generic message; only our own unsaved-changes error is readable.
      const readable = sendError instanceof Error && !sendError.message.includes('Unexpected Execution Error');
      toast.error(readable && sendError.message ? sendError.message : 'Nie udało się wysłać uwag');
      setSending(null);
    }
  };

  const handleAssign = async (assignToMe: boolean, takeOver = false) => {
    try {
      const result = await assign({ variables: { exerciseIds: [exerciseId], assign: assignToMe, takeOver } });
      if (result.data?.assignExercisesForReview.skippedExerciseIds.length) {
        toast.error('To ćwiczenie ma już innego weryfikatora');
      }
    } catch (assignError) {
      console.error('Błąd przypisania:', assignError);
      toast.error('Nie udało się zmienić przypisania');
    } finally {
      setTakeOverOpen(false);
    }
  };

  const handleCompleteFixes = async () => {
    try {
      await completeFixes({ variables: { exerciseId } });
      toast.success('Poprawione: ćwiczenie wraca do sprawdzenia');
    } catch (fixError) {
      console.error('Błąd oznaczania poprawek:', fixError);
      toast.error('Nie udało się oznaczyć poprawek');
    }
  };

  if (!isOpen) {
    return (
      <Button
        type="button"
        variant="secondary"
        className="fixed bottom-28 right-4 z-40 shadow-md"
        onClick={() => toggleOpen(true)}
        data-testid="review-notes-open-btn"
      >
        <MessageSquareText />
        Uwagi
        {unsentCount > 0 && (
          <span className="rounded-badge bg-tint-fill px-1.5 text-[12px] font-semibold tabular-nums text-on-tint">
            {unsentCount}
          </span>
        )}
      </Button>
    );
  }

  return (
    <aside
      className="fixed bottom-28 right-4 top-24 z-40 flex w-[340px] max-w-[calc(100vw-2rem)] flex-col rounded-2xl border border-separator bg-card shadow-lg"
      aria-label="Uwagi do ćwiczenia"
      data-testid="review-notes-panel"
    >
      <header className="flex flex-col gap-2 border-b-[0.5px] border-separator px-3 py-2.5">
        <div className="flex items-center gap-2">
          <MessageSquareText className="h-4 w-4 text-label-secondary" aria-hidden />
          <h2 className="flex-1 text-[15px] font-semibold text-foreground">Uwagi</h2>
          {workflow?.internalFixStatus === 'WAITING' && <Badge variant="warning">Czeka na poprawki</Badge>}
          {workflow?.internalFixStatus === 'FIXED' && <Badge variant="success">Poprawione, sprawdź</Badge>}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="-mr-1.5 h-7 w-7"
            aria-label="Zwiń uwagi"
            title="Zwiń uwagi"
            onClick={() => toggleOpen(false)}
            data-testid="review-notes-close-btn"
          >
            <X />
          </Button>
        </div>
        {canAssign && workflow && (
          <div className="flex items-center justify-between gap-2 text-[12px] text-label-secondary">
            <span data-testid="review-notes-assignee">
              {workflow.assigneeId
                ? workflow.assignedToMe
                  ? 'Przypisane do Ciebie'
                  : `Przypisane: ${workflow.assigneeName || 'inny weryfikator'}`
                : 'Nieprzypisane'}
            </span>
            {workflow.assigneeId && !workflow.assignedToMe && (
              <Button
                type="button"
                variant="plain"
                size="sm"
                className="-mr-2 h-7"
                disabled={assigning}
                onClick={() => setTakeOverOpen(true)}
                data-testid="review-notes-takeover-btn"
              >
                <UserPlus />
                Przejmij
              </Button>
            )}
            {(!workflow.assigneeId || workflow.assignedToMe) && (
              <Button
                type="button"
                variant="plain"
                size="sm"
                className="-mr-2 h-7"
                disabled={assigning}
                onClick={() => void handleAssign(!workflow.assignedToMe)}
                data-testid="review-notes-assign-btn"
              >
                {workflow.assignedToMe ? <UserCheck /> : <UserPlus />}
                {workflow.assignedToMe ? 'Zdejmij ze mnie' : 'Przypisz do mnie'}
              </Button>
            )}
          </div>
        )}
        {workflow?.internalFixStatus === 'WAITING' && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="self-start"
            disabled={completingFixes}
            onClick={() => void handleCompleteFixes()}
            data-testid="review-notes-mark-fixed-btn"
          >
            {completingFixes ? <Loader2 className="animate-spin" /> : <CheckCheck />}
            Oznacz jako poprawione
          </Button>
        )}
      </header>

      <ConfirmDialog
        open={takeOverOpen}
        onOpenChange={setTakeOverOpen}
        title="Przejąć ćwiczenie?"
        description={`Ćwiczenie sprawdza teraz ${workflow?.assigneeName || 'inna osoba'}. Po przejęciu zniknie z jej listy „Moje”.`}
        confirmText="Przejmij"
        onConfirm={() => void handleAssign(true, true)}
        isLoading={assigning}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-3 py-3" data-testid="review-notes-list">
        {loading && !data && (
          <p className="flex items-center gap-2 text-[13px] text-label-secondary" role="status">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Wczytywanie…
          </p>
        )}
        {error && !data && (
          <p className="text-[13px] font-semibold text-status-danger" role="alert">
            Nie udało się wczytać uwag
          </p>
        )}
        {data && thread.length === 0 && (
          <p className="text-[13px] leading-[18px] text-label-secondary">
            Zapisuj tu wszystko, co trzeba poprawić. Każda uwaga pamięta ekran, na którym ją wpisano.
          </p>
        )}
        {buildReviewThread(thread).map(({ note, replies }) =>
          isReviewMarker(note) ? (
            <RoundMarker key={note.id} note={note} />
          ) : (
            <div key={note.id} className="flex flex-col gap-1.5">
              <NoteBubble note={note} />
              {replies.map((reply) => (
                <NoteBubble key={reply.id} note={reply} isReply />
              ))}
            </div>
          )
        )}
        <div ref={listEndRef} />
      </div>

      <div className="flex flex-col gap-1.5 border-t-[0.5px] border-separator px-3 py-2.5">
        <p className="text-[11px] leading-4 text-label-secondary">
          Zapisze się jako:{' '}
          <span className="rounded-badge bg-tint-muted px-1.5 font-medium text-tint" data-testid="review-notes-context">
            {context.label}
          </span>
        </p>
        <div className="flex items-end gap-2">
          <Textarea
            data-testid="review-notes-input"
            value={draft}
            rows={2}
            className="min-h-0 flex-1 resize-none text-[13px]"
            placeholder="Co poprawić"
            aria-label="Nowa uwaga"
            aria-invalid={isTooLong}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              // The workspace listens for ⌘↵ on the document; typing a note must never publish the exercise.
              if (event.key === 'Enter') event.stopPropagation();
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void handleAdd();
              }
            }}
          />
          <Button
            type="button"
            size="icon"
            aria-label="Dodaj uwagę"
            title="Dodaj uwagę"
            disabled={!trimmed || isTooLong || adding}
            onClick={() => void handleAdd()}
            data-testid="review-notes-add-btn"
          >
            {adding ? <Loader2 className="animate-spin" /> : <ArrowUp />}
          </Button>
        </div>
        {isTooLong && (
          <p className="text-[12px] font-semibold text-status-danger" role="alert">
            Uwaga może mieć najwyżej {REVIEW_NOTE_MAX_LENGTH} znaków
          </p>
        )}
      </div>

      <footer className="flex flex-col gap-1.5 border-t-[0.5px] border-separator px-3 py-2.5">
        <p className="text-[11px] leading-4 text-label-secondary" data-testid="review-notes-unsent-count">
          {unsentCount > 0 ? `Do wysłania: ${unsentCount}` : 'Brak nowych uwag do wysłania'}
        </p>
        <Button
          type="button"
          variant="tinted"
          size="sm"
          disabled={unsentCount === 0 || sending !== null}
          onClick={() => void handleSend('INTERNAL_FIXES')}
          data-testid="review-notes-send-internal-btn"
        >
          {sending === 'INTERNAL_FIXES' ? <Loader2 className="animate-spin" /> : <Wrench />}
          Do poprawek wewnętrznych
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={unsentCount === 0 || sending !== null || !canSendToAuthor}
          title={canSendToAuthor ? undefined : 'Do autora wraca tylko ćwiczenie czekające na weryfikację'}
          onClick={() => void handleSend('AUTHOR')}
          data-testid="review-notes-send-author-btn"
        >
          {sending === 'AUTHOR' ? <Loader2 className="animate-spin" /> : <Send />}
          Odeślij do autora
        </Button>
      </footer>
    </aside>
  );
}
