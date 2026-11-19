import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { WhatsNewDot } from '../WhatsNewDot';

vi.mock('../useReleaseNotes', () => ({
  useUnseenReleaseNote: () => ({ id: 'note-1' }),
}));

afterEach(cleanup);

describe('WhatsNewDot', () => {
  it('does not change the accessible name of the link it sits in', () => {
    render(
      <a href="/settings">
        <span>Ustawienia</span>
        <WhatsNewDot testId="dot" />
      </a>
    );

    expect(screen.getByTestId('dot')).toBeTruthy();
    expect(screen.getByRole('link', { name: /^Ustawienia$/ })).toBeTruthy();
  });
});
