import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PatientAddedCard } from '../PatientAddedCard';
import type { CardProps } from '../cardProps';

const state = vi.hoisted(() => ({ scanVisit: false, flagKeys: [] as string[] }));
vi.mock('../../ChatSessionContext', () => ({
  useChatActions: () => ({ markChosen: vi.fn(), appendExchange: vi.fn() }),
}));
vi.mock('@/hooks/useMeFeature', () => ({
  useMeFeature: (key: string) => {
    state.flagKeys.push(key);
    return state.scanVisit;
  },
}));

const props: CardProps<'PatientAdded'> = {
  spec: { component: 'PatientAdded', patientId: 'p1', name: 'Anna Nowak' },
  testId: 'added',
  messageId: 'm1',
};

describe('PatientAddedCard: „Skanuj wizytę” za flagą scanVisit', () => {
  beforeEach(() => {
    state.scanVisit = false;
    state.flagKeys = [];
  });

  it('bez flagi nie proponuje skanowania wizyty', () => {
    render(<PatientAddedCard {...props} />);
    expect(screen.queryByRole('button', { name: 'Skanuj wizytę' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Ułóż zestaw' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Później' })).toBeInTheDocument();
    expect(state.flagKeys).toContain('scanVisit');
  });

  it('z flagą proponuje skanowanie wizyty', () => {
    state.scanVisit = true;
    render(<PatientAddedCard {...props} />);
    expect(screen.getByRole('button', { name: 'Skanuj wizytę' })).toBeInTheDocument();
  });

  it('wybór sprzed wyłączenia flagi zostaje widoczny w historii', () => {
    render(<PatientAddedCard {...props} chosen="Skanuj wizytę" />);
    expect(screen.getByRole('button', { name: 'Skanuj wizytę' })).toHaveAttribute('aria-pressed', 'true');
  });
});
