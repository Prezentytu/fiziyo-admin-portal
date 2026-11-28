import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ChatRatingToast } from '../ChatRatingToast';

describe('ChatRatingToast (SPEC-074)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('saves Super in 1 click without forcing a form and auto-hides after 6 seconds', () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    const onDismiss = vi.fn();
    const onEscalate = vi.fn();

    render(
      <ChatRatingToast
        sessionId="sess-1"
        turnIndex={3}
        component="SetDraft"
        creditsUsed={1}
        onDismiss={onDismiss}
        onEscalate={onEscalate}
        onSubmitFeedback={onSubmit}
      />
    );

    fireEvent.click(screen.getByTestId('chat-rating-super-btn'));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'sess-1',
        turnIndex: 3,
        surface: 'session_modal',
        rating: 'super',
        component: 'SetDraft',
        creditsUsed: 1,
      })
    );
    expect(screen.getByText('Dziękujemy! Chcesz dodać krótką uwagę?')).toBeInTheDocument();
    expect(screen.getByTestId('chat-rating-add-comment-btn')).toBeInTheDocument();
    expect(onDismiss).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(6000);
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('expands 5 reason tags on Bad and submits tags with optional comment', async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    const onDismiss = vi.fn();
    const onEscalate = vi.fn();

    render(
      <ChatRatingToast
        sessionId="sess-2"
        turnIndex={5}
        component="SetDraft"
        onDismiss={onDismiss}
        onEscalate={onEscalate}
        onSubmitFeedback={onSubmit}
      />
    );

    fireEvent.click(screen.getByTestId('chat-rating-bad-btn'));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ rating: 'bad', surface: 'session_modal' }));
    expect(screen.getByTestId('chat-rating-tag-clinical_mismatch')).toBeInTheDocument();
    expect(screen.getByTestId('chat-rating-tag-ignored_constraint')).toBeInTheDocument();
    expect(screen.getByTestId('chat-rating-tag-too_slow')).toBeInTheDocument();
    expect(screen.getByTestId('chat-rating-tag-data_error')).toBeInTheDocument();
    expect(screen.getByTestId('chat-rating-tag-missing_feature')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('chat-rating-tag-ignored_constraint'));
    fireEvent.click(screen.getByTestId('chat-rating-tag-too_slow'));
    fireEvent.change(screen.getByTestId('chat-rating-comment-input'), {
      target: { value: 'Zestaw trwał ponad 50 sekund.' },
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('chat-rating-submit-btn'));
    });

    expect(onSubmit).toHaveBeenLastCalledWith(
      expect.objectContaining({
        sessionId: 'sess-2',
        turnIndex: 5,
        rating: 'bad',
        reasonTags: ['ignored_constraint', 'too_slow'],
        comment: 'Zestaw trwał ponad 50 sekund.',
      })
    );
  });

  it('escalates to FeedbackDialog with initialType=suggestion when missing_feature is selected', () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    const onDismiss = vi.fn();
    const onEscalate = vi.fn();

    render(
      <ChatRatingToast
        sessionId="sess-3"
        turnIndex={2}
        component="Message"
        onDismiss={onDismiss}
        onEscalate={onEscalate}
        onSubmitFeedback={onSubmit}
      />
    );

    fireEvent.click(screen.getByTestId('chat-rating-bad-btn'));
    fireEvent.click(screen.getByTestId('chat-rating-tag-missing_feature'));
    fireEvent.change(screen.getByTestId('chat-rating-comment-input'), {
      target: { value: 'Potrzebuję przypomnienia SMS' },
    });
    fireEvent.click(screen.getByTestId('chat-rating-escalate-btn'));

    expect(onSubmit).toHaveBeenLastCalledWith(
      expect.objectContaining({
        rating: 'bad',
        reasonTags: ['missing_feature'],
        escalatedToFullReport: true,
      })
    );
    expect(onEscalate).toHaveBeenCalledWith(
      expect.objectContaining({
        initialType: 'suggestion',
        initialDescription: expect.stringContaining('Potrzebuję przypomnienia SMS'),
      })
    );
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
