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
});
