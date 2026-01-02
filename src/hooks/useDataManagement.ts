"use client";

import { useState, useEffect, useCallback } from "react";
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

interface UseDataManagementOptions {
  organizationId: string | undefined;
  onImportSuccess?: () => void;
  onClearSuccess?: () => void;
}

/**
 * Hook do zarządzania danymi organizacji - import przykładowych zestawów i usuwanie danych.
 * Odpowiednik logiki z mobile app resources-manager.
 */
export function useDataManagement({
  organizationId,
  onImportSuccess,
  onClearSuccess,
}: UseDataManagementOptions) {
  const [hasImportedExamples, setHasImportedExamples] = useState(false);

  // Klucz localStorage dla danej organizacji
  const EXAMPLE_SETS_IMPORTED_KEY = `exampleSetsImported_${organizationId}`;

  // Sprawdź przy montowaniu czy przykłady zostały już zaimportowane
  useEffect(() => {
    if (!organizationId) return;

    try {
      const imported = localStorage.getItem(EXAMPLE_SETS_IMPORTED_KEY);
      setHasImportedExamples(imported === "true");
    } catch {
      console.error("Błąd podczas sprawdzania flagi importu");
    }
  }, [organizationId, EXAMPLE_SETS_IMPORTED_KEY]);

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
  const [createExampleSetsMutation, { loading: isImporting }] = useMutation(
    CREATE_EXAMPLE_EXERCISE_SETS_MUTATION
  );

  // Mutacja usuwania wszystkich danych
  const [clearAllDataMutation, { loading: isClearing }] = useMutation(
    CLEAR_ALL_DATA_MUTATION
  );

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

      const result = data?.createExampleExerciseSets as ImportResult | undefined;

      if (result?.success) {
        // Zapisz flagę że zestawy zostały zaimportowane
        localStorage.setItem(EXAMPLE_SETS_IMPORTED_KEY, "true");
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
    EXAMPLE_SETS_IMPORTED_KEY,
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

        const result = data?.clearAllData as ClearResult | undefined;

        if (result?.success) {
          // Reset flagi importu - pozwól na ponowny import
          localStorage.removeItem(EXAMPLE_SETS_IMPORTED_KEY);
          setHasImportedExamples(false);

          // Parsuj usunięte liczniki
          const counts = Object.fromEntries(
            result.deletedCounts.map((pair) => [pair.key, pair.value])
          );

          toast.success(
            `Usunięto: ${counts.Exercises || 0} ćwiczeń, ${counts.ExerciseSets || 0} zestawów, ${counts.ExerciseTags || 0} tagów, ${counts.TagCategories || 0} kategorii`
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
    [organizationId, clearAllDataMutation, getRefetchQueries, EXAMPLE_SETS_IMPORTED_KEY, onClearSuccess]
  );

  /**
   * Resetuje flagę importu (do testów / debugowania)
   */
  const resetImportFlag = useCallback(() => {
    localStorage.removeItem(EXAMPLE_SETS_IMPORTED_KEY);
    setHasImportedExamples(false);
  }, [EXAMPLE_SETS_IMPORTED_KEY]);

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

