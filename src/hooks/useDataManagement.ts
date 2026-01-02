"use client";

import { useReducer, useCallback, useSyncExternalStore } from "react";
import { useMutation } from "@apollo/client/react";
import { toast } from "sonner";
import {
  CREATE_EXAMPLE_EXERCISE_SETS_MUTATION,
  CLEAR_ALL_DATA_MUTATION,
} from "@/graphql/mutations/exercises.mutations";
import { GET_ORGANIZATION_EXERCISES_QUERY } from "@/graphql/queries/exercises.queries";
import { GET_ORGANIZATION_EXERCISE_SETS_QUERY } from "@/graphql/queries/exerciseSets.queries";
import { GET_EXERCISE_TAGS_BY_ORGANIZATION_QUERY } from "@/graphql/queries/exerciseTags.queries";
import { GET_TAG_CATEGORIES_BY_ORGANIZATION_QUERY } from "@/graphql/queries/tagCategories.queries";

interface ImportResult {
  success: boolean;
  setsCount: number;
  exercisesCount: number;
  categoriesCount: number;
  tagsCount: number;
  setNames: string[];
  errorMessage?: string;
}

interface ClearResult {
  success: boolean;
  deletedCounts: { key: string; value: number }[];
  errorMessage?: string;
}

interface CreateExampleSetsResponse {
  createExampleExerciseSets: ImportResult;
}

interface ClearAllDataResponse {
  clearAllData: ClearResult;
}

interface UseDataManagementOptions {
  organizationId: string | undefined;
  onImportSuccess?: () => void;
  onClearSuccess?: () => void;
}

/**
 * Hook do zarządzania danymi organizacji - import przykładowych zestawów i usuwanie danych.
 * Odpowiednik logiki z mobile app resources-manager.
 */
// Custom subscribe function for localStorage changes
function subscribeToStorage(callback: () => void) {
  globalThis.addEventListener("storage", callback);
  return () => globalThis.removeEventListener("storage", callback);
}

export function useDataManagement({ organizationId, onImportSuccess, onClearSuccess }: UseDataManagementOptions) {
  // Klucz localStorage dla danej organizacji
  const EXAMPLE_SETS_IMPORTED_KEY = `exampleSetsImported_${organizationId}`;

  // Force re-render trigger for local updates (since storage event only fires for other tabs)
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);

  // Read from localStorage using useSyncExternalStore
  const hasImportedExamples = useSyncExternalStore(
    subscribeToStorage,
    () => {
      if (!organizationId || globalThis.window === undefined) return false;
      try {
        return localStorage.getItem(EXAMPLE_SETS_IMPORTED_KEY) === "true";
      } catch {
        return false;
      }
    },
    () => false // Server snapshot
  );

  // Helper to update localStorage and trigger re-render
  const setHasImportedExamples = useCallback(
    (value: boolean) => {
      if (!organizationId) return;
      try {
        if (value) {
          localStorage.setItem(EXAMPLE_SETS_IMPORTED_KEY, "true");
        } else {
          localStorage.removeItem(EXAMPLE_SETS_IMPORTED_KEY);
        }
        forceUpdate();
      } catch {
        console.error("Błąd podczas zapisu flagi importu");
      }
    },
    [organizationId, EXAMPLE_SETS_IMPORTED_KEY]
  );

  // Funkcja pomocnicza do tworzenia listy queries do odświeżenia
  const getRefetchQueries = useCallback(() => {
    if (!organizationId) return [];
    return [
      { query: GET_ORGANIZATION_EXERCISE_SETS_QUERY, variables: { organizationId } },
      { query: GET_ORGANIZATION_EXERCISES_QUERY, variables: { organizationId } },
      { query: GET_EXERCISE_TAGS_BY_ORGANIZATION_QUERY, variables: { organizationId } },
      { query: GET_TAG_CATEGORIES_BY_ORGANIZATION_QUERY, variables: { organizationId } },
    ];
  }, [organizationId]);

  // Mutacja importu przykładowych zestawów
  const [createExampleSetsMutation, { loading: isImporting }] = useMutation<CreateExampleSetsResponse>(
    CREATE_EXAMPLE_EXERCISE_SETS_MUTATION
  );

  // Mutacja usuwania wszystkich danych
  const [clearAllDataMutation, { loading: isClearing }] = useMutation<ClearAllDataResponse>(CLEAR_ALL_DATA_MUTATION);

  /**
   * Importuje przykładowe zestawy ćwiczeń z backendu
   */
  const importExampleSets = useCallback(async (): Promise<boolean> => {
    if (!organizationId) {
      toast.error("Brak przypisanej organizacji");
      return false;
    }

    if (hasImportedExamples) {
      toast.info("Przykładowe zestawy zostały już wcześniej zaimportowane");
      return false;
    }

    try {
      const { data } = await createExampleSetsMutation({
        variables: { organizationId },
        refetchQueries: getRefetchQueries(),
        awaitRefetchQueries: true,
      });

      const result = data?.createExampleExerciseSets;

      if (result?.success) {
        // Zapisz flagę że zestawy zostały zaimportowane
        setHasImportedExamples(true);

        toast.success(
          `Zaimportowano: ${result.setsCount} zestawów, ${result.exercisesCount} ćwiczeń, ${result.categoriesCount} kategorii, ${result.tagsCount} tagów`
        );

        onImportSuccess?.();
        return true;
      } else {
        toast.error(result?.errorMessage || "Import przykładowych zestawów nie powiódł się");
        return false;
      }
    } catch (error) {
      console.error("Błąd podczas importu przykładowych zestawów:", error);
      toast.error("Wystąpił problem podczas importu przykładowych zestawów");
      return false;
    }
  }, [
    organizationId,
    hasImportedExamples,
    createExampleSetsMutation,
    getRefetchQueries,
    setHasImportedExamples,
    onImportSuccess,
  ]);

  /**
   * Usuwa wszystkie dane organizacji (ćwiczenia, zestawy, tagi, kategorie)
   * Wymaga hasła potwierdzającego
   */
  const clearAllData = useCallback(
    async (password: string): Promise<boolean> => {
      if (!organizationId) {
        toast.error("Brak przypisanej organizacji");
        return false;
      }

      if (!password) {
        toast.error("Hasło jest wymagane");
        return false;
      }

      try {
        const { data } = await clearAllDataMutation({
          variables: {
            organizationId,
            password,
          },
          refetchQueries: getRefetchQueries(),
          awaitRefetchQueries: true,
        });

        const result = data?.clearAllData;

        if (result?.success) {
          // Reset flagi importu - pozwól na ponowny import
          setHasImportedExamples(false);

          // Parsuj usunięte liczniki
          const counts = Object.fromEntries(result.deletedCounts.map((pair) => [pair.key, pair.value]));

          toast.success(
            `Usunięto: ${counts.Exercises || 0} ćwiczeń, ${counts.ExerciseSets || 0} zestawów, ${
              counts.ExerciseTags || 0
            } tagów, ${counts.TagCategories || 0} kategorii`
          );

          onClearSuccess?.();
          return true;
        } else {
          toast.error(result?.errorMessage || "Operacja nie powiodła się");
          return false;
        }
      } catch (error) {
        console.error("Błąd podczas czyszczenia danych:", error);
        const errorMessage = error instanceof Error ? error.message : "Nieznany błąd";
        toast.error(`Wystąpił problem podczas czyszczenia danych: ${errorMessage}`);
        return false;
      }
    },
    [organizationId, clearAllDataMutation, getRefetchQueries, setHasImportedExamples, onClearSuccess]
  );

  /**
   * Resetuje flagę importu (do testów / debugowania)
   */
  const resetImportFlag = useCallback(() => {
    setHasImportedExamples(false);
  }, [setHasImportedExamples]);

  return {
    // Stan
    hasImportedExamples,
    isImporting,
    isClearing,

    // Akcje
    importExampleSets,
    clearAllData,
    resetImportFlag,
  };
}
