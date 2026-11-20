import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProductHelpCard } from '../ProductHelpCard';
import type { CardProps } from '../cardProps';

const state = vi.hoisted(() => ({
  manage: false,
  referrals: false,
  markChosen: vi.fn(),
  send: vi.fn(),
  appendExchange: vi.fn(),
  releaseQuery: vi.fn(),
}));
vi.mock('../../ChatSessionContext', () => ({
  useChatActions: () => ({ markChosen: state.markChosen, appendExchange: state.appendExchange }),
  useChatBusy: () => false,
}));
vi.mock('@/hooks/useRoleAccess', () => ({ useRoleAccess: () => ({ canManageOrganization: state.manage }) }));
vi.mock('@/hooks/useMeFeature', () => ({ useMeFeature: () => state.referrals }));
vi.mock('@apollo/client/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@apollo/client/react')>()),
  useQuery: state.releaseQuery,
}));
vi.mock('@clerk/nextjs', () => ({ useUser: () => ({ user: { id: 'test' } }) }));
vi.mock('next/navigation', () => ({ usePathname: () => '/' }));
vi.mock('@/services/feedbackService', () => ({
  createFeedbackMetadata: () => ({}),
  sendFeedbackToDiscord: state.send,
}));

const props: CardProps<'ProductHelp'> = {
  spec: { component: 'ProductHelp', topic: 'clinic' },
  testId: 'help',
  messageId: 'm1',
};

describe('product help cards', () => {
  beforeEach(() => {
    state.markChosen.mockReset();
    state.send.mockReset();
    state.manage = false;
    state.referrals = false;
  });

  it('offers the clinics tab only to organization managers, including when rereading a card', () => {
    const { rerender } = render(<ProductHelpCard {...props} />);
    expect(screen.queryByRole('link')).toBeNull();
    state.manage = true;
    rerender(<ProductHelpCard {...props} />);
    expect(screen.getByText(/Menu konta → Organizacja → Gabinety → Dodaj gabinet/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Otwórz Gabinety' })).toHaveAttribute('href', '/organization?tab=clinics');
  });

  it('respects the referrals flag independently of team management', () => {
    const card = <ProductHelpCard {...props} spec={{ component: 'ProductHelp', topic: 'referral' }} />;
    const { unmount } = render(card);
    expect(screen.queryByRole('link')).toBeNull();
    unmount();
    state.referrals = true;
    render(card);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/settings?tab=referrals');
  });

  it('takes the branch selected under a particular question', () => {
    render(<ProductHelpCard {...props} spec={{ component: 'ProductHelp', topic: 'collaboration' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ma własny gabinet' }));
    expect(state.appendExchange).toHaveBeenCalledWith('Ma własny gabinet', {
      spec: { component: 'ProductHelp', topic: 'referral' },
    });
  });

  it('shows the published release with a link to that edition and handles an empty feed', () => {
    state.releaseQuery.mockReturnValue({ data: { releaseNotes: [] } });
    const show = () => <ProductHelpCard {...props} spec={{ component: 'ProductHelp', topic: 'portal-news' }} />;
    const { rerender } = render(show());
    expect(screen.getByText('Brak opublikowanych nowości dla tego konta.')).toBeInTheDocument();
    state.releaseQuery.mockReturnValue({
      data: {
        releaseNotes: [
          {
            id: 'edition',
            title: 'Zmiany w gabinecie',
            publishedAt: '2026-11-20T09:00:00Z',
            items: [{ title: 'Nowe zaproszenia' }],
            fixes: [],
          },
        ],
      },
    });
    rerender(show());
    expect(screen.getByText(/Nowe zaproszenia/)).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/settings?tab=whats-new#wydanie-edition');
  });

  it('opens an editable report, cancels, keeps edits after failure and marks it sent only after success', async () => {
    render(
      <ProductHelpCard
        {...props}
        spec={{ component: 'ProductHelp', topic: 'report', description: 'Dźwięk znika na Androidzie' }}
      />
    );
    fireEvent.click(screen.getByTestId('help-report-btn'));
    expect(screen.getByRole('textbox')).toHaveValue('Dźwięk znika na Androidzie');
    fireEvent.click(screen.getByTestId('common-feedback-cancel-btn'));
    expect(state.send).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('help-report-btn'));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Dźwięk znika po drugim ćwiczeniu' } });
    state.send.mockResolvedValueOnce({ success: false, error: 'test' }).mockResolvedValueOnce({ success: true });
    fireEvent.click(screen.getByTestId('common-feedback-submit-btn'));
    await waitFor(() => expect(screen.getByTestId('common-feedback-submit-btn')).toBeEnabled());
    expect(screen.getByRole('textbox')).toHaveValue('Dźwięk znika po drugim ćwiczeniu');
    expect(state.markChosen).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('common-feedback-submit-btn'));
    await waitFor(() => expect(state.markChosen).toHaveBeenCalledWith('m1', 'sent'));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(state.send).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: 'bug', description: 'Dźwięk znika po drugim ćwiczeniu' })
    );
  });
});
