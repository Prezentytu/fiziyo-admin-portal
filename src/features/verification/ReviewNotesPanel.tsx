'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  ArrowUp,
  Bot,
  Building2,
  ChevronDown,
  History,
  Loader2,
  Lock,
  MessageSquareText,
  PenLine,
  Stethoscope,
  UserCheck,
  UserPlus,
  X,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  ADD_EXERCISE_REVIEW_NOTE_MUTATION,
  ASSIGN_EXERCISES_FOR_REVIEW_MUTATION,
  CHANGE_EXERCISE_REVIEW_NOTE_VISIBILITY_MUTATION,
} from '@/graphql/mutations/exerciseReviewNotes.mutations';
import {
  GET_EXERCISE_REVIEW_LOG_ACCESS_QUERY,
  GET_EXERCISE_REVIEW_NOTES_QUERY,
  GET_EXERCISE_REVIEW_WORKFLOW_QUERY,
} from '@/graphql/queries/exerciseReviewNotes.queries';
import type {
  AddExerciseReviewNoteResponse,
  AssignExercisesForReviewResponse,
  ChangeExerciseReviewNoteVisibilityResponse,
  ExerciseReviewNote,
  ExerciseReviewNoteVisibility,
  GetExerciseReviewLogAccessResponse,
  GetExerciseReviewNotesResponse,
  GetExerciseReviewWorkflowResponse,
} from '@/graphql/types/exerciseReviewNote.types';

import {
  REVIEW_LOG_FILTERS,
  REVIEW_NOTE_MAX_LENGTH,
  REVIEW_NOTE_VISIBILITY_META,
  buildReviewThread,
  filterReviewLog,
  formatReviewNoteTime,
  isReviewMarker,
  narrowerVisibilities,
  reviewEventText,
  unsentAuthorNotes,
  type ReviewLogFilter,
} from './utils/reviewNotes';

const OPEN_STORAGE_KEY = 'fiziyo.verification.reviewNotesOpen';

const VISIBILITY_ICONS: Record<ExerciseReviewNoteVisibility, LucideIcon> = {
  FIZIYO_ADMINS: Lock,
  ORG_REVIEWERS: Building2,
  AUTHOR: PenLine,
  THERAPIST: Stethoscope,
};

/** Tor, w którym leży log: w weryfikacji organizacji backend nie zwraca wpisów zespołu FiziYo (DEC-20261110-01). */
export type ReviewLogTrack = 'catalog' | 'organization';

interface ReviewNotesPanelProps {
  exerciseId: string;
  /** Screen the reviewer is on; saved with every note so it is clear what the note refers to. */
  context: { key: string; label: string };
  track?: ReviewLogTrack;
  /** `docked`: verification workspace, pinned to the right edge. `inline`: a section on the exercise page. */
  variant?: 'docked' | 'inline';
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
  if (note.authorRole === 'SYSTEM') return note.authorName || 'System';
  if (note.authorRole === 'AUTHOR') return `Autor${note.authorName ? ` · ${note.authorName}` : ''}`;
  return note.isMine ? 'Ty' : note.authorName || 'Weryfikator';
}

/** Variables shared by the panel and the decision bar, so both read one cache entry. */
export function reviewLogVariables(exerciseId: string, track: ReviewLogTrack) {
  return { exerciseId, organizationTrack: track === 'organization' };
}

function VisibilityLabel({ visibility }: Readonly<{ visibility: ExerciseReviewNoteVisibility }>) {
  const Icon = VISIBILITY_ICONS[visibility];
  return (
    <>
      <Icon className="h-3 w-3" aria-hidden />
      {REVIEW_NOTE_VISIBILITY_META[visibility].label}
    </>
  );
}

function VisibilityBadge({
  note,
  writable,
  onNarrow,
}: Readonly<{
  note: ExerciseReviewNote;
  writable: readonly ExerciseReviewNoteVisibility[];
  onNarrow: (visibility: ExerciseReviewNoteVisibility) => void;
}>) {
  const options = note.canChangeVisibility ? narrowerVisibilities(note.visibility, writable) : [];
  const className =
    'inline-flex items-center gap-1 rounded-badge bg-fill-tertiary px-1.5 font-medium text-label-secondary';
  const title = REVIEW_NOTE_VISIBILITY_META[note.visibility].hint;
  if (options.length === 0) {
    return (
      <span className={className} title={title} data-testid={`review-note-visibility-${note.id}`}>
        <VisibilityLabel visibility={note.visibility} />
      </span>
    );
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(className, 'hover:text-foreground')}
          title={`${title}. Zmień na węższy zakres`}
          aria-label={`Zakres: ${REVIEW_NOTE_VISIBILITY_META[note.visibility].label}. Zawęź`}
          data-testid={`review-note-visibility-${note.id}`}
        >
          <VisibilityLabel visibility={note.visibility} />
          <ChevronDown className="h-3 w-3" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {options.map((visibility) => (
          <DropdownMenuItem
            key={visibility}
            onSelect={() => onNarrow(visibility)}
            data-testid={`review-note-narrow-${note.id}-${visibility}`}
          >
            <VisibilityLabel visibility={visibility} />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NoteBubble({
  note,
  isReply = false,
  writable,
  onNarrow,
}: Readonly<{
  note: ExerciseReviewNote;
  isReply?: boolean;
  writable: readonly ExerciseReviewNoteVisibility[];
  onNarrow: (note: ExerciseReviewNote, visibility: ExerciseReviewNoteVisibility) => void;
}>) {
  return (
    <div className={cn('flex flex-col gap-1', isReply && 'ml-4')} data-testid={`review-note-${note.id}`}>
      <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] leading-4 text-label-secondary">
        {note.authorRole === 'ASSISTANT' && <Bot className="h-3 w-3" aria-hidden />}
        <span>{authorLabel(note)}</span>
        <span>· {formatReviewNoteTime(note.createdAt)}</span>
        <VisibilityBadge note={note} writable={writable} onNarrow={(visibility) => onNarrow(note, visibility)} />
        {note.visibility === 'AUTHOR' && note.authorRole === 'REVIEWER' && (
          <span data-testid={`review-note-sent-${note.id}`}>{note.isSentToAuthor ? '· wysłana' : '· do wysłania'}</span>
        )}
        {note.contextLabel && (
          <span className="rounded-badge bg-tint-muted px-1.5 font-medium text-tint">{note.contextLabel}</span>
        )}
      </p>
      <p
        className={cn(
          'whitespace-pre-wrap break-words rounded-[10px] px-2.5 py-1.5 text-[13px] leading-[18px] text-foreground',
          note.authorRole === 'AUTHOR' ? 'bg-status-success-muted' : 'bg-grouped-tertiary'
        )}
      >
        {note.body}
      </p>
    </div>
  );
}

/** System event: who did what and when. Round cuts keep their old marker test id. */
function LogEvent({ note }: Readonly<{ note: ExerciseReviewNote }>) {
  const isRoundCut = ['SENT_TO_INTERNAL_FIXES', 'SENT_TO_AUTHOR', 'INTERNAL_FIXES_DONE'].includes(note.kind);
  return (
    <div
      className={cn(
        'flex items-center gap-2 text-[11px] font-medium leading-4',
        isRoundCut ? 'text-status-warning' : 'text-label-secondary'
      )}
      role="separator"
      aria-label={reviewEventText(note)}
      data-testid={`review-note-marker-${note.kind}`}
    >
      <span className={cn('h-px w-3 shrink-0', isRoundCut ? 'bg-status-warning/40' : 'bg-separator')} />
      {note.kind === 'CONTENT_CHANGED' && <History className="h-3 w-3 shrink-0" aria-hidden />}
      <span className="min-w-0 flex-1" data-testid={`review-note-event-${note.id}`}>
        {reviewEventText(note)} · {authorLabel(note)} · {formatReviewNoteTime(note.createdAt)}
      </span>
    </div>
  );
}

/**
 * Log of work on one exercise (BW-FZ-125): notes with their visibility, review decisions and content changes on
 * one timeline. Text lives only here; review actions live in the decision bar. What each viewer gets is decided
 * by the backend (`exerciseReviewNotes`), the panel only renders it.
 */
export function ReviewNotesPanel({
  exerciseId,
  context,
  track = 'catalog',
  variant = 'docked',
  onOpenChange,
}: Readonly<ReviewNotesPanelProps>) {
  const isDocked = variant === 'docked';
  const [isOpen, setIsOpen] = useState(true);
  const [draft, setDraft] = useState('');
  const [filter, setFilter] = useState<ReviewLogFilter>('all');
  const [chosenVisibility, setChosenVisibility] = useState<ExerciseReviewNoteVisibility | null>(null);
  const listEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isDocked) setIsOpen(readStoredOpen());
  }, [isDocked]);
  useEffect(() => onOpenChange?.(isOpen), [isOpen, onOpenChange]);

  const variables = reviewLogVariables(exerciseId, track);
  // network-only: after a role or organization switch the cache must not show notes the new role cannot see.
  const { data, loading, error } = useQuery<GetExerciseReviewNotesResponse>(GET_EXERCISE_REVIEW_NOTES_QUERY, {
    variables,
    fetchPolicy: 'network-only',
    nextFetchPolicy: 'cache-first',
  });
  const { data: accessData } = useQuery<GetExerciseReviewLogAccessResponse>(GET_EXERCISE_REVIEW_LOG_ACCESS_QUERY, {
    variables,
    fetchPolicy: 'network-only',
    nextFetchPolicy: 'cache-first',
  });
  const access = accessData?.exerciseReviewLogAccess;
  const isTeamInCatalog = access?.level === 'TEAM' && track === 'catalog';
  const { data: workflowData } = useQuery<GetExerciseReviewWorkflowResponse>(GET_EXERCISE_REVIEW_WORKFLOW_QUERY, {
    variables: { id: exerciseId },
    fetchPolicy: 'cache-and-network',
    skip: !isTeamInCatalog,
  });
  const refetchQueries = [
    { query: GET_EXERCISE_REVIEW_NOTES_QUERY, variables },
    { query: GET_EXERCISE_REVIEW_LOG_ACCESS_QUERY, variables },
    ...(isTeamInCatalog ? [{ query: GET_EXERCISE_REVIEW_WORKFLOW_QUERY, variables: { id: exerciseId } }] : []),
  ];
  const [addNote, { loading: adding }] = useMutation<AddExerciseReviewNoteResponse>(ADD_EXERCISE_REVIEW_NOTE_MUTATION, {
    refetchQueries,
    awaitRefetchQueries: true,
  });
  const [changeVisibility] = useMutation<ChangeExerciseReviewNoteVisibilityResponse>(
    CHANGE_EXERCISE_REVIEW_NOTE_VISIBILITY_MUTATION,
    { refetchQueries }
  );
  const [assign, { loading: assigning }] = useMutation<AssignExercisesForReviewResponse>(
    ASSIGN_EXERCISES_FOR_REVIEW_MUTATION,
    { refetchQueries }
  );

  const thread = data?.exerciseReviewNotes ?? [];
  const writable = access?.writableVisibilities ?? [];
  const canWrite = writable.length > 0;
  const visibility =
    chosenVisibility && writable.includes(chosenVisibility) ? chosenVisibility : (access?.defaultVisibility ?? null);
  const authorDrafts = unsentAuthorNotes(thread).length;
  const workflow = workflowData?.exerciseByIdForAdmin?.reviewWorkflow ?? null;
  const shown = filterReviewLog(thread, filter);
  const noteCount = thread.length;

  useEffect(() => {
    if (isOpen && isDocked) listEndRef.current?.scrollIntoView?.({ block: 'nearest' });
  }, [isOpen, isDocked, noteCount]);

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
    if (!trimmed || isTooLong || adding || !visibility) return;
    try {
      await addNote({
        variables: { ...variables, body: trimmed, contextKey: context.key, contextLabel: context.label, visibility },
      });
      setDraft('');
    } catch (addError) {
      console.error('Błąd zapisu uwagi:', addError);
      toast.error('Nie udało się zapisać uwagi');
    }
  };

  const handleNarrow = async (note: ExerciseReviewNote, next: ExerciseReviewNoteVisibility) => {
    try {
      await changeVisibility({
        variables: { noteId: note.id, visibility: next, organizationTrack: variables.organizationTrack },
      });
      toast.success(`Zakres zmieniony: ${REVIEW_NOTE_VISIBILITY_META[next].label}`);
    } catch (changeError) {
      console.error('Błąd zmiany zakresu uwagi:', changeError);
      toast.error('Nie udało się zmienić zakresu');
    }
  };

  const handleAssign = async (assignToMe: boolean) => {
    try {
      const result = await assign({ variables: { exerciseIds: [exerciseId], assign: assignToMe } });
      if (result.data?.assignExercisesForReview.skippedExerciseIds.length) {
        toast.error('To ćwiczenie ma już innego weryfikatora');
      }
    } catch (assignError) {
      console.error('Błąd przypisania:', assignError);
      toast.error('Nie udało się zmienić przypisania');
    }
  };

  if (isDocked && !isOpen) {
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
        {authorDrafts > 0 && (
          <span className="rounded-badge bg-tint-fill px-1.5 text-[12px] font-semibold tabular-nums text-on-tint">
            {authorDrafts}
          </span>
        )}
      </Button>
    );
  }

  return (
    <aside
      className={cn(
        'flex flex-col rounded-2xl border border-separator bg-card',
        isDocked
          ? 'fixed bottom-28 right-4 top-24 z-40 w-[340px] max-w-[calc(100vw-2rem)] shadow-lg'
          : 'max-h-[560px] w-full'
      )}
      aria-label="Uwagi do ćwiczenia"
      data-testid="review-notes-panel"
    >
      <header className="flex flex-col gap-2 border-b-[0.5px] border-separator px-3 py-2.5">
        <div className="flex items-center gap-2">
          <MessageSquareText className="h-4 w-4 text-label-secondary" aria-hidden />
          <h2 className="flex-1 text-[15px] font-semibold text-foreground">Uwagi i historia</h2>
          {workflow?.internalFixStatus === 'WAITING' && <Badge variant="warning">Czeka na poprawki</Badge>}
          {workflow?.internalFixStatus === 'FIXED' && <Badge variant="success">Poprawione, sprawdź</Badge>}
          {isDocked && (
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
          )}
        </div>
        {workflow && (
          <div className="flex items-center justify-between gap-2 text-[12px] text-label-secondary">
            <span data-testid="review-notes-assignee">
              {workflow.assigneeId
                ? workflow.assignedToMe
                  ? 'Przypisane do Ciebie'
                  : `Przypisane: ${workflow.assigneeName || 'inny weryfikator'}`
                : 'Nieprzypisane'}
            </span>
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
        <div className="flex gap-1" role="group" aria-label="Pokaż w logu">
          {REVIEW_LOG_FILTERS.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={filter === option.value ? 'tinted' : 'ghost'}
              className="h-7 px-2 text-[12px]"
              aria-pressed={filter === option.value}
              onClick={() => setFilter(option.value)}
              data-testid={`review-notes-filter-${option.value}`}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </header>

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
        {data && shown.length === 0 && (
          <p className="text-[13px] leading-[18px] text-label-secondary" data-testid="review-notes-empty">
            {thread.length === 0
              ? 'Zapisuj tu wszystko, co trzeba poprawić. Każda uwaga pamięta ekran i to, kto ją widzi.'
              : 'Nic w tym widoku.'}
          </p>
        )}
        {buildReviewThread(shown).map(({ note, replies }) =>
          isReviewMarker(note) ? (
            <LogEvent key={note.id} note={note} />
          ) : (
            <div key={note.id} className="flex flex-col gap-1.5">
              <NoteBubble note={note} writable={writable} onNarrow={(n, v) => void handleNarrow(n, v)} />
              {replies.map((reply) => (
                <NoteBubble
                  key={reply.id}
                  note={reply}
                  isReply
                  writable={writable}
                  onNarrow={(n, v) => void handleNarrow(n, v)}
                />
              ))}
            </div>
          )
        )}
        <div ref={listEndRef} />
      </div>

      {canWrite && visibility && (
        <div className="flex flex-col gap-1.5 border-t-[0.5px] border-separator px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] leading-4 text-label-secondary">
            <span>Widzi:</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-badge bg-tint-muted px-1.5 font-medium text-tint"
                  title={REVIEW_NOTE_VISIBILITY_META[visibility].hint}
                  aria-label={`Kto zobaczy uwagę: ${REVIEW_NOTE_VISIBILITY_META[visibility].label}. Zmień`}
                  data-testid="review-notes-visibility-btn"
                  data-visibility={visibility}
                >
                  <VisibilityLabel visibility={visibility} />
                  <ChevronDown className="h-3 w-3" aria-hidden />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {writable.map((option) => (
                  <DropdownMenuItem
                    key={option}
                    onSelect={() => setChosenVisibility(option)}
                    data-testid={`review-notes-visibility-option-${option}`}
                  >
                    <span className="flex flex-col">
                      <span className="flex items-center gap-1 font-medium">
                        <VisibilityLabel visibility={option} />
                      </span>
                      <span className="text-[12px] text-label-secondary">
                        {REVIEW_NOTE_VISIBILITY_META[option].hint}
                      </span>
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <span>· ekran:</span>
            <span
              className="rounded-badge bg-fill-tertiary px-1.5 font-medium text-label-secondary"
              data-testid="review-notes-context"
            >
              {context.label}
            </span>
          </div>
          <div className="flex items-end gap-2">
            <Textarea
              data-testid="review-notes-input"
              value={draft}
              rows={2}
              className="min-h-0 flex-1 resize-none text-[13px]"
              placeholder={visibility === 'AUTHOR' ? 'Co autor ma poprawić' : 'Uwaga'}
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
          {access?.level !== 'AUTHOR' && (
            <p className="text-[11px] leading-4 text-label-secondary" data-testid="review-notes-unsent-count">
              {authorDrafts > 0
                ? `Dla autora, do odesłania: ${authorDrafts}`
                : 'Uwagi dla autora odsyłasz przyciskiem „Odeślij do autora” na dole ekranu'}
            </p>
          )}
        </div>
      )}
    </aside>
  );
}
