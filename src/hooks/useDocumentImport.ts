"use client";

import { useState, useCallback, useMemo } from "react";
import { documentImportService } from "@/services/documentImportService";
import type {
  ImportState,
  ImportWizardStep,
  DocumentAnalysisResult,
  ExerciseDecision,
  ExerciseSetDecision,
  ClinicalNoteDecision,
  DocumentImportRequest,
  DocumentImportResult,
  ExerciseImportItem,
  ExerciseSetImportItem,
  ClinicalNoteImportItem,
} from "@/types/import.types";

const initialState: ImportState = {
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
};

/**
 * Hook do zarządzania procesem importu dokumentów
 */
export function useDocumentImport() {
  const [state, setState] = useState<ImportState>(initialState);

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
  // Decisions
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
    const { analysisResult, exerciseDecisions, setDecisions, noteDecisions } =
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

    // Notatki do utworzenia
    const clinicalNotesToCreate: ClinicalNoteImportItem[] = [];

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

    return {
      patientId: state.selectedPatientId,
      exercisesToCreate,
      exercisesToReuse,
      exerciseSetsToCreate,
      clinicalNotesToCreate,
      assignToPatient: !!state.selectedPatientId,
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
      totalSets: analysisResult.exerciseSets.length,
      setsToCreate: setStats.create,
      setsToSkip: setStats.skip,
      totalNotes: analysisResult.clinicalNotes.length,
      notesToCreate: noteStats.create,
      notesToSkip: noteStats.skip,
    };
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

    // Actions
    setFile,
    setPatientId,
    analyzeDocument,
    updateExerciseDecision,
    updateSetDecision,
    updateNoteDecision,
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
