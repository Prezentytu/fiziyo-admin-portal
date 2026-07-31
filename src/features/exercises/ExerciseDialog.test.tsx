import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import {
  COPY_EXERCISE_TEMPLATE_MUTATION,
  DELETE_EXERCISE_IMAGE_MUTATION,
  UPDATE_EXERCISE_MUTATION,
  UPLOAD_EXERCISE_IMAGE_MUTATION,
} from '@/graphql/mutations/exercises.mutations';

import { ExerciseDialog } from './ExerciseDialog';
import type { Exercise } from './ExerciseCard';

const {
  useMutationMock,
  useQueryMock,
  useApolloClientMock,
  generateExerciseImageMock,
  updateExerciseMock,
  uploadExerciseImageMock,
  deleteExerciseImageMock,
  copyExerciseMock,
  editorSaveMock,
} = vi.hoisted(() => ({
  useMutationMock: vi.fn(),
  useQueryMock: vi.fn(),
  useApolloClientMock: vi.fn(),
  generateExerciseImageMock: vi.fn(),
  updateExerciseMock: vi.fn(),
  uploadExerciseImageMock: vi.fn(),
  deleteExerciseImageMock: vi.fn(),
  copyExerciseMock: vi.fn(),
  editorSaveMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('next/image', () => ({
  default: ({ alt }: { alt?: string }) => <span>{alt ?? 'image'}</span>,
}));

vi.mock('@apollo/client/react', () => ({
  useMutation: (...args: unknown[]) => useMutationMock(...args),
  useQuery: (...args: unknown[]) => useQueryMock(...args),
  useApolloClient: (...args: unknown[]) => useApolloClientMock(...args),
}));

vi.mock('./CreateExerciseWizard', () => ({
  CreateExerciseWizard: () => null,
}));

vi.mock('./ExerciseEditor', () => ({
  ExerciseEditor: () => <div data-testid="mock-exercise-editor" />,
}));

vi.mock('./useExerciseEditorForm', () => ({
  useExerciseEditorForm: () => ({
    core: {
      name: 'Przysiad',
      patientDescription: '',
      clinicalDescription: '',
      notes: '',
      audioCue: '',
      tempo: '',
      rangeOfMotion: '',
      side: 'none',
      difficultyLevel: 'UNKNOWN',
      videoUrl: '',
      sets: 3,
      reps: 10,
      executionTime: null,
      restSets: 60,
      restReps: 0,
      preparationTime: 5,
      duration: null,
      loadKg: null,
      mainTags: [],
      additionalTags: [],
    },
    enrichment: {},
    setCoreField: vi.fn(),
    setEnrichmentPath: vi.fn(),
    replaceEnrichment: vi.fn(),
    isDirty: false,
    isCoreFieldDirty: () => false,
    isPathDirty: () => false,
    saveStatus: 'idle' as const,
    save: editorSaveMock,
    flush: vi.fn().mockResolvedValue(undefined),
    markSaved: vi.fn(),
    reset: vi.fn(),
  }),
}));

vi.mock('@/services/aiService', () => ({
  aiService: {
    generateExerciseImage: (...args: unknown[]) => generateExerciseImageMock(...args),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

const baseExercise: Exercise = {
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
      if (this.onload) {
        this.onload.call(this as unknown as FileReader, {} as ProgressEvent<FileReader>);
      }
    });
  }
}

describe('ExerciseDialog media edit flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('FileReader', MockFileReader);

    useQueryMock.mockReturnValue({
      data: {
        organizationExercises: [],
      },
    });
    useApolloClientMock.mockReturnValue({
      refetchQueries: vi.fn().mockResolvedValue(undefined),
    });

    useMutationMock.mockImplementation((documentNode: unknown) => {
      if (documentNode === UPDATE_EXERCISE_MUTATION) return [updateExerciseMock, { loading: false }];
      if (documentNode === UPLOAD_EXERCISE_IMAGE_MUTATION) {
        return [uploadExerciseImageMock, { loading: false }];
      }
      if (documentNode === DELETE_EXERCISE_IMAGE_MUTATION) {
        return [deleteExerciseImageMock, { loading: false }];
      }
      if (documentNode === COPY_EXERCISE_TEMPLATE_MUTATION) return [copyExerciseMock, { loading: false }];
      return [vi.fn(), { loading: false }];
    });

    editorSaveMock.mockResolvedValue(undefined);
    updateExerciseMock.mockResolvedValue({});
    uploadExerciseImageMock.mockResolvedValue({});
    deleteExerciseImageMock.mockResolvedValue({});
    copyExerciseMock.mockResolvedValue({});
    generateExerciseImageMock.mockResolvedValue({
      status: 'ok',
      file: new File(['img'], 'ai.png', { type: 'image/png' }),
      response: { success: true, imageBase64: 'x', contentType: 'image/png', prompt: '' },
    });
  });

  it('pokazuje błąd gdy generowanie AI obrazu się nie uda', async () => {
    generateExerciseImageMock.mockResolvedValue({
      status: 'error',
      code: 'provider_unavailable',
      message: 'Asystent AI jest chwilowo niedostępny. Spróbuj ponownie.',
    });

    render(
      <ExerciseDialog open onOpenChange={vi.fn()} exercise={baseExercise} organizationId="org-1" />
    );

    const user = userEvent.setup();
    await user.click(screen.getByTestId('exercise-form-media-ai-generate-btn'));

    await waitFor(() => {
      expect(generateExerciseImageMock).toHaveBeenCalled();
    });

    expect(screen.queryByTestId('exercise-form-media-ai-skeleton')).not.toBeInTheDocument();
  });

  it('wykonuje update + delete + upload dla zmienionej galerii', async () => {
    render(
      <ExerciseDialog
        open
        onOpenChange={vi.fn()}
        exercise={baseExercise}
        organizationId="org-1"
      />
    );

    const user = userEvent.setup();
    await user.click(screen.getByTestId('exercise-form-media-remove-btn-0'));

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const uploadFile = new File(['local'], 'local.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [uploadFile] } });
    await screen.findByText('Nowe zdjęcie ćwiczenia 1');

    await user.click(screen.getByTestId('exercise-dialog-save-btn'));

    await waitFor(() => {
      expect(editorSaveMock).toHaveBeenCalled();
      expect(deleteExerciseImageMock).toHaveBeenCalledTimes(1);
      expect(uploadExerciseImageMock).toHaveBeenCalledTimes(1);
    });

    // Dirty-diff: gdy zmieniamy tylko media, UpdateExercise nie jest wymagany.
    expect(updateExerciseMock).toHaveBeenCalledTimes(0);

    expect(deleteExerciseImageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: expect.objectContaining({
          exerciseId: 'exercise-1',
          imageUrl: 'https://cdn.example.com/existing.jpg',
        }),
      })
    );
  });

  it('blokuje sekcję edycji dla ćwiczenia globalnego', () => {
    render(
      <ExerciseDialog
        open
        onOpenChange={vi.fn()}
        exercise={{
          ...baseExercise,
          scope: 'GLOBAL',
        }}
        organizationId="org-1"
      />
    );

    expect(screen.getByText('Ćwiczenie z bazy FiziYo')).toBeInTheDocument();
    expect(screen.queryByTestId('exercise-form-media-upload-btn')).not.toBeInTheDocument();
  });

  it('blokuje edycję gdy ćwiczenie czeka na weryfikację organizacyjną', () => {
    render(
      <ExerciseDialog
        open
        onOpenChange={vi.fn()}
        exercise={{
          ...baseExercise,
          organizationVerificationStatus: 'PENDING_ORG_REVIEW',
        }}
        organizationId="org-1"
      />
    );

    expect(screen.getByText('Ćwiczenie oczekuje na weryfikację')).toBeInTheDocument();
    expect(screen.getByText('Nie możesz edytować ćwiczenia podczas weryfikacji. Poczekaj na decyzję weryfikatora.')).toBeInTheDocument();
  });
});
