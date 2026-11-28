import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FeedbackDialog } from '../FeedbackDialog';

const sendFeedbackMock = vi.hoisted(() => vi.fn());

vi.mock('@clerk/nextjs', () => ({
  useUser: () => ({
    user: {
      id: 'user-1',
      firstName: 'Anna',
      lastName: 'Nowak',
      primaryEmailAddress: { emailAddress: 'anna@example.com' },
    },
  }),
}));
vi.mock('next/navigation', () => ({ usePathname: () => '/' }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/services/feedbackService', () => ({
  sendFeedbackToDiscord: sendFeedbackMock,
  createFeedbackMetadata: (screenName?: string, extra?: { source?: string; capabilityCode?: string }) => ({
    appVersion: '0.1.0',
    platform: 'web',
    browser: 'Chrome',
    browserVersion: '1',
    timestamp: '2026-11-28T00:00:00.000Z',
    screenName,
    ...extra,
  }),
}));

describe('SPEC-072: FeedbackDialog (initialType, capabilityCode, poprawna odmiana plików)', () => {
  beforeEach(() => {
    sendFeedbackMock.mockReset().mockResolvedValue({ success: true });
  });

  it('startuje na zakładce Sugestia z prefillem, pokazuje „Maksymalnie 3 pliki” i Anuluj nie wysyła', () => {
    const onClose = vi.fn();
    render(
      <FeedbackDialog
        isOpen
        onClose={onClose}
        initialType="suggestion"
        initialDescription="Potrzeba z czatu: przypomnienia SMS."
        capabilityCode="sms_reminders"
        screenName="Czat w portalu (potrzeba funkcji)"
      />
    );

    expect(screen.getByTestId('common-feedback-description-input')).toHaveValue('Potrzeba z czatu: przypomnienia SMS.');
    expect(screen.getByTestId('common-feedback-type-suggestion-btn')).toHaveClass('shadow-sm');
    expect(screen.getByTestId('common-feedback-dialog')).toHaveTextContent('Maksymalnie 3 pliki');

    fireEvent.click(screen.getByTestId('common-feedback-cancel-btn'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(sendFeedbackMock).not.toHaveBeenCalled();
  });

  it('wysyła zgłoszenie jako suggestion z capabilityCode w metadanych', async () => {
    render(
      <FeedbackDialog
        isOpen
        onClose={vi.fn()}
        initialType="suggestion"
        initialDescription="Potrzeba z czatu: integracja ze ZnanyLekarz."
        capabilityCode="external_integration"
        screenName="Czat w portalu (potrzeba funkcji)"
      />
    );

    fireEvent.click(screen.getByTestId('common-feedback-submit-btn'));

    expect(sendFeedbackMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'suggestion',
        description: 'Potrzeba z czatu: integracja ze ZnanyLekarz.',
        metadata: expect.objectContaining({
          source: 'chat_missing_capability',
          capabilityCode: 'external_integration',
        }),
      })
    );
  });
});
