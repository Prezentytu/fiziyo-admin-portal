/**
 * Skrót Cmd/Ctrl+Enter w oknie edycji ćwiczenia w trakcie zapisu.
 *
 * Przycisk „Zapisz zmiany” jest w trakcie zapisu wyłączony, więc skrót też nie może
 * zaczynać drugiego zapisu: jedna mutacja treści, zdjęcie wysłane raz, jeden komunikat
 * sukcesu i jedno zamknięcie okna. Formularz (`useExerciseEditorForm`) jest prawdziwy,
 * udawane są tylko mutacje i pole edytora.
 */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';

import {
  DELETE_EXERCISE_IMAGE_MUTATION,
  UPDATE_EXERCISE_MUTATION,
  UPLOAD_EXERCISE_IMAGE_MUTATION,
} from '@/graphql/mutations/exercises.mutations';

import { ExerciseDialog } from '../ExerciseDialog';
import type { Exercise } from '../ExerciseCard';
import type { UseExerciseEditorFormResult } from '../useExerciseEditorForm';

const { useMutationMock, updateExerciseMock, uploadExerciseImageMock, deleteExerciseImageMock } = vi.hoisted(() => ({
  useMutationMock: vi.fn(),
  updateExerciseMock: vi.fn(),
  uploadExerciseImageMock: vi.fn(),
  deleteExerciseImageMock: vi.fn(),
}));

vi.mock('@/hooks/useRoleAccess', () => ({ useRoleAccess: () => ({ canManageOrganization: false }) }));
vi.mock('next/image', () => ({
  default: ({ alt }: { alt?: string }) => <span>{alt ?? 'image'}</span>,
}));

vi.mock('@apollo/client/react', () => ({
  useMutation: (...args: unknown[]) => useMutationMock(...args),
  useQuery: () => ({ data: { organizationExercises: [] } }),
  useApolloClient: () => ({ refetchQueries: vi.fn().mockResolvedValue(undefined) }),
}));

vi.mock('../CreateExerciseWizard', () => ({ CreateExerciseWizard: () => null }));

vi.mock('../ExerciseEditor', () => ({
  ExerciseEditor: ({ form }: { form: UseExerciseEditorFormResult }) => (
    <input
      aria-label="Nazwa ćwiczenia"
      data-testid="mock-exercise-name-input"
      value={form.core.name}
      onChange={(event) => form.setCoreField('name', event.target.value)}
    />
  ),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const exercise: Exercise = {
  id: 'exercise-1',
  name: 'Przysiad',
  scope: 'ORGANIZATION',
  status: 'DRAFT',
  imageUrl: 'https://cdn.example.com/existing.jpg',
};

class MockFileReader {
  public result: string | ArrayBuffer | null = null;
  public onload: ((this: FileReader, ev: ProgressEvent<FileReader>) => unknown) | null = null;
  public onerror: ((this: FileReader, ev: ProgressEvent<FileReader>) => unknown) | null = null;

  readAsDataURL(file: Blob) {
    this.result = `data:${file.type || 'image/jpeg'};base64,ZmFrZS1iYXNlNjQ=`;
    queueMicrotask(() => {
      this.onload?.call(this as unknown as FileReader, {} as ProgressEvent<FileReader>);
    });
  }
}

/** Zapis treści, który kończy się dopiero wtedy, gdy test na to pozwoli. */
function heldContentSave() {
  let release: () => void = () => {};
  let fail: (error: Error) => void = () => {};
  updateExerciseMock.mockImplementationOnce(
    () =>
      new Promise<object>((resolve, reject) => {
        release = () => resolve({});
        fail = reject;
      })
  );
  return { release: () => release(), fail: (error: Error) => fail(error) };
}

async function openWithChanges() {
  const onOpenChange = vi.fn();
  render(<ExerciseDialog open onOpenChange={onOpenChange} exercise={exercise} organizationId="org-1" />);

  const nameInput = screen.getByLabelText('Nazwa ćwiczenia');
  fireEvent.change(nameInput, { target: { value: 'Przysiad z gumą' } });

  const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(fileInput, { target: { files: [new File(['local'], 'local.jpg', { type: 'image/jpeg' })] } });
  await screen.findByText('Nowe zdjęcie ćwiczenia 1');

  const pressShortcut = () => fireEvent.keyDown(nameInput, { key: 'Enter', metaKey: true });
  const closeRequests = () => onOpenChange.mock.calls.filter(([nextOpen]) => nextOpen === false).length;
  return { pressShortcut, closeRequests };
}

describe('okno edycji ćwiczenia: skrót Cmd+Enter w trakcie zapisu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('FileReader', MockFileReader);
    vi.spyOn(console, 'error').mockImplementation(() => {});

    updateExerciseMock.mockReset().mockResolvedValue({});
    uploadExerciseImageMock.mockReset().mockResolvedValue({});
    deleteExerciseImageMock.mockReset().mockResolvedValue({});
    useMutationMock.mockImplementation((documentNode: unknown) => {
      if (documentNode === UPDATE_EXERCISE_MUTATION) return [updateExerciseMock, { loading: false }];
      if (documentNode === UPLOAD_EXERCISE_IMAGE_MUTATION) return [uploadExerciseImageMock, { loading: false }];
      if (documentNode === DELETE_EXERCISE_IMAGE_MUTATION) return [deleteExerciseImageMock, { loading: false }];
      return [vi.fn().mockResolvedValue({}), { loading: false }];
    });
  });

  it('trzy naciśnięcia pod rząd zapisują raz', async () => {
    const contentSave = heldContentSave();
    const { pressShortcut, closeRequests } = await openWithChanges();

    pressShortcut();
    pressShortcut();
    pressShortcut();
    await act(async () => {
      contentSave.release();
    });

    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(updateExerciseMock).toHaveBeenCalledTimes(1);
    expect(uploadExerciseImageMock).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(toast.error).not.toHaveBeenCalled();
    expect(closeRequests()).toBe(1);
  });

  it('naciśnięcie przy wyłączonym przycisku zapisu nie zaczyna drugiego zapisu', async () => {
    const contentSave = heldContentSave();
    const { pressShortcut, closeRequests } = await openWithChanges();

    pressShortcut();
    await waitFor(() => expect(screen.getByTestId('exercise-dialog-save-btn')).toBeDisabled());
    pressShortcut();
    pressShortcut();
    await act(async () => {
      contentSave.release();
    });

    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(updateExerciseMock).toHaveBeenCalledTimes(1);
    expect(uploadExerciseImageMock).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(closeRequests()).toBe(1);
  });

  it('po nieudanym wysłaniu zdjęcia skrót zapisuje ponownie', async () => {
    uploadExerciseImageMock.mockRejectedValueOnce(new Error('offline'));
    const { pressShortcut, closeRequests } = await openWithChanges();

    pressShortcut();
    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1));
    expect(closeRequests()).toBe(0);

    pressShortcut();
    await waitFor(() => expect(toast.success).toHaveBeenCalledTimes(1));

    expect(uploadExerciseImageMock).toHaveBeenCalledTimes(2);
    expect(closeRequests()).toBe(1);
  });
});
