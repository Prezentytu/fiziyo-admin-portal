import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PatientVisibilitySettings } from './PatientVisibilitySettings';

const mutateMock = vi.fn();
const toastError = vi.fn();
const toastSuccess = vi.fn();
let mutationOptions: { update?: (cache: unknown, result: { data?: unknown }) => void } | undefined;

vi.mock('@apollo/client/react', () => ({
  useMutation: (_document: unknown, options: typeof mutationOptions) => {
    mutationOptions = options;
    return [mutateMock, { loading: false }] as const;
  },
}));

vi.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => toastError(...args),
    success: (...args: unknown[]) => toastSuccess(...args),
  },
}));

const SWITCH = 'org-patient-visibility-switch';

describe('PatientVisibilitySettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('is read-only for a role that cannot edit and sends nothing', async () => {
    const user = userEvent.setup();
    render(<PatientVisibilitySettings organizationId="org-1" therapistsSeeAllPatients={false} />);

    expect(screen.getByTestId(SWITCH)).toBeDisabled();
    expect(screen.getByTestId('org-patient-visibility-readonly-note')).toBeInTheDocument();
    await user.click(screen.getByTestId(SWITCH));
    expect(mutateMock).not.toHaveBeenCalled();
  });

  it('describes both states, with owner and admin always seeing everyone', () => {
    const { rerender } = render(
      <PatientVisibilitySettings organizationId="org-1" therapistsSeeAllPatients={false} canEdit />
    );
    expect(screen.getByTestId('org-patient-visibility-description')).toHaveTextContent(
      /tylko pacjentów pod swoją opieką.*przypisuje właściciel albo administrator.*zawsze widzą wszystkich/
    );

    rerender(<PatientVisibilitySettings organizationId="org-1" therapistsSeeAllPatients canEdit />);
    expect(screen.getByTestId('org-patient-visibility-description')).toHaveTextContent(
      /listę, plany i wykonania wszystkich pacjentów i może przypisać ich sobie.*zawsze widzą wszystkich/
    );
  });

  it('saves with the organization id and confirms only after the server returns the value', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    mutateMock.mockResolvedValueOnce({
      data: { setTherapistsSeeAllPatients: { id: 'org-1', therapistsSeeAllPatients: true } },
    });
    render(
      <PatientVisibilitySettings organizationId="org-1" therapistsSeeAllPatients={false} canEdit onSuccess={onSuccess} />
    );

    await user.click(screen.getByTestId(SWITCH));

    expect(mutateMock).toHaveBeenCalledWith({ variables: { organizationId: 'org-1', enabled: true } });
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId(SWITCH)).toBeChecked();
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(toastError).not.toHaveBeenCalled();
  });

  it('treats a response without data as a failed save and keeps the switch as it was', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    mutateMock.mockResolvedValueOnce({ data: undefined, error: new Error('AUTH_NOT_AUTHORIZED') });
    render(
      <PatientVisibilitySettings organizationId="org-1" therapistsSeeAllPatients={false} canEdit onSuccess={onSuccess} />
    );

    await user.click(screen.getByTestId(SWITCH));

    await waitFor(() => expect(toastError).toHaveBeenCalledTimes(1));
    expect(toastSuccess).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(screen.getByTestId(SWITCH)).not.toBeChecked();
  });

  it('reports a rejected mutation (not owner or admin) as an error', async () => {
    const user = userEvent.setup();
    mutateMock.mockRejectedValueOnce(new Error('Brak uprawnień'));
    render(<PatientVisibilitySettings organizationId="org-1" therapistsSeeAllPatients canEdit />);

    await user.click(screen.getByTestId(SWITCH));

    await waitFor(() => expect(toastError).toHaveBeenCalledTimes(1));
    expect(toastSuccess).not.toHaveBeenCalled();
    expect(screen.getByTestId(SWITCH)).toBeChecked();
  });

  it('drops cached patient lists only when the save is acknowledged', () => {
    render(<PatientVisibilitySettings organizationId="org-1" therapistsSeeAllPatients={false} canEdit />);
    const cache = { evict: vi.fn(), gc: vi.fn() };

    mutationOptions?.update?.(cache, { data: undefined });
    expect(cache.evict).not.toHaveBeenCalled();

    mutationOptions?.update?.(cache, {
      data: { setTherapistsSeeAllPatients: { id: 'org-1', therapistsSeeAllPatients: true } },
    });
    expect(cache.evict).toHaveBeenCalledWith({ id: 'ROOT_QUERY', fieldName: 'organizationPatients' });
  });
});
