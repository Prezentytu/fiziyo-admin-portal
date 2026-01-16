import { useCallback, useState } from "react";
import { useMutation } from "@apollo/client";
import { toast } from "sonner";
import {
  APPROVE_EXERCISE_MUTATION,
  SET_EXERCISE_RELATIONS_BATCH_MUTATION,
} from "@/graphql/mutations/adminExercises.mutations";
import type {
  AdminExercise,
  ExerciseRelationTarget,
} from "@/graphql/types/adminExercise.types";

interface UseVerificationApproveOptions {
  /** Callback po sukcesie */
  onSuccess?: (approvedExercise: AdminExercise) => void;
  /** Callback po błędzie */
  onError?: (error: Error) => void;
}

interface ApproveWithRelationsParams {
  /** ID ćwiczenia do zatwierdzenia */
  exerciseId: string;
  /** Notatki recenzenta (opcjonalne) */
  reviewNotes?: string | null;
  /** Regresja (łatwiejsze ćwiczenie) */
  regression?: ExerciseRelationTarget | null;
  /** Progresja (trudniejsze ćwiczenie) */
  progression?: ExerciseRelationTarget | null;
}

/**
 * useVerificationApprove - Hook do zatwierdzania ćwiczenia z relacjami
 *
 * Funkcje:
 * - Zatwierdza ćwiczenie (zmienia status na Approved)
 * - Zapisuje relacje regresja/progresja (batch)
 * - Buduje "FiziYo Knowledge Graph"
 *
 * Flow:
 * 1. Zapisz relacje (jeśli są)
 * 2. Zatwierdź ćwiczenie
 * 3. Powiadom o sukcesie
 */
export function useVerificationApprove({
  onSuccess,
  onError,
}: UseVerificationApproveOptions = {}) {
  const [isApproving, setIsApproving] = useState(false);

  // Mutation: Approve exercise
  const [approveExercise] = useMutation(APPROVE_EXERCISE_MUTATION);

  // Mutation: Set relations batch
  const [setRelationsBatch] = useMutation(SET_EXERCISE_RELATIONS_BATCH_MUTATION);

  /**
   * Zatwierdź ćwiczenie z relacjami
   */
  const approveWithRelations = useCallback(
    async ({
      exerciseId,
      reviewNotes,
      regression,
      progression,
    }: ApproveWithRelationsParams): Promise<AdminExercise | null> => {
      setIsApproving(true);

      try {
        // 1. Zapisz relacje (jeśli są)
        if (regression || progression) {
          await setRelationsBatch({
            variables: {
              exerciseId,
              regressionId: regression?.id || null,
              progressionId: progression?.id || null,
            },
          });
        }

        // 2. Zatwierdź ćwiczenie
        const { data } = await approveExercise({
          variables: {
            exerciseId,
            reviewNotes,
          },
        });

        const approvedExercise = data?.approveExercise;

        if (approvedExercise) {
          // 3. Powiadom o sukcesie
          const hasRelations = regression || progression;
          toast.success(
            hasRelations
              ? "Ćwiczenie zatwierdzone z relacjami"
              : "Ćwiczenie zatwierdzone",
            {
              description: hasRelations
                ? "Graf wiedzy został zaktualizowany"
                : undefined,
            }
          );

          onSuccess?.(approvedExercise);
          return approvedExercise;
        }

        return null;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        toast.error(`Błąd zatwierdzania: ${error.message}`);
        onError?.(error);
        return null;
      } finally {
        setIsApproving(false);
      }
    },
    [approveExercise, setRelationsBatch, onSuccess, onError]
  );

  /**
   * Zatwierdź ćwiczenie (bez relacji)
   */
  const approve = useCallback(
    async (
      exerciseId: string,
      reviewNotes?: string | null
    ): Promise<AdminExercise | null> => {
      return approveWithRelations({
        exerciseId,
        reviewNotes,
        regression: null,
        progression: null,
      });
    },
    [approveWithRelations]
  );

  return {
    /** Zatwierdź z relacjami */
    approveWithRelations,
    /** Zatwierdź bez relacji */
    approve,
    /** Czy trwa zatwierdzanie */
    isApproving,
  };
}

/**
 * Typ dla stanu relacji w komponencie weryfikacji
 */
export interface VerificationRelationsState {
  regression: ExerciseRelationTarget | null;
  progression: ExerciseRelationTarget | null;
}

/**
 * Hook do zarządzania stanem relacji podczas weryfikacji
 */
export function useVerificationRelationsState(
  initialRegression?: ExerciseRelationTarget | null,
  initialProgression?: ExerciseRelationTarget | null
) {
  const [relations, setRelations] = useState<VerificationRelationsState>({
    regression: initialRegression || null,
    progression: initialProgression || null,
  });

  const setRegression = useCallback((exercise: ExerciseRelationTarget | null) => {
    setRelations((prev) => ({ ...prev, regression: exercise }));
  }, []);

  const setProgression = useCallback((exercise: ExerciseRelationTarget | null) => {
    setRelations((prev) => ({ ...prev, progression: exercise }));
  }, []);

  const clearRelations = useCallback(() => {
    setRelations({ regression: null, progression: null });
  }, []);

  const hasRelations = relations.regression !== null || relations.progression !== null;

  return {
    relations,
    setRelations,
    setRegression,
    setProgression,
    clearRelations,
    hasRelations,
  };
}
