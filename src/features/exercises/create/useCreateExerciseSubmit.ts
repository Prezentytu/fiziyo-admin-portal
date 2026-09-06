'use client';

import { useCallback } from 'react';

interface UseCreateExerciseSubmitOptions {
  onSuccess?: (exerciseId: string) => void;
}

export function useCreateExerciseSubmit({ onSuccess }: UseCreateExerciseSubmitOptions = {}) {
  return useCallback(
    (exerciseId: string) => {
      onSuccess?.(exerciseId);
    },
    [onSuccess]
  );
}
