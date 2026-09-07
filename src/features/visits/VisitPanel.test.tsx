import { StrictMode, useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { VisitPanel } from './VisitPanel';
import { useVisitListening } from './useVisitListening';
import { visitRequest } from './visitService';
vi.mock('./visitService', () => ({ visitRequest: vi.fn() }));
vi.mock('./useVisitListening', () => ({ useVisitListening: vi.fn() }));
const draft = {
  note: { subjective: 'Ból kolana', objective: '', assessment: '', plan: '' },
  instructions: [],
  evidence: [{ section: 'subjective', sourceQuote: 'ból kolana' }],
  exercises: [
    {
      exerciseId: 'e1',
      name: 'Przysiad',
      sets: 2,
      reps: 8,
      duration: null,
      frequency: null,
      sourceQuote: 'dwie serie po osiem',
    },
  ],
  missingInformation: [],
  requiresReview: true,
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(useVisitListening).mockReturnValue({
    supported: true,
    state: 'paused',
    transcript: 'Pacjent zgłasza ból kolana od poniedziałku.',
    setTranscript: vi.fn(),
    interim: '',
    error: null,
    seconds: 0,
    start: vi.fn(),
    pause: vi.fn(),
  });
});

it.each([
  ['idle', false],
  ['starting', true],
  ['listening', true],
  ['stopping', true],
  ['paused', false],
] as const)('reports %s as listening=%s without starting capture', (state, expected) => {
  const capture = useVisitListening();
  vi.mocked(useVisitListening).mockReturnValue({ ...capture, state });
  const onListeningChange = vi.fn();
  render(<VisitPanel patientId="p1" organizationId="o1" onPlan={vi.fn()} onListeningChange={onListeningChange} />);
  expect(onListeningChange.mock.calls).toEqual([[expected]]);
  expect(capture.start).not.toHaveBeenCalled();
});

it('reports only boolean transitions, stays active while stopping, and clears on unmount', () => {
  const capture = useVisitListening();
  const onListeningChange = vi.fn();
  const onPlan = vi.fn();
  const { rerender, unmount } = render(
    <VisitPanel patientId="p1" organizationId="o1" onPlan={onPlan} onListeningChange={onListeningChange} />
  );
  for (const state of ['starting', 'listening', 'stopping', 'paused', 'starting'] as const) {
    vi.mocked(useVisitListening).mockReturnValue({ ...capture, state });
    rerender(<VisitPanel patientId="p1" organizationId="o1" onPlan={onPlan} onListeningChange={onListeningChange} />);
  }
  expect(onListeningChange.mock.calls).toEqual([[false], [true], [false], [true]]);
  unmount();
  expect(onListeningChange.mock.calls).toEqual([[false], [true], [false], [true], [false]]);
  expect(capture.start).not.toHaveBeenCalled();
  expect(capture.pause).not.toHaveBeenCalled();
});

it('can update listening state and unmount without a callback', () => {
  const capture = useVisitListening();
  const onPlan = vi.fn();
  const { rerender, unmount } = render(<VisitPanel patientId="p1" organizationId="o1" onPlan={onPlan} />);
  vi.mocked(useVisitListening).mockReturnValue({ ...capture, state: 'listening' });
  rerender(<VisitPanel patientId="p1" organizationId="o1" onPlan={onPlan} />);
  expect(screen.getByTestId('visit-start')).toBeDisabled();
  expect(() => unmount()).not.toThrow();
  expect(capture.start).not.toHaveBeenCalled();
});

it('clears a replaced callback and reports the current state to the new callback', () => {
  vi.mocked(useVisitListening).mockReturnValue({ ...useVisitListening(), state: 'listening' });
  const previousCallback = vi.fn();
  const nextCallback = vi.fn();
  const onPlan = vi.fn();
  const { rerender, unmount } = render(
    <VisitPanel patientId="p1" organizationId="o1" onPlan={onPlan} onListeningChange={previousCallback} />
  );
  rerender(<VisitPanel patientId="p1" organizationId="o1" onPlan={onPlan} onListeningChange={nextCallback} />);
  expect(previousCallback.mock.calls).toEqual([[true], [false]]);
  expect(nextCallback.mock.calls).toEqual([[true]]);
  unmount();
  expect(previousCallback.mock.calls).toEqual([[true], [false]]);
  expect(nextCallback.mock.calls).toEqual([[true], [false]]);
});

it('leaves the correct status after StrictMode effect replay without starting recording', () => {
  const capture = useVisitListening();
  vi.mocked(useVisitListening).mockReturnValue({ ...capture, state: 'listening' });
  const onListeningChange = vi.fn();
  const { unmount } = render(
    <StrictMode>
      <VisitPanel patientId="p1" organizationId="o1" onPlan={vi.fn()} onListeningChange={onListeningChange} />
    </StrictMode>
  );
  expect(onListeningChange).toHaveBeenLastCalledWith(true);
  expect(capture.start).not.toHaveBeenCalled();
  unmount();
  expect(onListeningChange).toHaveBeenLastCalledWith(false);
});

it('requires consent and a separate explicit click to start or resume listening', () => {
  const capture = useVisitListening();
  render(<VisitPanel patientId="p1" organizationId="o1" onPlan={vi.fn()} />);
  expect(screen.getByTestId('visit-consent')).not.toBeChecked();
  fireEvent.click(screen.getByTestId('visit-start'));
  expect(capture.start).not.toHaveBeenCalled();
  fireEvent.click(screen.getByLabelText('Uczestnicy wiedzą o słuchaniu i zgodzili się na nie.'));
  expect(capture.start).not.toHaveBeenCalled();
  expect(screen.getByTestId('visit-start')).toBeEnabled();
  fireEvent.click(screen.getByTestId('visit-start'));
  expect(capture.start).toHaveBeenCalledTimes(1);
  expect(visitRequest).not.toHaveBeenCalled();
});

it.each(['starting', 'listening', 'stopping'] as const)(
  'preserves capture gates and pause behavior during %s',
  (state) => {
    const capture = useVisitListening();
    vi.mocked(useVisitListening).mockReturnValue({ ...capture, state, seconds: 65, interim: 'Fragment rozmowy' });
    render(<VisitPanel patientId="p1" organizationId="o1" onPlan={vi.fn()} />);
    for (const testId of ['visit-consent', 'visit-start', 'visit-transcript', 'visit-generate']) {
      expect(screen.getByTestId(testId)).toBeDisabled();
    }
    expect(screen.getByRole('timer', { name: 'Czas słuchania' })).toHaveTextContent('1:05');
    expect(screen.getByRole('status')).toHaveTextContent(/słuchani/i);
    expect(screen.getByText('Fragment rozmowy')).toBeInTheDocument();
    if (state === 'stopping') {
      expect(screen.getByTestId('visit-pause')).toBeDisabled();
    } else {
      expect(screen.getByTestId('visit-pause')).toBeEnabled();
      fireEvent.click(screen.getByTestId('visit-pause'));
      expect(capture.pause).toHaveBeenCalledTimes(1);
    }
    expect(capture.start).not.toHaveBeenCalled();
    expect(visitRequest).not.toHaveBeenCalled();
  }
);

it('keeps manual transcription available without browser support and shows provider/privacy disclosures', () => {
  const capture = useVisitListening();
  vi.mocked(useVisitListening).mockReturnValue({ ...capture, supported: false, error: 'Sprawdź mikrofon.' });
  render(<VisitPanel patientId="p1" organizationId="o1" onPlan={vi.fn()} />);
  fireEvent.click(screen.getByTestId('visit-consent'));
  expect(screen.getByTestId('visit-start')).toBeDisabled();
  expect(screen.getByText(/Testuj na rozmowach syntetycznych/)).toHaveTextContent(
    'Rozpoznawanie mowy może korzystać z usługi dostawcy przeglądarki.'
  );
  expect(screen.getByText(/Tekst pozostaje w pamięci tej karty/)).toHaveTextContent(
    'Odświeżenie lub opuszczenie pacjenta go usuwa.'
  );
  expect(screen.getByText(/Brak obsługi mikrofonu/)).toBeInTheDocument();
  expect(screen.getByRole('alert')).toHaveTextContent('Sprawdź mikrofon.');
  expect(screen.getByLabelText('Transkrypt')).toBeEnabled();
  fireEvent.change(screen.getByLabelText('Transkrypt'), {
    target: { value: 'Ręcznie wpisany transkrypt syntetyczny.' },
  });
  expect(capture.setTranscript).toHaveBeenCalledWith('Ręcznie wpisany transkrypt syntetyczny.');
  expect(capture.start).not.toHaveBeenCalled();
});

it.each([
  ['empty', '', false],
  ['whitespace', ' '.repeat(20), false],
  ['too short', 'tekst'.repeat(3), false],
  ['minimum', 'tekst'.repeat(4), true],
  ['maximum', 'tekst'.repeat(8000), true],
  ['too long', 'tekst'.repeat(8001), false],
])('preserves the transcript length gate for %s input', (_label, transcript, enabled) => {
  vi.mocked(useVisitListening).mockReturnValue({ ...useVisitListening(), transcript: String(transcript) });
  render(<VisitPanel patientId="p1" organizationId="o1" onPlan={vi.fn()} />);
  expect(screen.getByTestId('visit-generate')).toHaveProperty('disabled', !enabled);
  expect(screen.getByTestId('visit-transcript')).toHaveAttribute('maxlength', '40000');
});

it.each(['subjective', 'objective', 'assessment', 'plan', 'instructions'])(
  'requires another review after editing %s',
  async (section) => {
    vi.mocked(visitRequest).mockResolvedValueOnce(draft);
    render(<VisitPanel patientId="p1" organizationId="o1" onPlan={vi.fn()} />);
    fireEvent.click(screen.getByTestId('visit-generate'));
    await screen.findByTestId('visit-save');
    fireEvent.click(screen.getByTestId('visit-reviewed'));
    expect(screen.getByTestId('visit-save')).toBeEnabled();
    fireEvent.change(screen.getByTestId(`visit-${section}`), { target: { value: 'Sprawdzona treść' } });
    expect(screen.getByTestId('visit-reviewed')).not.toBeChecked();
    expect(screen.getByTestId('visit-save')).toBeDisabled();
    expect(screen.getByTestId('visit-assign-plan')).toBeDisabled();
    expect(visitRequest).toHaveBeenCalledTimes(1);
  }
);

it('works with a stable state setter and preserves edited draft and review in an inactive hidden tab', async () => {
  const capture = useVisitListening();
  const onPlan = vi.fn();
  function TestHost({ hidden }: { hidden: boolean }) {
    const [listening, setListening] = useState(false);
    return (
      <>
        <output aria-label="Status poza zakładką">{String(listening)}</output>
        <div hidden={hidden}>
          <VisitPanel patientId="p1" organizationId="o1" onPlan={onPlan} onListeningChange={setListening} />
        </div>
      </>
    );
  }
  const { rerender } = render(<TestHost hidden={false} />);
  vi.mocked(useVisitListening).mockReturnValue({ ...capture, state: 'listening' });
  rerender(<TestHost hidden />);
  expect(screen.getByLabelText('Status poza zakładką')).toHaveTextContent('true');
  expect(screen.getByTestId('visit-transcript')).not.toBeVisible();
  vi.mocked(useVisitListening).mockReturnValue(capture);
  rerender(<TestHost hidden={false} />);
  expect(screen.getByLabelText('Status poza zakładką')).toHaveTextContent('false');
  expect(screen.getByTestId('visit-transcript')).toHaveValue(capture.transcript);
  vi.mocked(visitRequest).mockResolvedValueOnce(draft);
  fireEvent.click(screen.getByTestId('visit-generate'));
  await screen.findByTestId('visit-save');
  fireEvent.change(screen.getByTestId('visit-subjective'), { target: { value: 'Zachowany wywiad' } });
  fireEvent.change(screen.getByTestId('visit-instructions'), { target: { value: 'Zachowane zalecenia' } });
  fireEvent.click(screen.getByTestId('visit-reviewed'));
  rerender(<TestHost hidden />);
  expect(screen.getByTestId('visit-subjective')).not.toBeVisible();
  rerender(<TestHost hidden={false} />);
  expect(screen.getByTestId('visit-subjective')).toHaveValue('Zachowany wywiad');
  expect(screen.getByTestId('visit-instructions')).toHaveValue('Zachowane zalecenia');
  expect(screen.getByTestId('visit-reviewed')).toBeChecked();
  expect(screen.getByTestId('visit-save')).toBeEnabled();
  expect(capture.start).not.toHaveBeenCalled();
  expect(visitRequest).toHaveBeenCalledTimes(1);
});

it('requires review, freezes payload after uncertain save and retries the same request ID', async () => {
  vi.mocked(visitRequest)
    .mockResolvedValueOnce(draft)
    .mockRejectedValueOnce(new Error('Przerwane połączenie'))
    .mockResolvedValueOnce({ noteId: 'n1' });
  const onPlan = vi.fn();
  const onSaved = vi.fn();
  render(<VisitPanel patientId="p1" organizationId="o1" onPlan={onPlan} onSaved={onSaved} />);
  fireEvent.click(screen.getByTestId('visit-generate'));
  await screen.findByTestId('visit-save');
  expect(vi.mocked(visitRequest).mock.calls[0]).toEqual([
    'visit-draft',
    { patientId: 'p1', organizationId: 'o1', transcript: useVisitListening().transcript },
    expect.any(AbortSignal),
  ]);
  expect(screen.getByTestId('visit-save')).toBeDisabled();
  expect(screen.getByText(/Szkic wymaga sprawdzenia z rozmową/)).toHaveTextContent(
    'Cytat potwierdza źródło tekstu, nie gwarantuje poprawności interpretacji AI.'
  );
  expect(screen.getByTestId('visit-source-subjective').parentElement).toHaveTextContent('ból kolana');
  fireEvent.change(screen.getByTestId('visit-instructions'), { target: { value: 'Zalecenia po sprawdzeniu' } });
  fireEvent.click(screen.getByTestId('visit-reviewed'));
  fireEvent.click(screen.getByTestId('visit-save'));
  await screen.findByText('Przerwane połączenie');
  for (const testId of [
    'visit-subjective',
    'visit-objective',
    'visit-assessment',
    'visit-plan',
    'visit-instructions',
    'visit-reviewed',
    'visit-assign-plan',
  ]) {
    expect(screen.getByTestId(testId)).toBeDisabled();
  }
  expect(onSaved).not.toHaveBeenCalled();
  fireEvent.click(screen.getByTestId('visit-save'));
  await waitFor(() => expect(screen.getByTestId('visit-save')).toHaveTextContent('Notatka zapisana'));
  expect(vi.mocked(visitRequest).mock.calls[1][1]).toEqual(vi.mocked(visitRequest).mock.calls[2][1]);
  expect(vi.mocked(visitRequest).mock.calls[2]).toEqual([
    'visit-note',
    {
      patientId: 'p1',
      organizationId: 'o1',
      requestId: expect.any(String),
      note: draft.note,
      instructions: 'Zalecenia po sprawdzeniu',
    },
    expect.any(AbortSignal),
  ]);
  expect(screen.getByText(/Notatka zapisana jako edytowalny szkic/)).toHaveTextContent(
    'Plan wymaga osobnego sprawdzenia stron ciała, parametrów, harmonogramu i potwierdzenia w formularzu przypisania.'
  );
  expect(screen.getByTestId('visit-save')).toBeDisabled();
  expect(onSaved).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByTestId('visit-assign-plan'));
  expect(onPlan).toHaveBeenCalledWith(draft.exercises);
});
it('does not hand off unresolved parameters', async () => {
  vi.mocked(visitRequest)
    .mockResolvedValueOnce({ ...draft, exercises: [{ ...draft.exercises[0], sets: null }] })
    .mockResolvedValueOnce({ noteId: 'n1' });
  render(<VisitPanel patientId="p1" organizationId="o1" onPlan={vi.fn()} />);
  fireEvent.click(screen.getByTestId('visit-generate'));
  await screen.findByTestId('visit-save');
  fireEvent.click(screen.getByTestId('visit-reviewed'));
  fireEvent.click(screen.getByTestId('visit-save'));
  await waitFor(() => expect(screen.getByTestId('visit-save')).toHaveTextContent('Notatka zapisana'));
  expect(screen.getByTestId('visit-assign-plan')).toBeDisabled();
  expect(screen.getByText(/Niepełne lub nierozpoznane ćwiczenia/)).toHaveTextContent(
    'Nie wstawiamy brakujących parametrów.'
  );
});
