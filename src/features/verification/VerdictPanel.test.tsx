import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { VerdictPanel } from './VerdictPanel';

function createBaseProps() {
  return {
    status: 'PENDING_REVIEW',
    onApprove: vi.fn(),
    onRequestChanges: vi.fn(),
    onReject: vi.fn(),
    onSkip: vi.fn(),
    comment: '',
    onCommentChange: vi.fn(),
    validationPassed: true,
    missingFields: [],
    safetyChecklist: {
      videoReadable: true,
      techniqueSafe: true,
      noContraindications: true,
    },
    onSafetyChecklistChange: vi.fn(),
    remainingCount: 4,
  };
}

describe('VerdictPanel', () => {
  it('pokazuje kontekst zgłoszenia oraz akcję pomijania z liczbą pozostałych', () => {
    const props = createBaseProps();

    render(
      <VerdictPanel
        {...props}
        reportContext={{
          count: 2,
          reasonCategory: 'Błąd w nazwie',
          description: 'Nazwa nie jest zgodna ze standardem.',
          createdAt: '2026-03-08T10:00:00.000Z',
          routingTarget: 'PENDING_REVIEW',
        }}
      />
    );

    expect(screen.getByTestId('verification-report-context')).toHaveTextContent('Zgłoszone (2)');
    expect(screen.getByTestId('verdict-skip-btn')).toHaveTextContent('Pozostało do weryfikacji 4');
  });

  it('blokuje zatwierdzenie, gdy checklista nie jest kompletna', () => {
    const props = createBaseProps();

    render(
      <VerdictPanel
        {...props}
        safetyChecklist={{
          videoReadable: true,
          techniqueSafe: false,
          noContraindications: true,
        }}
      />
    );

    expect(screen.getByTestId('verdict-approve-btn')).toBeDisabled();
  });
});
