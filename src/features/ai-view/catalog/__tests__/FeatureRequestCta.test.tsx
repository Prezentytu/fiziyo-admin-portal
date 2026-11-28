import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FeatureRequestCta } from '../FeatureRequestCta';

const fetchMock = vi.hoisted(() => vi.fn());
const toastSuccess = vi.hoisted(() => vi.fn());

vi.mock('@/lib/featureFlags', () => ({ isFeedbackEnabled: () => true }));
vi.mock('@/lib/tokenCache', () => ({ getBackendToken: () => 'test-token' }));
vi.mock('sonner', () => ({ toast: { success: toastSuccess, error: vi.fn() } }));
vi.mock('@/components/shared/FeedbackDialog', () => ({
  FeedbackDialog: ({
    isOpen,
    initialType,
    initialDescription,
    capabilityCode,
    onClose,
    onSent,
  }: {
    isOpen: boolean;
    initialType?: string;
    initialDescription?: string;
    capabilityCode?: string;
    onClose: () => void;
    onSent?: () => void;
  }) =>
    isOpen ? (
      <div data-testid="mock-feedback-dialog">
        <span data-testid="mock-feedback-type">{initialType}</span>
        <span data-testid="mock-feedback-desc">{initialDescription}</span>
        <span data-testid="mock-feedback-code">{capabilityCode}</span>
        <button type="button" onClick={onClose} data-testid="mock-feedback-cancel-btn">
          Anuluj
        </button>
        <button type="button" onClick={() => onSent?.()} data-testid="mock-feedback-submit-btn">
          Wyślij
        </button>
      </div>
    ) : null,
}));

const CAPABILITY = {
  code: 'sms_reminders',
  label: 'Wysyłka SMS do pacjentów',
  prefill: 'Potrzeba z czatu: automatyczne przypomnienia SMS dla pacjentów.',
};

describe('SPEC-072: FeatureRequestCta', () => {
  beforeEach(() => {
    fetchMock.mockReset().mockResolvedValue({ ok: true, json: async () => ({ saved: true }) });
    toastSuccess.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('klik „+1 Potrzebuję tego” wysyła bez-PII głos popytu, blokuje duplikat i pokazuje potwierdzenie', async () => {
    render(<FeatureRequestCta capability={CAPABILITY} testId="reply-1" />);

    expect(screen.getByTestId('reply-1-feature-request-banner')).toHaveTextContent('Wysyłka SMS do pacjentów');
    const voteBtn = screen.getByTestId('reply-1-demand-vote-btn');
    fireEvent.click(voteBtn);

    await waitFor(() => expect(voteBtn).toBeDisabled());
    expect(voteBtn).toHaveTextContent('Zapisano głos — dziękujemy!');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/chat/feature-demand',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ capabilityCode: 'sms_reminders', source: 'chat_refusal' }),
      })
    );

    // Ponowne kliknięcie nie wysyła drugiego żądania.
    fireEvent.click(voteBtn);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('łagodnie degraduje do lokalnego potwierdzenia, gdy backend jeszcze nie ma endpointu', async () => {
    fetchMock.mockRejectedValueOnce(new Error('404'));
    render(<FeatureRequestCta capability={CAPABILITY} testId="reply-2" />);

    const voteBtn = screen.getByTestId('reply-2-demand-vote-btn');
    fireEvent.click(voteBtn);

    await waitFor(() => expect(voteBtn).toHaveTextContent('Zapisano głos — dziękujemy!'));
  });

  it('klik „Zgłoś potrzebę ze szczegółami” otwiera FeedbackDialog w trybie Sugestia z czystym prefillem', () => {
    render(<FeatureRequestCta capability={CAPABILITY} testId="reply-3" />);

    fireEvent.click(screen.getByTestId('reply-3-feature-request-btn'));

    expect(screen.getByTestId('mock-feedback-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('mock-feedback-type')).toHaveTextContent('suggestion');
    expect(screen.getByTestId('mock-feedback-desc')).toHaveTextContent(CAPABILITY.prefill);
    expect(screen.getByTestId('mock-feedback-code')).toHaveTextContent('sms_reminders');
  });
});
