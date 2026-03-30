import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { DocumentAnalysisResult } from '@/types/import.types';
import { useDocumentImport } from './useDocumentImport';
import { documentImportService } from '@/services/documentImportService';

vi.mock('@/services/documentImportService', () => ({
  documentImportService: {
    isFormatSupported: vi.fn(() => true),
    isFileSizeValid: vi.fn(() => true),
    getMaxFileSizeMB: vi.fn(() => 10),
    analyzeDocument: vi.fn(),
    analyzeText: vi.fn(),
    importData: vi.fn(),
  },
}));

const analysisResultFixture: DocumentAnalysisResult = {
  exercises: [
    {
      tempId: 'tmp-1',
      name: 'Przysiad',
      type: 'reps',
      suggestedTags: [],
      confidence: 0.9,
    },
  ],
  exerciseSets: [],
  clinicalNotes: [],
  matchSuggestions: {},
  documentInfo: {},
};

describe('useDocumentImport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('dla trybu plikowego używa analyzeDocument i przechodzi do review', async () => {
    vi.mocked(documentImportService.analyzeDocument).mockResolvedValue(analysisResultFixture);

    const { result } = renderHook(() => useDocumentImport());
    const file = new File(['plan terapii'], 'plan.pdf', { type: 'application/pdf' });

    act(() => {
      result.current.setFile(file);
    });

    await act(async () => {
      await result.current.analyzeInput();
    });

    expect(documentImportService.analyzeDocument).toHaveBeenCalledWith(file, undefined, undefined);
    expect(documentImportService.analyzeText).not.toHaveBeenCalled();
    expect(result.current.step).toBe('review-exercises');
  });

  it('dla trybu tekstowego waliduje minimum znaków i używa analyzeText', async () => {
    vi.mocked(documentImportService.analyzeText).mockResolvedValue(analysisResultFixture);

    const { result } = renderHook(() => useDocumentImport());

    act(() => {
      result.current.setInputMode('text');
      result.current.setPastedText('za krótki tekst');
    });

    await act(async () => {
      await result.current.analyzeInput();
    });

    expect(documentImportService.analyzeText).not.toHaveBeenCalled();
    expect(result.current.error).toContain('minimum');

    act(() => {
      result.current.setPastedText(
        'To jest wystarczajaco dlugi opis planu rehabilitacji, ktory powinien przejsc walidacje.'
      );
    });

    await act(async () => {
      await result.current.analyzeInput();
    });

    expect(documentImportService.analyzeText).toHaveBeenCalledTimes(1);
    expect(documentImportService.analyzeDocument).not.toHaveBeenCalled();
    expect(result.current.step).toBe('review-exercises');
  });

  it('dodaje fallback normalized exact match, ale nie ustawia auto-reuse', async () => {
    vi.mocked(documentImportService.analyzeText).mockResolvedValue(analysisResultFixture);

    const { result } = renderHook(() => useDocumentImport());

    act(() => {
      result.current.setInputMode('text');
      result.current.setPastedText(
        'To jest wystarczajaco dlugi opis planu rehabilitacji, ktory powinien przejsc walidacje i uruchomic fallback.'
      );
    });

    await act(async () => {
      await result.current.analyzeInput({
        availableExercises: [{ id: 'existing-1', name: 'Przysiad' }],
      });
    });

    const suggestions = result.current.analysisResult?.matchSuggestions['tmp-1'];
    expect(suggestions?.[0]?.existingExerciseId).toBe('existing-1');
    expect(suggestions?.[0]?.source).toBe('frontend_fallback');
    expect(suggestions?.[0]?.matchStatus).toBe('normalized_exact');
    expect(result.current.exerciseDecisions['tmp-1']?.action).toBe('create');
  });

  it('zatwierdza confident match tylko od progu 0.8', async () => {
    vi.mocked(documentImportService.analyzeDocument).mockResolvedValue({
      ...analysisResultFixture,
      exercises: [
        { ...analysisResultFixture.exercises[0], tempId: 'tmp-70', name: 'A' },
        { ...analysisResultFixture.exercises[0], tempId: 'tmp-80', name: 'B' },
      ],
      matchSuggestions: {
        'tmp-70': [
          {
            existingExerciseId: 'existing-70',
            existingExerciseName: 'A',
            confidence: 0.7,
            matchReason: 'fuzzy',
          },
        ],
        'tmp-80': [
          {
            existingExerciseId: 'existing-80',
            existingExerciseName: 'B',
            confidence: 0.8,
            matchReason: 'exact',
          },
        ],
      },
    });

    const { result } = renderHook(() => useDocumentImport());
    const file = new File(['plan terapii'], 'plan.pdf', { type: 'application/pdf' });

    act(() => {
      result.current.setFile(file);
    });

    await act(async () => {
      await result.current.analyzeInput();
    });

    act(() => {
      result.current.approveAllConfidentMatches();
    });

    expect(result.current.exerciseDecisions['tmp-70']?.action).toBe('create');
    expect(result.current.exerciseDecisions['tmp-80']?.action).toBe('reuse');
  });
});
