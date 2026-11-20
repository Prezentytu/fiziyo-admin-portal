import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CreateOrganizationDialog } from './CreateOrganizationDialog';

const createOrganizationMock = vi.fn();
const enterOrganizationMock = vi.fn();
const refreshOrganizationsMock = vi.fn();
const toastSuccessMock = vi.fn();
const toastWarningMock = vi.fn();

vi.mock('@apollo/client/react', () => ({
  useMutation: () => [createOrganizationMock, { loading: false }] as const,
}));

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: () => ({
    enterOrganization: enterOrganizationMock,
    refreshOrganizations: refreshOrganizationsMock,
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    warning: (...args: unknown[]) => toastWarningMock(...args),
    error: vi.fn(),
  },
}));

const created = { data: { createOrganization: { id: 'org-new', name: 'Fizjo Kraków' } } };

function renderDialog() {
  const onOpenChange = vi.fn();
  render(<CreateOrganizationDialog open onOpenChange={onOpenChange} />);
  return { onOpenChange, user: userEvent.setup() };
}

describe('CreateOrganizationDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates the organization, enters it and closes', async () => {
    createOrganizationMock.mockResolvedValueOnce(created);
    enterOrganizationMock.mockResolvedValueOnce(undefined);
    const { onOpenChange, user } = renderDialog();

    await user.type(screen.getByTestId('org-create-name-input'), '  Fizjo Kraków ');
    await user.click(screen.getByTestId('org-create-submit-btn'));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(createOrganizationMock).toHaveBeenCalledWith({
      variables: { name: 'Fizjo Kraków', description: null },
    });
    expect(enterOrganizationMock).toHaveBeenCalledWith('org-new');
    expect(toastSuccessMock).toHaveBeenCalledWith('Utworzono organizację Fizjo Kraków', expect.any(Object));
  });

  it('submits with Cmd+Enter from the name field', async () => {
    createOrganizationMock.mockResolvedValueOnce(created);
    enterOrganizationMock.mockResolvedValueOnce(undefined);
    const { onOpenChange, user } = renderDialog();

    await user.type(screen.getByTestId('org-create-name-input'), 'Fizjo Kraków');
    await user.keyboard('{Meta>}{Enter}{/Meta}');

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(createOrganizationMock).toHaveBeenCalledTimes(1);
  });

  it('sends the mutation once when two submits land before a re-render', async () => {
    let resolveCreate: (value: typeof created) => void = () => undefined;
    createOrganizationMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveCreate = resolve;
        })
    );
    enterOrganizationMock.mockResolvedValue(undefined);
    const { onOpenChange, user } = renderDialog();

    const nameInput = screen.getByTestId('org-create-name-input');
    await user.type(nameInput, 'Fizjo Kraków');
    fireEvent.keyDown(nameInput, { key: 'Enter', metaKey: true });
    fireEvent.keyDown(nameInput, { key: 'Enter', metaKey: true });
    await waitFor(() => expect(createOrganizationMock).toHaveBeenCalledTimes(1));
    await user.click(screen.getByTestId('org-create-submit-btn'));
    resolveCreate(created);

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(createOrganizationMock).toHaveBeenCalledTimes(1);
  });

  it('does not create a duplicate when the organization exists but switching to it fails', async () => {
    createOrganizationMock.mockResolvedValueOnce(created);
    enterOrganizationMock.mockRejectedValueOnce(new Error('Change organization failed: 500'));
    const { onOpenChange, user } = renderDialog();

    await user.type(screen.getByTestId('org-create-name-input'), 'Fizjo Kraków');
    await user.click(screen.getByTestId('org-create-submit-btn'));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(toastWarningMock).toHaveBeenCalledWith('Utworzono organizację Fizjo Kraków', {
      description: 'Nie udało się na nią przełączyć. Wybierz ją w przełączniku organizacji.',
    });
    expect(refreshOrganizationsMock).toHaveBeenCalled();
    expect(screen.queryByTestId('org-create-error')).not.toBeInTheDocument();
  });

  it('keeps the dialog open with an inline error when the create fails', async () => {
    createOrganizationMock.mockRejectedValueOnce(new Error('Network error'));
    const { onOpenChange, user } = renderDialog();

    await user.type(screen.getByTestId('org-create-name-input'), 'Fizjo Kraków');
    await user.click(screen.getByTestId('org-create-submit-btn'));

    expect(await screen.findByTestId('org-create-error')).toHaveTextContent(
      'Nie udało się utworzyć organizacji. Spróbuj ponownie.'
    );
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(enterOrganizationMock).not.toHaveBeenCalled();
    expect(screen.getByTestId('org-create-submit-btn')).toBeEnabled();
  });

  it('does not call the backend for a blank name', async () => {
    const { user } = renderDialog();

    await user.type(screen.getByTestId('org-create-name-input'), '   ');
    await user.click(screen.getByTestId('org-create-submit-btn'));

    expect(await screen.findByText('Nazwa musi mieć co najmniej 2 znaki')).toBeInTheDocument();
    expect(createOrganizationMock).not.toHaveBeenCalled();
  });
});
