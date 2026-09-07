import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { VisitPanel } from './VisitPanel';
import { visitRequest } from './visitService';
vi.mock('./visitService', () => ({ visitRequest: vi.fn() }));
vi.mock('./useVisitListening', () => ({ useVisitListening: () => ({
  supported: true, state: 'paused', transcript: 'Pacjent zgłasza ból kolana od poniedziałku.',
  setTranscript: vi.fn(), interim: '', error: null, seconds: 0, start: vi.fn(), pause: vi.fn(),
}) }));
const draft = { note: { subjective: 'Ból kolana', objective: '', assessment: '', plan: '' },
  instructions: [], evidence: [{ section: 'subjective', sourceQuote: 'ból kolana' }],
  exercises: [{ exerciseId: 'e1', name: 'Przysiad', sets: 2, reps: 8, duration: null, frequency: null, sourceQuote: 'dwie serie po osiem' }],
  missingInformation: [], requiresReview: true };
beforeEach(() => vi.clearAllMocks());
it('requires review, freezes payload after uncertain save and retries the same request ID', async () => {
  vi.mocked(visitRequest).mockResolvedValueOnce(draft).mockRejectedValueOnce(new Error('Przerwane połączenie')).mockResolvedValueOnce({ noteId: 'n1' });
  const onPlan = vi.fn();
  render(<VisitPanel patientId="p1" organizationId="o1" onPlan={onPlan} />);
  fireEvent.click(screen.getByTestId('visit-generate'));
  await screen.findByTestId('visit-save');
  expect(screen.getByTestId('visit-save')).toBeDisabled();
  fireEvent.click(screen.getByTestId('visit-reviewed'));
  fireEvent.click(screen.getByTestId('visit-save'));
  await screen.findByText('Przerwane połączenie');
  expect(screen.getByTestId('visit-subjective')).toBeDisabled();
  fireEvent.click(screen.getByTestId('visit-save'));
  await waitFor(() => expect(screen.getByTestId('visit-save')).toHaveTextContent('Notatka zapisana'));
  expect(vi.mocked(visitRequest).mock.calls[1][1]).toEqual(vi.mocked(visitRequest).mock.calls[2][1]);
  fireEvent.click(screen.getByTestId('visit-assign-plan'));
  expect(onPlan).toHaveBeenCalledWith(draft.exercises);
});
it('does not hand off unresolved parameters', async () => {
  vi.mocked(visitRequest).mockResolvedValueOnce({ ...draft, exercises: [{ ...draft.exercises[0], sets: null }] }).mockResolvedValueOnce({ noteId: 'n1' });
  render(<VisitPanel patientId="p1" organizationId="o1" onPlan={vi.fn()} />);
  fireEvent.click(screen.getByTestId('visit-generate'));
  await screen.findByTestId('visit-save');
  fireEvent.click(screen.getByTestId('visit-reviewed'));
  fireEvent.click(screen.getByTestId('visit-save'));
  await waitFor(() => expect(screen.getByTestId('visit-save')).toHaveTextContent('Notatka zapisana'));
  expect(screen.getByTestId('visit-assign-plan')).toBeDisabled();
});
