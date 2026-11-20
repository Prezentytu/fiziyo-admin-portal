import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ExerciseDependencyDialog } from './ExerciseDependencyDialog';
import type { DependencyPosition } from '../utils/exerciseDependencies';

const LONG_NAME = 'Zginanie czubka palca z przytrzymaniem palca drugą ręką (zginanie w ostatnim stawie)';

const position = (id: string, order: number, extra: Partial<DependencyPosition> = {}): DependencyPosition => ({
  id,
  order,
  name: `${LONG_NAME} ${id}`,
  isWarmup: false,
  requiresMappingIds: [],
  dependencyMode: 'block',
  ...extra,
});

/**
 * Test na żywo 20.11 (PR #321): długa nazwa rozpychała okno w poziomie, „Zapisz” wychodził poza okno. Happy-dom nie
 * liczy układu, więc pilnujemy warunków, które go trzymają: kolumna siatki może się kurczyć, nazwa zawija się w 2
 * linie i ma pełny tekst w `title`.
 */
describe('ExerciseDependencyDialog – długie nazwy', () => {
  const positions = [position('a', 0), position('b', 1, { requiresMappingIds: ['a'] }), position('c', 2)];

  const renderDialog = () =>
    render(
      <ExerciseDependencyDialog
        target={positions[1]}
        positions={positions}
        saving={false}
        onClose={vi.fn()}
        onSave={vi.fn().mockResolvedValue(true)}
      />
    );

  it('keeps the „Kolejność” dialog from growing wider than the screen', () => {
    renderDialog();
    expect(screen.getByTestId('set-dependency-dialog').className).toContain('grid-cols-[minmax(0,1fr)]');
    const name = screen.getByTestId('set-dependency-requires-name-a');
    expect(name.className).toEqual(expect.stringContaining('min-w-0'));
    expect(name.className).toEqual(expect.stringContaining('line-clamp-2'));
    expect(name).toHaveAttribute('title', `${LONG_NAME} a`);
    const title = screen.getByRole('heading', { name: `Kolejność: ${LONG_NAME} b` });
    expect(title.className).toEqual(expect.stringContaining('line-clamp-2'));
    expect(title).toHaveAttribute('title', `${LONG_NAME} b`);
  });

  it('wraps long names in „Co musi być przed?” instead of scrolling sideways', () => {
    renderDialog();
    fireEvent.click(screen.getByTestId('set-dependency-add-requirement-btn'));
    expect(screen.getByTestId('set-dependency-picker-dialog').className).toContain('grid-cols-[minmax(0,1fr)]');
    expect(screen.getByTestId('set-dependency-picker-list').className).toContain('overflow-x-hidden');
    const later = screen.getByTestId('set-dependency-picker-name-c');
    expect(later.className).toEqual(expect.stringContaining('line-clamp-2'));
    expect(later).toHaveAttribute('title', `${LONG_NAME} c`);
    expect(later.closest('label')?.className).toEqual(expect.stringContaining('min-w-0'));
  });
});
