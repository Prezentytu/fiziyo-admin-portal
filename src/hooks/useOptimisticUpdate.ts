import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';

interface UseOptimisticUpdateOptions<T> {
  /** Funkcja wykonująca rzeczywistą aktualizację (np. mutation) */
  onCommit: (value: T) => Promise<void>;
  /** Callback wywoływany przy błędzie (po rollback) */
  onRollback?: (error: Error, previousValue: T) => void;
  /** Callback wywoływany po sukcesie */
  onSuccess?: (value: T) => void;
  /** Debounce w ms (0 = brak debounce) */
  debounceMs?: number;
  /** Czy pokazywać toast przy błędzie */
  showErrorToast?: boolean;
}

interface UseOptimisticUpdateReturn<T> {
  /** Aktualna wartość (optimistic lub rzeczywista) */
  value: T | null;
  /** Status operacji */
  status: 'idle' | 'pending' | 'error';
  /** Czy trwa zapisywanie */
  isPending: boolean;
  /** Czy wystąpił błąd */
  isError: boolean;
  /** Ostatni błąd */
  error: Error | null;
  /** Zatwierdź nową wartość (optimistic) */
  commit: (newValue: T) => Promise<void>;
  /** Resetuj stan */
  reset: () => void;
}

/**
 * Hook do obsługi Optimistic UI updates
 *
 * Zasada: UI "kłamie", że operacja się udała, zanim backend potwierdzi.
 *
 * @example
 * ```tsx
 * const { value, status, commit } = useOptimisticUpdate({
 *   onCommit: async (newName) => {
 *     await updateExerciseName(exerciseId, newName);
 *   },
 *   onRollback: (error) => {
 *     toast.error(`Nie udało się zapisać: ${error.message}`);
 *   }
 * });
 *
 * // W komponencie:
 * <Input
 *   value={value ?? exercise.name}
 *   onChange={(e) => commit(e.target.value)}
 * />
 * ```
 */
export function useOptimisticUpdate<T>({
  onCommit,
  onRollback,
  onSuccess,
  debounceMs = 0,
  showErrorToast = true,
}: UseOptimisticUpdateOptions<T>): UseOptimisticUpdateReturn<T> {
  const [optimisticValue, setOptimisticValue] = useState<T | null>(null);
  const [status, setStatus] = useState<'idle' | 'pending' | 'error'>('idle');
  const [error, setError] = useState<Error | null>(null);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const previousValueRef = useRef<T | null>(null);

  const commit = useCallback(
    async (newValue: T) => {
      // Clear any pending debounce
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      // Store previous value for rollback
      previousValueRef.current = optimisticValue;

      // Optimistic update - natychmiast pokazuj nową wartość
      setOptimisticValue(newValue);
      setStatus('pending');
      setError(null);

      const executeCommit = async () => {
        try {
          await onCommit(newValue);
          setStatus('idle');
          onSuccess?.(newValue);
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));

          // Rollback
          setOptimisticValue(previousValueRef.current);
          setStatus('error');
          setError(error);

          if (showErrorToast) {
            toast.error(`Nie udało się zapisać: ${error.message}`);
          }

          onRollback?.(error, previousValueRef.current as T);

          // Reset error status after delay
          setTimeout(() => {
            setStatus('idle');
            setError(null);
          }, 3000);
        }
      };

      if (debounceMs > 0) {
        debounceRef.current = setTimeout(executeCommit, debounceMs);
      } else {
        await executeCommit();
      }
    },
    [onCommit, onRollback, onSuccess, optimisticValue, debounceMs, showErrorToast]
  );

  const reset = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    setOptimisticValue(null);
    setStatus('idle');
    setError(null);
  }, []);

  return {
    value: optimisticValue,
    status,
    isPending: status === 'pending',
    isError: status === 'error',
    error,
    commit,
    reset,
  };
}
