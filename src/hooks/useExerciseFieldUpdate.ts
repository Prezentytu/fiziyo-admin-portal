import { useCallback, useState, useRef } from "react";
import { useMutation, useApolloClient } from "@apollo/client/react";
import { toast } from "sonner";
import {
  UPDATE_EXERCISE_FIELD_MUTATION,
  BATCH_UPDATE_EXERCISE_FIELDS_MUTATION,
} from "@/graphql/mutations/adminExercises.mutations";
import type { AdminExercise } from "@/graphql/types/adminExercise.types";

interface UseExerciseFieldUpdateOptions {
  /** ID ćwiczenia */
  exerciseId: string;
  /** Callback po sukcesie */
  onSuccess?: (field: string, value: unknown) => void;
  /** Callback po błędzie */
  onError?: (field: string, error: Error) => void;
  /** Debounce w ms dla batch updates */
  debounceMs?: number;
}

interface UseExerciseFieldUpdateReturn {
  /** Aktualizuj pojedyncze pole */
  updateField: <T>(field: string, value: T) => Promise<void>;
  /** Aktualizuj wiele pól naraz */
  updateFields: (updates: Record<string, unknown>) => Promise<void>;
  /** Czy trwa zapisywanie */
  isUpdating: boolean;
  /** Pola aktualnie zapisywane */
  pendingFields: Set<string>;
  /** Ostatni błąd */
  error: Error | null;
}

/**
 * useExerciseFieldUpdate - Hook do aktualizacji pól ćwiczenia z Optimistic UI
 *
 * Funkcje:
 * - Optimistic response: UI aktualizuje się natychmiast
 * - Rollback: przy błędzie przywraca poprzednią wartość
 * - Debounce: opcjonalne grupowanie zmian
 * - Cache update: automatyczna aktualizacja Apollo cache
 *
 * @example
 * ```tsx
 * const { updateField, isUpdating } = useExerciseFieldUpdate({
 *   exerciseId: exercise.id,
 *   onSuccess: (field) => console.log(`Updated ${field}`),
 * });
 *
 * // W komponencie:
 * <InlineEditField
 *   value={exercise.name}
 *   onCommit={(value) => updateField('name', value)}
 * />
 * ```
 */
export function useExerciseFieldUpdate({
  exerciseId,
  onSuccess,
  onError,
  debounceMs = 0,
}: UseExerciseFieldUpdateOptions): UseExerciseFieldUpdateReturn {
  const client = useApolloClient();
  const [pendingFields, setPendingFields] = useState<Set<string>>(new Set());
  const [error, setError] = useState<Error | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const pendingUpdatesRef = useRef<Record<string, unknown>>({});

  // Single field mutation
  const [updateFieldMutation] = useMutation(UPDATE_EXERCISE_FIELD_MUTATION, {
    onError: (err) => {
      setError(err);
      toast.error(`Nie udało się zapisać: ${err.message}`);
    },
  });

  // Batch update mutation
  const [batchUpdateMutation] = useMutation(BATCH_UPDATE_EXERCISE_FIELDS_MUTATION, {
    onError: (err) => {
      setError(err);
      toast.error(`Nie udało się zapisać zmian: ${err.message}`);
    },
  });

  // Update single field with optimistic response
  const updateField = useCallback(
    async <T,>(field: string, value: T) => {
      setPendingFields((prev) => new Set(prev).add(field));
      setError(null);

      try {
        await updateFieldMutation({
          variables: {
            exerciseId,
            field,
            value,
          },
          optimisticResponse: {
            updateExerciseField: {
              __typename: "AdminExercise",
              id: exerciseId,
              [field]: value,
            },
          },
          update: (cache, { data }) => {
            if (data?.updateExerciseField) {
              // Update cache with new value
              cache.modify({
                id: cache.identify({ __typename: "AdminExercise", id: exerciseId }),
                fields: {
                  [field]: () => value,
                },
              });
            }
          },
        });

        onSuccess?.(field, value);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        onError?.(field, error);
        throw error;
      } finally {
        setPendingFields((prev) => {
          const next = new Set(prev);
          next.delete(field);
          return next;
        });
      }
    },
    [exerciseId, updateFieldMutation, onSuccess, onError]
  );

  // Update multiple fields at once
  const updateFields = useCallback(
    async (updates: Record<string, unknown>) => {
      const fields = Object.keys(updates);
      setPendingFields((prev) => {
        const next = new Set(prev);
        fields.forEach((f) => next.add(f));
        return next;
      });
      setError(null);

      try {
        await batchUpdateMutation({
          variables: {
            exerciseId,
            updates,
          },
          optimisticResponse: {
            batchUpdateExerciseFields: {
              __typename: "AdminExercise",
              id: exerciseId,
              ...updates,
            },
          },
          update: (cache, { data }) => {
            if (data?.batchUpdateExerciseFields) {
              // Update cache with all new values
              cache.modify({
                id: cache.identify({ __typename: "AdminExercise", id: exerciseId }),
                fields: Object.fromEntries(
                  Object.entries(updates).map(([field, value]) => [
                    field,
                    () => value,
                  ])
                ),
              });
            }
          },
        });

        fields.forEach((field) => onSuccess?.(field, updates[field]));
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        fields.forEach((field) => onError?.(field, error));
        throw error;
      } finally {
        setPendingFields((prev) => {
          const next = new Set(prev);
          fields.forEach((f) => next.delete(f));
          return next;
        });
      }
    },
    [exerciseId, batchUpdateMutation, onSuccess, onError]
  );

  return {
    updateField,
    updateFields,
    isUpdating: pendingFields.size > 0,
    pendingFields,
    error,
  };
}

/**
 * Hook do debounced batch updates
 * Grupuje zmiany i wysyła je razem po określonym czasie
 */
interface UseDebouncedExerciseUpdateOptions extends UseExerciseFieldUpdateOptions {
  /** Debounce w ms (domyślnie 500ms) */
  debounceMs?: number;
}

export function useDebouncedExerciseUpdate({
  exerciseId,
  onSuccess,
  onError,
  debounceMs = 500,
}: UseDebouncedExerciseUpdateOptions) {
  const [pendingChanges, setPendingChanges] = useState<Record<string, unknown>>({});
  const [isSaving, setIsSaving] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const [batchUpdateMutation] = useMutation(BATCH_UPDATE_EXERCISE_FIELDS_MUTATION);

  // Queue a field update
  const queueUpdate = useCallback(
    <T,>(field: string, value: T) => {
      // Clear existing timeout
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      // Add to pending changes
      setPendingChanges((prev) => ({ ...prev, [field]: value }));

      // Schedule batch save
      debounceRef.current = setTimeout(async () => {
        const changes = { ...pendingChanges, [field]: value };

        if (Object.keys(changes).length === 0) return;

        setIsSaving(true);
        try {
          await batchUpdateMutation({
            variables: {
              exerciseId,
              updates: changes,
            },
          });
          setPendingChanges({});
          Object.entries(changes).forEach(([f, v]) => onSuccess?.(f, v));
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          Object.keys(changes).forEach((f) => onError?.(f, error));
          toast.error("Nie udało się zapisać zmian");
        } finally {
          setIsSaving(false);
        }
      }, debounceMs);
    },
    [exerciseId, pendingChanges, batchUpdateMutation, onSuccess, onError, debounceMs]
  );

  // Flush all pending changes immediately
  const flush = useCallback(async () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (Object.keys(pendingChanges).length === 0) return;

    setIsSaving(true);
    try {
      await batchUpdateMutation({
        variables: {
          exerciseId,
          updates: pendingChanges,
        },
      });
      const changes = { ...pendingChanges };
      setPendingChanges({});
      Object.entries(changes).forEach(([f, v]) => onSuccess?.(f, v));
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      Object.keys(pendingChanges).forEach((f) => onError?.(f, error));
      toast.error("Nie udało się zapisać zmian");
    } finally {
      setIsSaving(false);
    }
  }, [exerciseId, pendingChanges, batchUpdateMutation, onSuccess, onError]);

  return {
    queueUpdate,
    flush,
    pendingChanges,
    hasPendingChanges: Object.keys(pendingChanges).length > 0,
    isSaving,
  };
}
