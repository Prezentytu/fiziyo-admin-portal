import userEvent from '@testing-library/user-event';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import OrganizationPage from '../page';
import { ProductHelpCard } from '@/features/ai-view/catalog/ProductHelpCard';

const state = vi.hoisted(() => ({
  href: '/organization',
  role: 'owner',
  replace: vi.fn(),
  mutate: vi.fn(),
}));
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URL(state.href, 'https://example.test').searchParams,
  usePathname: () => '/organization',
  useRouter: () => ({ replace: state.replace }),
}));
vi.mock('@clerk/nextjs', () => ({ useUser: () => ({ user: { id: 'demo' } }) }));
vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: () => ({ currentOrganization: { organizationId: 'org', role: state.role }, isLoading: false }),
}));
vi.mock('@/features/ai-view/ChatSessionContext', () => ({ useChatActions: () => ({}), useChatBusy: () => false }));
vi.mock('@apollo/client/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@apollo/client/react')>()),
  useQuery: () => ({
    data: {
      organizationById: { id: 'org', name: 'Gabinet testowy' },
      userByClerkId: { id: 'demo' },
      userOrganizations: [{ organizationId: 'org', role: state.role }],
    },
    loading: false,
  }),
  useMutation: () => [state.mutate, {}],
}));

describe('clinic navigation', () => {
  beforeEach(() => {
    state.href = '/organization';
    state.role = 'owner';
    state.replace.mockClear();
    state.mutate.mockClear();
  });

  it.each(['admin', 'owner'])('takes the %s from the chat card to the new clinic form', async (role) => {
    state.role = role;
    const { unmount } = render(
      <ProductHelpCard spec={{ component: 'ProductHelp', topic: 'clinic' }} testId="help" messageId="m1" />
    );
    state.href = screen.getByRole('link').getAttribute('href')!;
    unmount();
    render(<OrganizationPage />);
    expect(screen.getByRole('tab', { name: /Gabinety/ })).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(screen.getByTestId('org-clinics-add-btn'));
    expect(await screen.findByRole('dialog', { name: 'Nowy gabinet' })).toBeInTheDocument();
    expect(state.mutate).not.toHaveBeenCalled();
  });

  it.each(['/organization', '/organization?tab=unknown'])('opens the team by default at %s', (href) => {
    state.href = href;
    render(<OrganizationPage />);
    expect(screen.getByRole('tab', { name: /Pracownicy/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('switches back to staff from a shared clinics link and preserves the other query parameters', async () => {
    state.href = '/organization?tab=clinics&from=chat';
    const { rerender } = render(<OrganizationPage />);
    await userEvent.click(screen.getByRole('tab', { name: /Pracownicy/ }));
    expect(state.replace).toHaveBeenCalledWith('/organization?from=chat', { scroll: false });
    state.href = '/organization?from=chat';
    rerender(<OrganizationPage />);
    expect(screen.getByRole('tab', { name: /Pracownicy/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('keeps the clinics URL behind the organization access guard', () => {
    state.href = '/organization?tab=clinics';
    state.role = 'therapist';
    render(<OrganizationPage />);
    expect(state.replace).toHaveBeenCalledWith('/');
    expect(screen.queryByTestId('org-clinics-add-btn')).toBeNull();
  });
});
