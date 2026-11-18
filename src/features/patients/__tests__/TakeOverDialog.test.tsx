import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TakeOverDialog } from '../TakeOverDialog';
import { PATIENT_UNDER_OTHER_THERAPIST } from '../utils/patientCareAccess';

const mocks = vi.hoisted(() => ({
  takeOver: vi.fn(),
  cache: { evict: vi.fn(), gc: vi.fn() },
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock('@apollo/client/react', () => ({
  useMutation: () => [mocks.takeOver, { loading: false, client: { cache: mocks.cache } }],
}));

vi.mock('sonner', () => ({ toast: { error: mocks.toastError, success: mocks.toastSuccess } }));

const REFUSAL = 'Ten pacjent jest już w gabinecie i prowadzi go inny fizjoterapeuta.';

function refusal() {
  return new CombinedGraphQLErrors({
    errors: [{ message: REFUSAL, extensions: { code: PATIENT_UNDER_OTHER_THERAPIST } }],
  });
}

describe('TakeOverDialog: odmowa „prowadzi go inny fizjoterapeuta”', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it('pokazuje tekst serwera, zamyka dialog i odświeża listy, żeby nieaktualny wiersz zniknął', async () => {
    mocks.takeOver.mockRejectedValue(refusal());
    const onOpenChange = vi.fn();
    render(
      <TakeOverDialog open onOpenChange={onOpenChange} patient={{ id: 'p-1', fullname: 'Jan Test' }} organizationId="org-1" />
    );

    await userEvent.click(screen.getByTestId('patient-takeover-confirm-btn'));

    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith(REFUSAL));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(mocks.cache.evict).toHaveBeenCalledWith({ id: 'ROOT_QUERY', fieldName: 'organizationPatients' });
  });

  it('inny błąd nie odświeża list i zostawia dialog otwarty', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.takeOver.mockRejectedValue(new Error('network'));
    const onOpenChange = vi.fn();
    render(
      <TakeOverDialog open onOpenChange={onOpenChange} patient={{ id: 'p-1', fullname: 'Jan Test' }} organizationId="org-1" />
    );

    await userEvent.click(screen.getByTestId('patient-takeover-confirm-btn'));

    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith('Wystąpił błąd podczas przejmowania pacjenta'));
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(mocks.cache.evict).not.toHaveBeenCalled();
  });
});
