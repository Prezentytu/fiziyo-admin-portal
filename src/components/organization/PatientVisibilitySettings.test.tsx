import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PatientVisibilitySettings } from './PatientVisibilitySettings';

const mutateMock = vi.fn();
const toastError = vi.fn();
const toastSuccess = vi.fn();
let mutationOptions: { update?: (cache: unknown, result: { data?: unknown }) => void } | undefined;
let settingResult: { data?: unknown; loading: boolean; error?: Error };
const queryMock = vi.fn();

function setting(value: boolean) {
  settingResult = { data: { organizationById: { id: 'org-1', therapistsSeeAllPatients: value } }, loading: false };
}

vi.mock('@apollo/client/react', () => ({
  useQuery: (...args: unknown[]) => {
    queryMock(...args);
    return settingResult;
  },
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

  it('reads the setting with its own query, scoped to the organization', () => {
    setting(false);
    render(<PatientVisibilitySettings organizationId="org-1" canEdit />);

    const [document, options] = queryMock.mock.calls[0] as [
      { definitions: Array<{ name?: { value?: string } }> },
      { variables: { id: string } },
    ];
    expect(document.definitions[0].name?.value).toBe('GetOrganizationPatientVisibility');
    expect(options.variables).toEqual({ id: 'org-1' });
  });

  it.each([
    ['the API does not have the field yet', { data: undefined, loading: false, error: new Error('Cannot query field') }],
    ['the answer has not arrived', { data: undefined, loading: true }],
    ['the organization came back empty', { data: { organizationById: null }, loading: false }],
  ])('shows no card and no „off” switch when %s', (_case, result) => {
    settingResult = result;
    const { container } = render(<PatientVisibilitySettings organizationId="org-1" canEdit />);

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByTestId(SWITCH)).not.toBeInTheDocument();
  });

  it('is read-only for a role that cannot edit and sends nothing', async () => {
    const user = userEvent.setup();
    setting(false);
    render(<PatientVisibilitySettings organizationId="org-1" />);

    expect(screen.getByTestId(SWITCH)).toBeDisabled();
    expect(screen.getByTestId('org-patient-visibility-readonly-note')).toBeInTheDocument();
    await user.click(screen.getByTestId(SWITCH));
    expect(mutateMock).not.toHaveBeenCalled();
  });

  it('describes both states, with owner and admin always seeing everyone', () => {
    setting(false);
    const { rerender } = render(<PatientVisibilitySettings organizationId="org-1" canEdit />);
    expect(screen.getByTestId('org-patient-visibility-description')).toHaveTextContent(
      /tylko pacjentów pod swoją opieką.*przypisuje właściciel albo administrator.*zawsze widzą wszystkich/
    );

    setting(true);
    rerender(<PatientVisibilitySettings organizationId="org-1" canEdit />);
    expect(screen.getByTestId('org-patient-visibility-description')).toHaveTextContent(
      /listę, plany i wykonania wszystkich pacjentów i może przypisać ich sobie.*zawsze widzą wszystkich/
    );
  });

  it('saves with the organization id and confirms only after the server returns the value', async () => {
    const user = userEvent.setup();
    setting(false);
    mutateMock.mockResolvedValueOnce({
      data: { setTherapistsSeeAllPatients: { id: 'org-1', therapistsSeeAllPatients: true } },
    });
    render(<PatientVisibilitySettings organizationId="org-1" canEdit />);

    await user.click(screen.getByTestId(SWITCH));

    expect(mutateMock).toHaveBeenCalledWith({ variables: { organizationId: 'org-1', enabled: true } });
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId(SWITCH)).toBeChecked();
    expect(toastError).not.toHaveBeenCalled();
  });

  it('treats a response without data as a failed save and keeps the switch as it was', async () => {
    const user = userEvent.setup();
    setting(false);
    mutateMock.mockResolvedValueOnce({ data: undefined, error: new Error('AUTH_NOT_AUTHORIZED') });
    render(<PatientVisibilitySettings organizationId="org-1" canEdit />);

    await user.click(screen.getByTestId(SWITCH));

    await waitFor(() => expect(toastError).toHaveBeenCalledTimes(1));
    expect(toastSuccess).not.toHaveBeenCalled();
    expect(screen.getByTestId(SWITCH)).not.toBeChecked();
  });

  it('reports a rejected mutation (not owner or admin) as an error', async () => {
    const user = userEvent.setup();
    setting(true);
    mutateMock.mockRejectedValueOnce(new Error('Brak uprawnień'));
    render(<PatientVisibilitySettings organizationId="org-1" canEdit />);

    await user.click(screen.getByTestId(SWITCH));

    await waitFor(() => expect(toastError).toHaveBeenCalledTimes(1));
    expect(toastSuccess).not.toHaveBeenCalled();
    expect(screen.getByTestId(SWITCH)).toBeChecked();
  });

  it('drops cached patient lists only when the save is acknowledged', () => {
    setting(false);
    render(<PatientVisibilitySettings organizationId="org-1" canEdit />);
    const cache = { evict: vi.fn(), gc: vi.fn() };

    mutationOptions?.update?.(cache, { data: undefined });
    expect(cache.evict).not.toHaveBeenCalled();

    mutationOptions?.update?.(cache, {
      data: { setTherapistsSeeAllPatients: { id: 'org-1', therapistsSeeAllPatients: true } },
    });
    expect(cache.evict).toHaveBeenCalledWith({ id: 'ROOT_QUERY', fieldName: 'organizationPatients' });
  });
});
