import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { ExerciseDialog } from './ExerciseDialog';
import type { Exercise } from './ExerciseCard';

const useMutationMock = vi.fn();
const useQueryMock = vi.fn();
const generateExerciseImageMock = vi.fn();

vi.mock('next/image', () => ({
  default: ({ alt }: { alt?: string }) => <span>{alt ?? 'image'}</span>,
}));

vi.mock('@apollo/client/react', () => ({
  useMutation: (...args: unknown[]) => useMutationMock(...args),
  useQuery: (...args: unknown[]) => useQueryMock(...args),
}));

vi.mock('./CreateExerciseWizard', () => ({
  CreateExerciseWizard: () => null,
}));

vi.mock('./ExerciseForm', () => ({
  ExerciseForm: ({
    onSubmit,
    mediaSection,
  }: {
    onSubmit: (values: {
      name: string;
      description: string;
      type: 'reps' | 'time';
      sets: number;
      reps: number;
      duration: null;
      restSets: number;
      restReps: number;
      preparationTime: number;
      executionTime: number;
      exerciseSide: 'none';
      videoUrl: string;
      notes: string;
      tempo: string;
      clinicalDescription: string;
      audioCue: string;
      rangeOfMotion: string;
    }) => Promise<void>;
    mediaSection?: ReactNode;
  }) => (
    <div>
      {mediaSection}
      <button
        type="button"
        data-testid="mock-exercise-form-submit-btn"
        onClick={() =>
          onSubmit({
            name: 'Przysiad',
            description: 'Opis',
            type: 'reps',
            sets: 3,
            reps: 10,
            duration: null,
            restSets: 60,
            restReps: 0,
            preparationTime: 5,
            executionTime: 0,
            exerciseSide: 'none',
            videoUrl: '',
            notes: '',
            tempo: '',
            clinicalDescription: '',
            audioCue: '',
            rangeOfMotion: '',
          })
        }
      >
        submit
      </button>
    </div>
  ),
}));

vi.mock('@/services/aiService', () => ({
  aiService: {
    generateExerciseImage: (...args: unknown[]) => generateExerciseImageMock(...args),
  },
}));

const updateExerciseMock = vi.fn();
const uploadExerciseImageMock = vi.fn();
const deleteExerciseImageMock = vi.fn();
const copyExerciseMock = vi.fn();

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
    this.result = `data:${file.type};base64,ZmFrZS1iYXNlNjQ=`;
    if (this.onload) {
      this.onload.call(this as unknown as FileReader, {} as ProgressEvent<FileReader>);
    }
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

    useMutationMock.mockImplementation(
      (documentNode: {
        definitions?: Array<{ name?: { value?: string }; kind?: string }>;
        loc?: { source?: { body?: string } };
      }) => {
      const operationName = documentNode?.definitions?.[0]?.name?.value;
      const sourceBody = documentNode?.loc?.source?.body ?? '';
      if (operationName === 'UpdateExercise') return [updateExerciseMock, { loading: false }];
      if (operationName === 'UploadExerciseImage' || sourceBody.includes('uploadExerciseImage(')) {
        return [uploadExerciseImageMock, { loading: false }];
      }
      if (operationName === 'DeleteExerciseImage' || sourceBody.includes('deleteExerciseImage(')) {
        return [deleteExerciseImageMock, { loading: false }];
      }
      if (operationName === 'CopyExerciseTemplate') return [copyExerciseMock, { loading: false }];
      return [vi.fn(), { loading: false }];
    });

    updateExerciseMock.mockResolvedValue({});
    uploadExerciseImageMock.mockResolvedValue({});
    deleteExerciseImageMock.mockResolvedValue({});
    copyExerciseMock.mockResolvedValue({});
    generateExerciseImageMock.mockResolvedValue({ file: new File(['img'], 'ai.png', { type: 'image/png' }) });
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

    await user.click(screen.getByTestId('mock-exercise-form-submit-btn'));

    await waitFor(() => {
      expect(updateExerciseMock).toHaveBeenCalledTimes(1);
      expect(deleteExerciseImageMock).toHaveBeenCalledTimes(1);
    });

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
});
