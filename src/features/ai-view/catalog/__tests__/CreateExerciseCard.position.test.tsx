import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CreateExerciseCard } from '../CreateExerciseCard';

const sendMessage = vi.hoisted(() => vi.fn());
const markChosen = vi.hoisted(() => vi.fn());
const create = vi.hoisted(() => vi.fn());
const appendAssistant = vi.hoisted(() => vi.fn());
const busy = vi.hoisted(() => ({ value: false }));

vi.mock('../../ChatSessionContext', () => ({
  useChatActions: () => ({
    organizationId: 'org-1',
    contextPatient: null,
    appendAssistant,
    markChosen,
    sendMessage,
  }),
  useChatBusy: () => busy.value,
}));
vi.mock('../../useChatMode', () => ({ useChatMode: () => ({ preference: { useAi: true } }) }));
vi.mock('../useChatWrites', () => ({ useCreateExercise: () => ({ create, creating: false }) }));

const SPEC = {
  component: 'CreateExercise' as const,
  name: 'Odwodzenie nogi do tyłu w leżeniu przodem',
  description: 'Połóż się na brzuchu i unieś prostą nogę.',
};

/** BW-FZ-113: asystent przyjął pozycję wyjściową; inna pozycja to jedno kliknięcie, bez pisania. */
describe('karta nowego ćwiczenia: inna pozycja wyjściowa', () => {
  beforeEach(() => {
    sendMessage.mockClear();
    markChosen.mockClear();
    busy.value = false;
  });

  it('klik w inną pozycję wysyła ją jako wiadomość, a karta zostaje do użycia', () => {
    render(
      <CreateExerciseCard
        spec={{ ...SPEC, positionOptions: ['W staniu', 'W klęku podpartym'] }}
        testId="card"
        messageId="m1"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'W klęku podpartym' }));

    expect(sendMessage).toHaveBeenCalledExactlyOnceWith('W klęku podpartym');
    // Karta nie jest „zużyta”: fizjoterapeuta może jednak zostać przy przyjętej pozycji.
    expect(markChosen).not.toHaveBeenCalled();
    expect(screen.getByTestId('card-name-input')).toHaveValue(SPEC.name);
    // Odpowiedzi są jednorazowe.
    expect(screen.getByRole('button', { name: 'W staniu' })).toBeDisabled();
  });

  it('o zestaw pyta dopiero po udanym zapisie pojedynczego ćwiczenia', async () => {
    create.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'saved-id', name: SPEC.name });
    const draft = { exerciseIds: ['old-id'] };
    render(<CreateExerciseCard spec={{ ...SPEC, offerForSet: draft }} testId="card" messageId="m1" />);
    fireEvent.click(screen.getByTestId('card-manual-btn'));
    const save = screen.getByRole('button', { name: 'Utwórz ćwiczenie' });
    fireEvent.click(save);
    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(appendAssistant).not.toHaveBeenCalled();
    fireEvent.click(save);
    await waitFor(() =>
      expect(appendAssistant).toHaveBeenCalledExactlyOnceWith({
        spec: { component: 'ExerciseCreated', exerciseId: 'saved-id', name: SPEC.name, addToSet: draft },
      })
    );
  });

  it('bez przyjętej pozycji karta nie pokazuje szybkich odpowiedzi', () => {
    render(<CreateExerciseCard spec={SPEC} testId="card" messageId="m1" />);

    expect(screen.queryByTestId('card-position')).toBeNull();
    expect(screen.queryByRole('group', { name: 'Szybkie odpowiedzi' })).toBeNull();
  });

  it('w trakcie odpowiedzi asystenta pozycji nie da się kliknąć', () => {
    busy.value = true;
    render(<CreateExerciseCard spec={{ ...SPEC, positionOptions: ['W staniu'] }} testId="card" messageId="m1" />);

    expect(screen.getByRole('button', { name: 'W staniu' })).toBeDisabled();
  });
});
