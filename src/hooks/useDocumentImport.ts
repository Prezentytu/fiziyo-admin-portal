"use client";

import { useState, useCallback, useMemo } from "react";
import { documentImportService } from "@/services/documentImportService";
import type {
  ImportState,
  ImportWizardStep,
  ExerciseDecision,
  ExerciseSetDecision,
  ClinicalNoteDecision,
  DocumentImportRequest,
  ExerciseImportItem,
  ExerciseSetImportItem,
  ClinicalNoteImportItem,
} from "@/types/import.types";

type ExerciseFilterType = 'all' | 'create' | 'reuse' | 'skip' | 'matched';

interface ExtendedImportState extends ImportState {
  assignSetsToPatient: boolean;
  exerciseFilter: ExerciseFilterType;
}

const initialState: ExtendedImportState = {
  step: "upload",
  file: null,
  isAnalyzing: false,
  isImporting: false,
  analysisResult: null,
  exerciseDecisions: {},
  setDecisions: {},
  noteDecisions: {},
  selectedPatientId: undefined,
  error: null,
  importResult: null,
  assignSetsToPatient: false,
  exerciseFilter: 'all',
};

/**
 * Hook do zarządzania procesem importu dokumentów
 */
export function useDocumentImport() {
  const [state, setState] = useState<ExtendedImportState>(initialState);

  // ============================================
  // File Upload
  // ============================================

  const setFile = useCallback((file: File | null) => {
    setState((prev) => ({
      ...prev,
      file,
      error: null,
      analysisResult: null,
      exerciseDecisions: {},
      setDecisions: {},
      noteDecisions: {},
      importResult: null,
    }));
  }, []);

  const setPatientId = useCallback((patientId: string | undefined) => {
    setState((prev) => ({
      ...prev,
      selectedPatientId: patientId,
    }));
  }, []);

  const setAssignSetsToPatient = useCallback((assign: boolean) => {
    setState((prev) => ({
      ...prev,
      assignSetsToPatient: assign,
    }));
  }, []);

  const setExerciseFilter = useCallback((filter: ExerciseFilterType) => {
    setState((prev) => ({
      ...prev,
      exerciseFilter: filter,
    }));
  }, []);

  // ============================================
  // Analysis
  // ============================================

  const analyzeDocument = useCallback(
    async (additionalContext?: string) => {
      if (!state.file) {
        setState((prev) => ({ ...prev, error: "Wybierz plik do analizy" }));
        return;
      }

      // Walidacja
      if (!documentImportService.isFormatSupported(state.file)) {
        setState((prev) => ({
          ...prev,
          error: "Nieobsługiwany format pliku. Obsługiwane: PDF, Excel, CSV, TXT",
        }));
        return;
      }

      if (!documentImportService.isFileSizeValid(state.file)) {
        setState((prev) => ({
          ...prev,
          error: `Plik jest za duży. Maksymalny rozmiar: ${documentImportService.getMaxFileSizeMB()}MB`,
        }));
        return;
      }

      setState((prev) => ({
        ...prev,
        step: "processing",
        isAnalyzing: true,
        error: null,
      }));

      try {
        const result = await documentImportService.analyzeDocument(
          state.file,
          state.selectedPatientId,
          additionalContext
        );

        // Inicjalizuj domyślne decyzje
        const exerciseDecisions: Record<string, ExerciseDecision> = {};
        for (const exercise of result.exercises) {
          const hasMatch =
            result.matchSuggestions[exercise.tempId]?.length > 0;
          const bestMatch = result.matchSuggestions[exercise.tempId]?.[0];

          exerciseDecisions[exercise.tempId] = {
            tempId: exercise.tempId,
            action:
              hasMatch && bestMatch && bestMatch.confidence >= 0.8
                ? "reuse"
                : "create",
            reuseExerciseId:
              hasMatch && bestMatch && bestMatch.confidence >= 0.8
                ? bestMatch.existingExerciseId
                : undefined,
          };
        }

        const setDecisions: Record<string, ExerciseSetDecision> = {};
        for (const set of result.exerciseSets) {
          setDecisions[set.tempId] = {
            tempId: set.tempId,
            action: "create",
          };
        }

        const noteDecisions: Record<string, ClinicalNoteDecision> = {};
        for (const note of result.clinicalNotes) {
          noteDecisions[note.tempId] = {
            tempId: note.tempId,
            action: "create",
          };
        }

        setState((prev) => ({
          ...prev,
          step: "review-exercises",
          isAnalyzing: false,
          analysisResult: result,
          exerciseDecisions,
          setDecisions,
          noteDecisions,
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          step: "upload",
          isAnalyzing: false,
          error:
            error instanceof Error
              ? error.message
              : "Błąd podczas analizy dokumentu",
        }));
      }
    },
    [state.file, state.selectedPatientId]
  );

  // ============================================
  // Individual Decisions
  // ============================================

  const updateExerciseDecision = useCallback(
    (tempId: string, decision: Partial<ExerciseDecision>) => {
      setState((prev) => ({
        ...prev,
        exerciseDecisions: {
          ...prev.exerciseDecisions,
          [tempId]: {
            ...prev.exerciseDecisions[tempId],
            ...decision,
            tempId,
          },
        },
      }));
    },
    []
  );

  const updateSetDecision = useCallback(
    (tempId: string, decision: Partial<ExerciseSetDecision>) => {
      setState((prev) => ({
        ...prev,
        setDecisions: {
          ...prev.setDecisions,
          [tempId]: {
            ...prev.setDecisions[tempId],
            ...decision,
            tempId,
          },
        },
      }));
    },
    []
  );

  const updateNoteDecision = useCallback(
    (tempId: string, decision: Partial<ClinicalNoteDecision>) => {
      setState((prev) => ({
        ...prev,
        noteDecisions: {
          ...prev.noteDecisions,
          [tempId]: {
            ...prev.noteDecisions[tempId],
            ...decision,
            tempId,
          },
        },
      }));
    },
    []
  );

  // ============================================
  // Bulk Actions
  // ============================================

  /**
   * Ustaw wszystkie ćwiczenia na "utwórz nowe"
   */
  const setAllExercisesCreate = useCallback(() => {
    setState((prev) => {
      if (!prev.analysisResult) return prev;

      const newDecisions: Record<string, ExerciseDecision> = {};
      for (const exercise of prev.analysisResult.exercises) {
        newDecisions[exercise.tempId] = {
          tempId: exercise.tempId,
          action: "create",
          reuseExerciseId: undefined,
        };
      }

      return {
        ...prev,
        exerciseDecisions: newDecisions,
      };
    });
  }, []);

  /**
   * Ustaw wszystkie ćwiczenia na "pomiń"
   */
  const setAllExercisesSkip = useCallback(() => {
    setState((prev) => {
      if (!prev.analysisResult) return prev;

      const newDecisions: Record<string, ExerciseDecision> = {};
      for (const exercise of prev.analysisResult.exercises) {
        newDecisions[exercise.tempId] = {
          tempId: exercise.tempId,
          action: "skip",
          reuseExerciseId: undefined,
        };
      }

      return {
        ...prev,
        exerciseDecisions: newDecisions,
      };
    });
  }, []);

  /**
   * Użyj dopasowań AI dla ćwiczeń z sugestiami
   */
  const useAllMatchedExercises = useCallback(() => {
    setState((prev) => {
      if (!prev.analysisResult) return prev;

      const newDecisions: Record<string, ExerciseDecision> = { ...prev.exerciseDecisions };

      for (const exercise of prev.analysisResult.exercises) {
        const suggestions = prev.analysisResult.matchSuggestions[exercise.tempId];
        if (suggestions && suggestions.length > 0) {
          const bestMatch = suggestions[0];
          newDecisions[exercise.tempId] = {
            tempId: exercise.tempId,
            action: "reuse",
            reuseExerciseId: bestMatch.existingExerciseId,
          };
        }
      }

      return {
        ...prev,
        exerciseDecisions: newDecisions,
      };
    });
  }, []);

  // ============================================
  // Navigation
  // ============================================

  const goToStep = useCallback((step: ImportWizardStep) => {
    setState((prev) => ({ ...prev, step }));
  }, []);

  const goNext = useCallback(() => {
    setState((prev) => {
      const stepOrder: ImportWizardStep[] = [
        "upload",
        "processing",
        "review-exercises",
        "review-sets",
        "summary",
      ];
      const currentIndex = stepOrder.indexOf(prev.step);
      const nextStep = stepOrder[currentIndex + 1] || prev.step;
      return { ...prev, step: nextStep };
    });
  }, []);

  const goBack = useCallback(() => {
    setState((prev) => {
      const stepOrder: ImportWizardStep[] = [
        "upload",
        "processing",
        "review-exercises",
        "review-sets",
        "summary",
      ];
      const currentIndex = stepOrder.indexOf(prev.step);
      const prevStep = stepOrder[currentIndex - 1] || prev.step;
      return { ...prev, step: prevStep };
    });
  }, []);

  // ============================================
  // Import
  // ============================================

  const buildImportRequest = useCallback((): DocumentImportRequest => {
    const { analysisResult, exerciseDecisions, setDecisions, noteDecisions, selectedPatientId, assignSetsToPatient } =
      state;

    if (!analysisResult) {
      return {
        exercisesToCreate: [],
        exercisesToReuse: {},
        exerciseSetsToCreate: [],
        clinicalNotesToCreate: [],
      };
    }

    // Ćwiczenia do utworzenia
    const exercisesToCreate: ExerciseImportItem[] = [];
    const exercisesToReuse: Record<string, string> = {};

    for (const exercise of analysisResult.exercises) {
      const decision = exerciseDecisions[exercise.tempId];
      if (!decision || decision.action === "skip") continue;

      if (decision.action === "reuse" && decision.reuseExerciseId) {
        exercisesToReuse[exercise.tempId] = decision.reuseExerciseId;
      } else if (decision.action === "create") {
        const editedData = decision.editedData || {};
        exercisesToCreate.push({
          tempId: exercise.tempId,
          name: editedData.name || exercise.name,
          description: editedData.description || exercise.description,
          type: editedData.type || exercise.type,
          sets: editedData.sets || exercise.sets || 3,
          reps: editedData.reps ?? exercise.reps,
          duration: editedData.duration ?? exercise.duration,
          restSets: editedData.restBetweenSets ?? exercise.restBetweenSets,
          restReps: editedData.restBetweenReps ?? exercise.restBetweenReps,
          exerciseSide: editedData.exerciseSide || exercise.exerciseSide,
          tagIds: editedData.suggestedTags || exercise.suggestedTags || [],
          notes: editedData.notes || exercise.notes,
        });
      }
    }

    // Zestawy do utworzenia
    const exerciseSetsToCreate: ExerciseSetImportItem[] = [];

    for (const set of analysisResult.exerciseSets) {
      const decision = setDecisions[set.tempId];
      if (!decision || decision.action === "skip") continue;

      // Filtruj ćwiczenia które nie są pominięte
      const validExerciseTempIds = set.exerciseTempIds.filter((tempId) => {
        const exDecision = exerciseDecisions[tempId];
        return exDecision && exDecision.action !== "skip";
      });

      if (validExerciseTempIds.length === 0) continue;

      exerciseSetsToCreate.push({
        tempId: set.tempId,
        name: decision.editedName || set.name,
        description: decision.editedDescription || set.description,
        exercises: validExerciseTempIds.map((tempId, index) => ({
          exerciseTempId: tempId,
          order: index + 1,
        })),
        isTemplate: false,
      });
    }

    // Notatki do utworzenia - tylko jeśli jest pacjent
    const clinicalNotesToCreate: ClinicalNoteImportItem[] = [];

    if (selectedPatientId) {
      for (const note of analysisResult.clinicalNotes) {
        const decision = noteDecisions[note.tempId];
        if (!decision || decision.action === "skip") continue;

        clinicalNotesToCreate.push({
          tempId: note.tempId,
          noteType: note.noteType,
          title: note.title,
          content: decision.editedContent || note.content,
        });
      }
    }

    return {
      patientId: selectedPatientId,
      exercisesToCreate,
      exercisesToReuse,
      exerciseSetsToCreate,
      clinicalNotesToCreate,
      assignToPatient: assignSetsToPatient && !!selectedPatientId,
    };
  }, [state]);

  const executeImport = useCallback(async () => {
    setState((prev) => ({ ...prev, isImporting: true, error: null }));

    try {
      const request = buildImportRequest();
      const result = await documentImportService.importData(request);

      setState((prev) => ({
        ...prev,
        isImporting: false,
        importResult: result,
        step: "summary",
      }));

      return result;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isImporting: false,
        error:
          error instanceof Error ? error.message : "Błąd podczas importu",
      }));
      return null;
    }
  }, [buildImportRequest]);

  // ============================================
  // Reset
  // ============================================

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  // ============================================
  // Computed values
  // ============================================

  const stats = useMemo(() => {
    const { analysisResult, exerciseDecisions, setDecisions, noteDecisions } =
      state;

    if (!analysisResult) {
      return {
        totalExercises: 0,
        exercisesToCreate: 0,
        exercisesToReuse: 0,
        exercisesToSkip: 0,
        exercisesWithMatches: 0,
        totalSets: 0,
        setsToCreate: 0,
        setsToSkip: 0,
        totalNotes: 0,
        notesToCreate: 0,
        notesToSkip: 0,
      };
    }

    const exerciseStats = Object.values(exerciseDecisions).reduce(
      (acc, d) => {
        if (d.action === "create") acc.create++;
        else if (d.action === "reuse") acc.reuse++;
        else acc.skip++;
        return acc;
      },
      { create: 0, reuse: 0, skip: 0 }
    );

    // Zlicz ćwiczenia z dopasowaniami
    let exercisesWithMatches = 0;
    for (const exercise of analysisResult.exercises) {
      if (analysisResult.matchSuggestions[exercise.tempId]?.length > 0) {
        exercisesWithMatches++;
      }
    }

    const setStats = Object.values(setDecisions).reduce(
      (acc, d) => {
        if (d.action === "create") acc.create++;
        else acc.skip++;
        return acc;
      },
      { create: 0, skip: 0 }
    );

    const noteStats = Object.values(noteDecisions).reduce(
      (acc, d) => {
        if (d.action === "create") acc.create++;
        else acc.skip++;
        return acc;
      },
      { create: 0, skip: 0 }
    );

    return {
      totalExercises: analysisResult.exercises.length,
      exercisesToCreate: exerciseStats.create,
      exercisesToReuse: exerciseStats.reuse,
      exercisesToSkip: exerciseStats.skip,
      exercisesWithMatches,
      totalSets: analysisResult.exerciseSets.length,
      setsToCreate: setStats.create,
      setsToSkip: setStats.skip,
      totalNotes: analysisResult.clinicalNotes.length,
      notesToCreate: noteStats.create,
      notesToSkip: noteStats.skip,
    };
  }, [state]);

  /**
   * Filtrowane ćwiczenia według aktywnego filtra
   */
  const filteredExercises = useMemo(() => {
    if (!state.analysisResult) return [];

    const { exerciseFilter, exerciseDecisions, analysisResult } = state;

    return analysisResult.exercises.filter((exercise) => {
      const decision = exerciseDecisions[exercise.tempId];
      const hasSuggestions = (analysisResult.matchSuggestions[exercise.tempId]?.length || 0) > 0;

      switch (exerciseFilter) {
        case 'all':
          return true;
        case 'create':
          return decision?.action === 'create';
        case 'reuse':
          return decision?.action === 'reuse';
        case 'skip':
          return decision?.action === 'skip';
        case 'matched':
          return hasSuggestions;
        default:
          return true;
      }
    });
  }, [state]);

  const canProceed = useMemo(() => {
    switch (state.step) {
      case "upload":
        return !!state.file;
      case "processing":
        return false;
      case "review-exercises":
        return stats.exercisesToCreate + stats.exercisesToReuse > 0;
      case "review-sets":
        return true; // Zestawy są opcjonalne
      case "summary":
        return !!state.importResult?.success;
      default:
        return false;
    }
  }, [state.step, state.file, state.importResult, stats]);

  return {
    // State
    ...state,
    stats,
    canProceed,
    filteredExercises,

    // Actions
    setFile,
    setPatientId,
    setAssignSetsToPatient,
    setExerciseFilter,
    analyzeDocument,
    updateExerciseDecision,
    updateSetDecision,
    updateNoteDecision,

    // Bulk Actions
    setAllExercisesCreate,
    setAllExercisesSkip,
    useAllMatchedExercises,

    // Navigation
    goToStep,
    goNext,
    goBack,
    executeImport,
    reset,

    // Helpers
    buildImportRequest,
  };
}

export type UseDocumentImportReturn = ReturnType<typeof useDocumentImport>;
