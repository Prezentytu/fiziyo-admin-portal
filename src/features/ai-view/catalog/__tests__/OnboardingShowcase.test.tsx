import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OnboardingShowcase } from '../OnboardingShowcase';

const sessionState = vi.hoisted(() => ({
  patients: [] as Array<{ id: string; name: string }>,
  appendExchange: vi.fn(),
  exercises: [
    { id: 'ex-1', name: 'Mostek biodrowy' },
    { id: 'ex-2', name: 'Koci grzbiet' },
    { id: 'ex-3', name: 'Oddech przeponowy' },
  ],
}));

vi.mock('../../ChatSessionContext', () => ({
  useChatSession: () => ({
    organizationId: 'org-1',
    patients: sessionState.patients,
    appendExchange: sessionState.appendExchange,
  }),
}));

vi.mock('../../useAvailableExercises', () => ({
  useAvailableExercises: () => ({
    exercises: sessionState.exercises,
    loading: false,
  }),
}));

describe('SPEC-073: OnboardingShowcase (pierwszy kontakt WOW i tryb demo)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    sessionState.appendExchange.mockReset();
    sessionState.patients = [];
  });

  it('wyświetla 4 karty startowe, zapamiętuje zwinięcie w localStorage i pozwala je przywrócić', () => {
    const onSend = vi.fn();
    const { unmount } = render(<OnboardingShowcase disabled={false} onSend={onSend} />);

    expect(screen.getByTestId('chat-onboarding-showcase')).toBeInTheDocument();
    expect(screen.getByTestId('chat-starter-card-between-visits')).toBeInTheDocument();
    expect(screen.getByTestId('chat-starter-card-dictate-notes')).toBeInTheDocument();
    expect(screen.getByTestId('chat-starter-card-visit-briefing')).toHaveTextContent('Dodaj pierwszego pacjenta');
    expect(screen.getByTestId('chat-starter-card-clinic-template')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('chat-hide-onboarding-btn'));
    expect(screen.queryByTestId('chat-onboarding-showcase')).toBeNull();
    expect(window.localStorage.getItem('fiziyo:chat-onboarding-hidden')).toBe('1');
    unmount();

    // Po ponownym zamontowaniu stan zwinięcia zostaje zachowany, a przycisk pozwala wrócić.
    render(<OnboardingShowcase disabled={false} onSend={onSend} />);
    expect(screen.queryByTestId('chat-onboarding-showcase')).toBeNull();
    fireEvent.click(screen.getByTestId('chat-show-onboarding-btn'));
    expect(screen.getByTestId('chat-onboarding-showcase')).toBeInTheDocument();
  });

  it('kliknięcie karty wysyła gotowy prompt, a dla konta z pacjentami pokazuje Odprawę przed wizytą', () => {
    sessionState.patients = [{ id: 'p1', name: 'Jan Kowalski' }];
    const onSend = vi.fn();
    render(<OnboardingShowcase disabled={false} onSend={onSend} />);

    fireEvent.click(screen.getByTestId('chat-starter-card-between-visits'));
    expect(onSend).toHaveBeenCalledWith(expect.stringContaining('10-minutowy zestaw'));

    fireEvent.click(screen.getByTestId('chat-starter-card-visit-briefing'));
    expect(onSend).toHaveBeenCalledWith(expect.stringContaining('kto z moich pacjentów nie ćwiczy'));
  });

  it('przycisk „Wypróbuj na próbce” otwiera bezpieczny szkic bez pacjenta i bez zapisu, a „Przegląd funkcji” otwiera CapabilitiesOverviewCard', () => {
    render(<OnboardingShowcase disabled={false} onSend={vi.fn()} />);

    fireEvent.click(screen.getByTestId('chat-try-safe-demo-btn'));
    expect(sessionState.appendExchange).toHaveBeenCalledWith(
      'Wypróbuj na próbce (nic nie zapisuje)',
      expect.objectContaining({
        text: expect.stringContaining('bezpieczny szkic testowy'),
        spec: expect.objectContaining({
          component: 'SetDraft',
          exerciseIds: ['ex-1', 'ex-2', 'ex-3'],
        }),
      })
    );

    fireEvent.click(screen.getByTestId('chat-open-capabilities-btn'));
    expect(sessionState.appendExchange).toHaveBeenCalledWith('Co potrafi Fizjoasystent?', {
      spec: { component: 'ProductHelp', topic: 'capabilities-overview' },
    });
  });
});
