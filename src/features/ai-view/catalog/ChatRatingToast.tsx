'use client';

import { useCallback, useEffect, useState } from 'react';
import { MessageSquarePlus, Send, Sparkles, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  buildFeedbackEscalation,
  CHAT_RATING_REASON_OPTIONS,
  MAX_CHAT_FEEDBACK_COMMENT_LENGTH,
  submitChatFeedback,
  type ChatFeedbackPayload,
  type ChatFeedbackReasonTag,
  type ChatRatingValue,
  type FeedbackEscalationDraft,
} from '../utils/chatTelemetry';

interface ChatRatingToastProps {
  readonly sessionId: string;
  readonly turnIndex: number;
  readonly component?: string;
  readonly creditsUsed?: number;
  readonly onDismiss: () => void;
  readonly onEscalate: (draft: FeedbackEscalationDraft) => void;
  /** Opcjonalny wstrzykiwany zapis (głównie dla testów jednostkowych). */
  readonly onSubmitFeedback?: (payload: ChatFeedbackPayload) => Promise<boolean>;
}

type RatingStep = 'choose' | 'positive_saved' | 'details' | 'submitted';

const POSITIVE_AUTO_HIDE_MS = 6000;
const SUBMITTED_AUTO_HIDE_MS = 2200;

/**
 * Lekka, nieblokująca karta oceny rozmowy w stylu Claude (Super / OK / Źle) (SPEC-074).
 * 1 klik dla Super/OK bez tarcia; dla Źle lub „Dopisz komentarz” rozwija tagi i przejście do FeedbackDialog.
 */
export function ChatRatingToast({
  sessionId,
  turnIndex,
  component,
  creditsUsed,
  onDismiss,
  onEscalate,
  onSubmitFeedback = submitChatFeedback,
}: ChatRatingToastProps) {
  const [step, setStep] = useState<RatingStep>('choose');
  const [rating, setRating] = useState<ChatRatingValue | null>(null);
  const [selectedTags, setSelectedTags] = useState<ChatFeedbackReasonTag[]>([]);
  const [comment, setComment] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (step !== 'positive_saved' && step !== 'submitted') return;
    const delay = step === 'positive_saved' ? POSITIVE_AUTO_HIDE_MS : SUBMITTED_AUTO_HIDE_MS;
    const timer = window.setTimeout(onDismiss, delay);
    return () => window.clearTimeout(timer);
  }, [step, onDismiss]);

  const sendPayload = useCallback(
    async (
      nextRating: ChatRatingValue,
      extras?: {
        reasonTags?: ChatFeedbackReasonTag[];
        comment?: string;
        escalatedToFullReport?: boolean;
      }
    ) => {
      await onSubmitFeedback({
        sessionId,
        turnIndex,
        surface: 'session_modal',
        rating: nextRating,
        component,
        creditsUsed,
        reasonTags: extras?.reasonTags,
        comment: extras?.comment,
        escalatedToFullReport: extras?.escalatedToFullReport,
      });
    },
    [component, creditsUsed, onSubmitFeedback, sessionId, turnIndex]
  );

  const handleChoose = (choice: ChatRatingValue) => {
    setRating(choice);
    void sendPayload(choice);
    setStep(choice === 'bad' ? 'details' : 'positive_saved');
  };

  const toggleTag = (code: ChatFeedbackReasonTag) => {
    setSelectedTags((previous) =>
      previous.includes(code) ? previous.filter((item) => item !== code) : [...previous, code]
    );
  };

  const handleSubmitDetails = async () => {
    if (!rating || isSaving) return;
    setIsSaving(true);
    try {
      await sendPayload(rating, {
        reasonTags: selectedTags.length > 0 ? selectedTags : undefined,
        comment: comment.trim() || undefined,
      });
      setStep('submitted');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEscalate = () => {
    const activeRating = rating ?? 'bad';
    void sendPayload(activeRating, {
      reasonTags: selectedTags.length > 0 ? selectedTags : undefined,
      comment: comment.trim() || undefined,
      escalatedToFullReport: true,
    });
    onEscalate(buildFeedbackEscalation(selectedTags, comment, component));
    onDismiss();
  };

  return (
    <aside
      role="region"
      aria-label="Ocena odpowiedzi Asystenta"
      data-testid="chat-rating-toast"
      className="ml-auto w-full max-w-[420px] animate-chat-rise rounded-[18px] border-[0.5px] border-separator bg-card px-4 py-3 shadow-raised"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[8px] bg-tint-muted text-tint">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <p className="text-[14px] font-semibold leading-5 text-foreground">
            {step === 'positive_saved'
              ? 'Dziękujemy! Chcesz dodać krótką uwagę?'
              : step === 'submitted'
                ? 'Dziękujemy za ocenę!'
                : 'Jak dziś poradził sobie Asystent?'}
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Zamknij ocenę"
          data-testid="chat-rating-dismiss-btn"
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[8px] text-label-tertiary transition-colors hover:bg-fill-quaternary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {step === 'choose' && (
        <div className="mt-2.5 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handleChoose('super')}
            data-testid="chat-rating-super-btn"
            className="inline-flex h-9 items-center justify-center rounded-[12px] border-[0.5px] border-hairline bg-fill-tertiary/60 px-3 text-[13px] font-semibold text-foreground transition-colors hover:border-tint/40 hover:bg-tint-muted hover:text-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Super
          </button>
          <button
            type="button"
            onClick={() => handleChoose('ok')}
            data-testid="chat-rating-ok-btn"
            className="inline-flex h-9 items-center justify-center rounded-[12px] border-[0.5px] border-hairline bg-fill-tertiary/60 px-3 text-[13px] font-semibold text-foreground transition-colors hover:border-separator hover:bg-fill-quaternary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            OK
          </button>
          <button
            type="button"
            onClick={() => handleChoose('bad')}
            data-testid="chat-rating-bad-btn"
            className="inline-flex h-9 items-center justify-center rounded-[12px] border-[0.5px] border-hairline bg-fill-tertiary/60 px-3 text-[13px] font-semibold text-foreground transition-colors hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Źle
          </button>
        </div>
      )}

      {step === 'positive_saved' && (
        <div className="mt-2.5 flex items-center justify-between gap-2">
          <span className="text-[12px] text-label-secondary">Ocena zapisana.</span>
          <button
            type="button"
            onClick={() => setStep('details')}
            data-testid="chat-rating-add-comment-btn"
            className="inline-flex h-8 items-center gap-1.5 rounded-[10px] border-[0.5px] border-hairline bg-fill-tertiary/60 px-3 text-[12px] font-semibold text-foreground transition-colors hover:bg-fill-quaternary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <MessageSquarePlus className="h-3.5 w-3.5" aria-hidden="true" />
            Dopisz komentarz
          </button>
        </div>
      )}

      {step === 'details' && (
        <div className="mt-3 flex flex-col gap-2.5">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Powody oceny">
            {CHAT_RATING_REASON_OPTIONS.map((option) => {
              const selected = selectedTags.includes(option.code);
              return (
                <button
                  key={option.code}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleTag(option.code)}
                  data-testid={`chat-rating-tag-${option.code}`}
                  className={cn(
                    'rounded-full border-[0.5px] px-2.5 py-1 text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    selected
                      ? 'border-tint bg-tint-muted text-tint'
                      : 'border-hairline bg-fill-tertiary/60 text-label-secondary hover:bg-fill-quaternary hover:text-foreground'
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value.slice(0, MAX_CHAT_FEEDBACK_COMMENT_LENGTH))}
            placeholder="Co poszło nie tak? (nie wpisuj danych pacjenta)"
            rows={2}
            data-testid="chat-rating-comment-input"
            className="w-full resize-none rounded-[12px] border-[0.5px] border-hairline bg-fill-tertiary/40 px-3 py-2 text-[13px] text-foreground placeholder:text-label-tertiary focus:border-tint focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleEscalate}
              data-testid="chat-rating-escalate-btn"
              className="inline-flex h-8 items-center gap-1.5 rounded-[10px] px-2.5 text-[12px] font-medium text-label-secondary transition-colors hover:bg-fill-quaternary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Dodaj zrzut / pełne zgłoszenie
            </button>
            <button
              type="button"
              onClick={() => void handleSubmitDetails()}
              disabled={isSaving}
              data-testid="chat-rating-submit-btn"
              className="inline-flex h-8 items-center gap-1.5 rounded-[10px] bg-tint px-3 text-[12px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Send className="h-3.5 w-3.5" aria-hidden="true" />
              Wyślij ocenę
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
