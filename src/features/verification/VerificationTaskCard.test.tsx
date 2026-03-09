import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { VerificationTaskCard } from './VerificationTaskCard';
import type { AdminExercise } from '@/graphql/types/adminExercise.types';

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

vi.mock('next/image', () => ({
  default: ({ alt }: { alt?: string }) => <img alt={alt ?? ''} />,
}));

const baseExercise: AdminExercise = {
  id: 'exercise-1',
  name: 'Przysiad przy ścianie',
  type: 'REPS',
  isActive: true,
  status: 'PENDING_REVIEW',
  hasOpenReport: true,
  openReportCount: 3,
  latestReport: {
    reasonCategory: 'BLEDNA_TECHNIKA',
    description: 'Opis wymaga doprecyzowania toru ruchu.',
    createdAt: '2026-03-08T10:00:00.000Z',
    routingTarget: 'PENDING_REVIEW',
  },
};

describe('VerificationTaskCard', () => {
  it('pokazuje badge zgłoszeń i kontekst reportu', () => {
    render(<VerificationTaskCard exercise={baseExercise} />);

    expect(screen.getByTestId('verification-card-exercise-1-reported-badge')).toHaveTextContent('Zgłoszenia (3)');
    expect(screen.getByTestId('verification-card-exercise-1-report-context')).toBeInTheDocument();
  });
});
