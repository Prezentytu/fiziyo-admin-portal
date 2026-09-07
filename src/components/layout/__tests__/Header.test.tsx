import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Header } from '../Header';

const route = vi.hoisted(() => ({ pathname: '/' }));

vi.mock('next/navigation', () => ({ usePathname: () => route.pathname }));
vi.mock('../MobileOrgIndicator', () => ({ MobileOrgIndicator: () => <span>Test Clinic</span> }));
vi.mock('@/components/shared/FeedbackButton', () => ({ FeedbackButton: () => <span>Feedback</span> }));

describe('Header', () => {
  beforeEach(() => {
    route.pathname = '/';
  });

  it('opens the mobile navigation without adding dashboard breadcrumbs', async () => {
    const onMobileMenuToggle = vi.fn();
    render(<Header onMobileMenuToggle={onMobileMenuToggle} />);
    await userEvent.click(screen.getByTestId('nav-mobile-menu-btn'));
    expect(onMobileMenuToggle).toHaveBeenCalledOnce();
    expect(screen.queryByTestId('nav-breadcrumbs')).not.toBeInTheDocument();
  });

  it('names the home link and marks only the current breadcrumb', () => {
    route.pathname = '/patients/73ff7644-63cf-43e2-b7ee-bbba627e03c6';
    render(<Header />);
    expect(screen.getByTestId('nav-breadcrumb-home')).toHaveAccessibleName('Pulpit');
    expect(screen.getByTestId('nav-breadcrumb-home')).toHaveAttribute('href', '/');
    expect(screen.getByTestId('nav-breadcrumb-item-0')).toHaveAttribute('href', '/patients');
    expect(screen.getByTestId('nav-breadcrumb-item-0')).not.toHaveAttribute('aria-current');
    expect(screen.getByTestId('nav-breadcrumb-item-1')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByTestId('nav-breadcrumb-item-1')).not.toHaveTextContent('73ff7644');
    expect(screen.queryByTestId('nav-mobile-menu-btn')).not.toBeInTheDocument();
  });
});