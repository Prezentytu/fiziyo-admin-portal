import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { StageIssue } from '@/features/verification/utils/verificationStages';

import { ContentGapsNotice } from './ContentGapsNotice';

const gaps: StageIssue[] = [
  { stage: 'material', text: 'Dodaj zdjęcie albo wideo' },
  { stage: 'instruction', text: 'Dodaj opis dla pacjenta' },
];

describe('ContentGapsNotice', () => {
  afterEach(cleanup);

  it('każdy brak włącza edycję, gdy ćwiczenie da się edytować', async () => {
    const onFix = vi.fn();
    render(<ContentGapsNotice gaps={gaps} onFix={onFix} />);

    await userEvent.click(screen.getByRole('button', { name: 'Dodaj opis dla pacjenta' }));

    expect(onFix).toHaveBeenCalledTimes(1);
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  it('bez edycji braki zostają tekstem', () => {
    render(<ContentGapsNotice gaps={gaps} />);

    expect(screen.getByTestId('exercise-detail-content-gaps')).toHaveTextContent('Dodaj zdjęcie albo wideo');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('nic nie renderuje bez braków', () => {
    const { container } = render(<ContentGapsNotice gaps={[]} onFix={vi.fn()} />);

    expect(container).toBeEmptyDOMElement();
  });
});
