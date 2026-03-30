import { useCallback, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { toast } from 'sonner';
import {
  UPDATE_EXERCISE_FIELD_MUTATION,
  BATCH_UPDATE_EXERCISE_FIELDS_MUTATION,
} from '@/graphql/mutations/adminExercises.mutations';
import type { AdminExercise } from '@/graphql/types/adminExercise.types';

interface UseExerciseFieldUpdateOptions {
  /** ID ćwiczenia */
  exerciseId: string;
  /** Callback po sukcesie */
  onSuccess?: (field: string, value: unknown) => void;
  /** Callback po błędzie */
  onError?: (field: string, error: Error) => void;
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
}: UseExerciseFieldUpdateOptions): UseExerciseFieldUpdateReturn {
  const [pendingFields, setPendingFields] = useState<Set<string>>(new Set());
  const [error, setError] = useState<Error | null>(null);

  // Single field mutation
  const [updateFieldMutation] = useMutation<{ updateExerciseField: AdminExercise }>(UPDATE_EXERCISE_FIELD_MUTATION, {
    onError: (err) => {
      setError(err);
      toast.error(`Nie udało się zapisać: ${err.message}`);
    },
  });

  // Batch update mutation
  const [batchUpdateMutation] = useMutation<{ batchUpdateExerciseFields: AdminExercise }>(
    BATCH_UPDATE_EXERCISE_FIELDS_MUTATION,
    {
      onError: (err) => {
        setError(err);
        toast.error(`Nie udało się zapisać zmian: ${err.message}`);
      },
    }
  );

  // Update single field with optimistic response
  const updateField = useCallback(
    async <T>(field: string, value: T) => {
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
              __typename: 'AdminExercise',
              id: exerciseId,
              [field]: value,
            } as unknown as AdminExercise,
          },
          update: (cache, { data }) => {
            if (data?.updateExerciseField) {
              // Update cache with new value
              cache.modify({
                id: cache.identify({ __typename: 'AdminExercise', id: exerciseId }),
                fields: {
                  [field]: () => value as never,
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
              __typename: 'AdminExercise',
              id: exerciseId,
              ...updates,
            } as unknown as AdminExercise,
          },
          update: (cache, { data }) => {
            if (data?.batchUpdateExerciseFields) {
              // Update cache with all new values
              cache.modify({
                id: cache.identify({ __typename: 'AdminExercise', id: exerciseId }),
                fields: Object.fromEntries(
                  Object.entries(updates).map(([field, value]) => [field, () => value as never])
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
