import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../tabs';

afterEach(cleanup);

describe('workspace tabs', () => {
  it('supports keyboard navigation without removing a force-mounted draft', async () => {
    const user = userEvent.setup();
    render(
      <Tabs defaultValue="overview">
        <TabsList variant="underline" aria-label="Patient workspace">
          <TabsTrigger data-testid="test-overview" value="overview" activeVariant="underline">
            Overview
          </TabsTrigger>
          <TabsTrigger data-testid="test-visit" value="visit" activeVariant="underline">
            Visit
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview" forceMount className="data-[state=inactive]:hidden">
          Overview content
        </TabsContent>
        <TabsContent value="visit" forceMount className="data-[state=inactive]:hidden">
          <input data-testid="test-draft" aria-label="Draft" defaultValue="Unsaved draft" />
        </TabsContent>
      </Tabs>
    );
    const overview = screen.getByRole('tab', { name: 'Overview' });
    const visit = screen.getByRole('tab', { name: 'Visit' });
    await user.click(overview);
    await user.keyboard('{ArrowRight}');
    expect(visit).toHaveFocus();
    expect(visit).toHaveAttribute('aria-selected', 'true');
    expect(visit).toHaveClass('min-h-11', 'border-b-2');
    const draft = screen.getByRole('textbox', { name: 'Draft' });
    await user.type(draft, ' retained');
    await user.click(overview);
    expect(draft).toBeInTheDocument();
    expect(draft.closest('[role="tabpanel"]')).toHaveAttribute('data-state', 'inactive');
    await user.click(visit);
    expect(screen.getByRole('textbox', { name: 'Draft' })).toBe(draft);
    expect(draft).toHaveValue('Unsaved draft retained');
  });
});
