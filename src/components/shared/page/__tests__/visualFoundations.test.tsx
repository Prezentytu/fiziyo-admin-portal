import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PageHero } from '../PageHero';
import { PageHeader } from '../PageHeader';
import { StatTiles } from '../StatTiles';
import { FileText } from 'lucide-react';
import { EmptyState } from '../../EmptyState';
import { ScheduleSummary } from '../../schedule/ScheduleSummary';

afterEach(cleanup);

describe('page visual foundations', () => {
  it('wraps compact schedule groups without truncating dates or frequency', () => {
    render(
      <ScheduleSummary
        startDate="2026-09-07"
        endDate="2026-09-21"
        frequency={{ timesPerDay: 1, timesPerWeek: 3 }}
        showStartInDays={false}
        testIdPrefix="patient-plan"
      />
    );
    const summary = screen.getByTestId('patient-plan-schedule-summary');
    expect(summary).toHaveClass('flex-wrap', 'min-w-0');
    expect(summary.querySelector('.truncate')).toBeNull();
    expect(screen.getByTestId('patient-plan-schedule-dates')).toHaveTextContent('07.09.2026');
    expect(screen.getByTestId('patient-plan-schedule-dates')).toHaveTextContent('21.09.2026');
    expect(summary).toHaveTextContent('3×/tyg');
  });

  it('renders summary values beside muted labels without metric borders and retains keyboard actions', async () => {
    const onClick = vi.fn();
    render(
      <StatTiles
        variant="summary"
        tiles={[
          { id: 'plans', label: 'Active plans', value: 1 },
          { id: 'done', label: 'Completions', value: 0, onClick },
        ]}
      />
    );
    const plans = screen.getByTestId('page-stat-tile-plans');
    expect(plans).toHaveClass('flex', 'flex-wrap', 'items-baseline');
    expect(plans).not.toHaveClass('border-l-2');
    expect(screen.getByText('1')).toHaveClass('font-semibold');
    expect(screen.getByText('Active plans')).toHaveClass('text-muted-foreground');
    expect(plans).not.toHaveAttribute('tabindex');
    const user = userEvent.setup();
    await user.tab();
    expect(screen.getByTestId('page-stat-tile-done')).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('uses a single quiet line in an already labelled section without another icon or heading', async () => {
    const onAction = vi.fn();
    render(
      <EmptyState density="inline" icon={FileText} title="No visit notes" actionLabel="Add note" onAction={onAction} />
    );
    const empty = screen.getByTestId('common-empty-state');
    expect(empty).toHaveClass('py-2', 'text-left');
    expect(empty.querySelector('svg')).toBeNull();
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(screen.getByText('No visit notes')).toHaveClass('text-muted-foreground');
    await userEvent.setup().click(screen.getByTestId('common-empty-state-btn-43'));
    expect(onAction).toHaveBeenCalledOnce();
  });

  it('offers a compact empty state while preserving its action and ID', async () => {
    const action = vi.fn();
    render(
      <EmptyState
        density="compact"
        icon={FileText}
        title="No notes"
        description="Notes appear here"
        actionLabel="Add note"
        onAction={action}
      />
    );
    expect(screen.getByTestId('common-empty-state')).toHaveClass('py-4', 'text-left');
    expect(screen.getByRole('heading', { name: 'No notes' })).toHaveClass('text-sm');
    await userEvent.setup().click(screen.getByTestId('common-empty-state-btn-43'));
    expect(action).toHaveBeenCalledOnce();
  });

  it('renders compact filters with counts and accessible selected state', async () => {
    const onClick = vi.fn();
    render(
      <StatTiles variant="filters" tiles={[{ id: 'my', label: 'My patients', value: 5, active: true, onClick }]} />
    );
    const filter = screen.getByRole('button', { pressed: true });
    expect(filter).toHaveTextContent('My patients');
    expect(filter).toHaveClass('min-h-11');
    expect(filter).not.toHaveClass('border-l-2');
    await userEvent.setup().click(filter);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('offers a compact toolbar action without a tile or heading', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const { rerender } = render(
      <PageHero variant="toolbar" title="Create plan" testId="patient-create" onClick={onClick} />
    );
    const action = screen.getByRole('button', { name: 'Create plan' });
    expect(action).toHaveAttribute('data-testid', 'patient-create');
    expect(action).toHaveClass('min-h-11');
    expect(action).not.toHaveClass('w-full', 'min-h-20');
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    await user.click(action);
    expect(onClick).toHaveBeenCalledTimes(1);
    rerender(<PageHero variant="toolbar" title="Create plan" testId="patient-create" onClick={onClick} disabled />);
    await user.click(action);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('preserves hero click and disabled behavior without animated scaling', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const { rerender } = render(<PageHero title="Create plan" onClick={onClick} />);
    const hero = screen.getByTestId('page-hero');

    await user.click(hero);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(hero.className).not.toMatch(/scale|shadow|gradient|linear-to/);
    expect(hero).toHaveClass('focus-visible:ring-2', 'min-w-0');

    rerender(<PageHero title="Create plan" onClick={onClick} disabled />);
    await user.click(hero);
    expect(hero).toBeDisabled();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('allows long hero and header text to wrap while retaining custom IDs', () => {
    const longTitle = 'LongUnbrokenPlanName'.repeat(8);
    render(
      <>
        <PageHero title={longTitle} description="Plan description" testId="patient-create" />
        <PageHeader
          title={longTitle}
          titleTestId="patient-title"
          actions={<button data-testid="test-action">Action</button>}
        />
      </>
    );

    expect(screen.getByTestId('patient-create')).toHaveTextContent(longTitle);
    expect(screen.getByRole('heading', { level: 3 }).parentElement).toHaveClass(
      'whitespace-normal',
      '[overflow-wrap:anywhere]'
    );
    expect(screen.getByTestId('patient-title')).toHaveClass('tracking-normal', '[overflow-wrap:anywhere]');
    expect(screen.getByTestId('test-action').parentElement).toHaveClass('flex-wrap', 'max-w-full');
  });

  it('keeps stat filters keyboard-operable and static stats out of the tab order', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <StatTiles
        tiles={[
          { id: 'all', label: 'All', value: 12 },
          { id: 'active', label: 'Active', value: 8, active: true, onClick, testId: 'patient-active' },
        ]}
      />
    );

    const staticStat = screen.getByTestId('page-stat-tile-all');
    const filter = screen.getByRole('button', { name: '8 Active', pressed: true });
    expect(staticStat.tagName).toBe('DIV');
    expect(staticStat).not.toHaveAttribute('tabindex');
    expect(filter).toHaveAttribute('data-testid', 'patient-active');
    expect(staticStat.className).not.toMatch(/rounded|bg-card|shadow/);
    await user.tab();
    expect(filter).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
