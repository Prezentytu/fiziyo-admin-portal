'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { ArrowUp, CornerDownRight, Loader2, MessageSquareText, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  REVIEW_NOTE_MAX_LENGTH,
  buildReviewThread,
  formatReviewNoteTime,
  isReviewMarker,
} from '@/features/verification/utils/reviewNotes';
import { ADD_EXERCISE_REVIEW_NOTE_MUTATION } from '@/graphql/mutations/exerciseReviewNotes.mutations';
import { GET_EXERCISE_REVIEW_NOTES_QUERY } from '@/graphql/queries/exerciseReviewNotes.queries';
import type {
  AddExerciseReviewNoteResponse,
  ExerciseReviewNote,
  GetExerciseReviewNotesResponse,
} from '@/graphql/types/exerciseReviewNote.types';

function Note({
  note,
  isReply = false,
  onReply,
}: Readonly<{ note: ExerciseReviewNote; isReply?: boolean; onReply?: () => void }>) {
  const fromAuthor = note.authorRole === 'AUTHOR';
  return (
    <div className={cn('flex flex-col gap-1', isReply && 'ml-5')} data-testid={`exercise-review-note-${note.id}`}>
      <p className="flex flex-wrap items-center gap-x-1.5 text-[12px] leading-4 text-label-secondary">
        <span>{fromAuthor ? (note.isMine ? 'Ty' : note.authorName) : 'Weryfikator'}</span>
        <span>· {formatReviewNoteTime(note.createdAt)}</span>
        {note.contextLabel && (
          <span className="rounded-badge bg-tint-muted px-1.5 font-medium text-tint">{note.contextLabel}</span>
        )}
      </p>
      <div className="flex items-start gap-2">
        <p
          className={cn(
            'min-w-0 flex-1 whitespace-pre-wrap break-words rounded-[10px] px-3 py-2 text-[15px] leading-5 text-foreground',
            fromAuthor ? 'bg-status-success-muted' : 'bg-grouped-tertiary'
          )}
        >
          {note.body}
        </p>
        {onReply && (
          <Button
            type="button"
            variant="plain"
            size="sm"
            onClick={onReply}
            data-testid={`exercise-review-note-${note.id}-reply-btn`}
          >
            <CornerDownRight />
            Odpowiedz
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Reviewer notes sent back to the author, with the author's replies. The backend returns only the rounds
 * sent to the author, and nothing at all to people who cannot edit the exercise, so the section hides itself.
 */
export function ExerciseReviewThread({ exerciseId }: Readonly<{ exerciseId: string }>) {
  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState<ExerciseReviewNote | null>(null);
  const { data } = useQuery<GetExerciseReviewNotesResponse>(GET_EXERCISE_REVIEW_NOTES_QUERY, {
    variables: { exerciseId },
    skip: !exerciseId,
    fetchPolicy: 'cache-and-network',
  });
  const [addNote, { loading: adding }] = useMutation<AddExerciseReviewNoteResponse>(ADD_EXERCISE_REVIEW_NOTE_MUTATION, {
    refetchQueries: [{ query: GET_EXERCISE_REVIEW_NOTES_QUERY, variables: { exerciseId } }],
    awaitRefetchQueries: true,
  });

  const thread = data?.exerciseReviewNotes ?? [];
  if (!thread.some((note) => note.kind === 'SENT_TO_AUTHOR')) return null;

  const trimmed = draft.trim();
  const isTooLong = trimmed.length > REVIEW_NOTE_MAX_LENGTH;

  const handleSend = async () => {
    if (!trimmed || isTooLong || adding) return;
    try {
      await addNote({ variables: { exerciseId, body: trimmed, replyToNoteId: replyTo?.id ?? null } });
      setDraft('');
      setReplyTo(null);
    } catch (error) {
      console.error('Błąd zapisu odpowiedzi:', error);
      toast.error('Nie udało się zapisać odpowiedzi');
    }
  };

  return (
    <section
      className="flex flex-col gap-3 rounded-2xl bg-card p-4"
      aria-labelledby="exercise-review-thread-title"
      data-testid="exercise-review-thread"
    >
      <h3
        id="exercise-review-thread-title"
        className="flex items-center gap-2 text-[15px] font-semibold text-foreground"
      >
        <MessageSquareText className="h-4 w-4 text-label-secondary" aria-hidden />
        Uwagi z weryfikacji
      </h3>
      <div className="flex flex-col gap-2.5">
        {buildReviewThread(thread).map(({ note, replies }) =>
          isReviewMarker(note) ? (
            <div
              key={note.id}
              className="flex items-center gap-2 text-[12px] font-medium text-label-secondary"
              role="separator"
            >
              <span className="h-px flex-1 bg-separator" />
              <span>Odesłano do poprawek · {formatReviewNoteTime(note.createdAt)}</span>
              <span className="h-px flex-1 bg-separator" />
            </div>
          ) : (
            <div key={note.id} className="flex flex-col gap-1.5">
              <Note note={note} onReply={note.authorRole === 'AUTHOR' ? undefined : () => setReplyTo(note)} />
              {replies.map((reply) => (
                <Note key={reply.id} note={reply} isReply />
              ))}
            </div>
          )
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        {replyTo && (
          <p
            className="flex items-center gap-1.5 text-[12px] text-label-secondary"
            data-testid="exercise-review-reply-to"
          >
            <span className="min-w-0 flex-1 truncate">Odpowiedź na: {replyTo.body}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              data-testid="exercise-review-reply-cancel-btn"
              aria-label="Anuluj odpowiedź na uwagę"
              onClick={() => setReplyTo(null)}
            >
              <X />
            </Button>
          </p>
        )}
        <div className="flex items-end gap-2">
          <Textarea
            data-testid="exercise-review-reply-input"
            value={draft}
            rows={2}
            className="min-h-0 flex-1 resize-none"
            placeholder="Napisz, co zostało poprawione"
            aria-label="Odpowiedź dla weryfikatora"
            aria-invalid={isTooLong}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void handleSend();
              }
            }}
          />
          <Button
            type="button"
            size="icon"
            aria-label="Wyślij odpowiedź"
            title="Wyślij odpowiedź"
            disabled={!trimmed || isTooLong || adding}
            onClick={() => void handleSend()}
            data-testid="exercise-review-reply-send-btn"
          >
            {adding ? <Loader2 className="animate-spin" /> : <ArrowUp />}
          </Button>
        </div>
      </div>
    </section>
  );
}
