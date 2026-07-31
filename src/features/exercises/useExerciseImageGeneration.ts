'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { aiService } from '@/services/aiService';
import type { ExerciseImageErrorCode, ImageStyle } from '@/types/ai.types';

export interface GenerateExerciseImageParams {
  exerciseName: string;
  exerciseDescription?: string;
  exerciseType?: 'reps' | 'time';
  style?: ImageStyle;
}

export interface UseExerciseImageGenerationOptions {
  /** Called after a successful generation with the File ready for preview/upload */
  onSuccess?: (file: File) => void | Promise<void>;
  /** Show toast with retry action on failure (default true) */
  showErrorToast?: boolean;
  /** Show success toast after generation (default true) */
  showSuccessToast?: boolean;
  successMessage?: string;
}

function messageForError(code: ExerciseImageErrorCode, fallback: string): string {
  switch (code) {
    case 'missing_name':
      return 'Wpisz nazwę ćwiczenia, aby wygenerować obraz.';
    case 'safety_blocked':
      return 'Obraz został odrzucony przez filtr bezpieczeństwa. Zmień nazwę lub opis ćwiczenia.';
    case 'insufficient_credits':
      return 'Funkcja chwilowo niedostępna. Spróbuj ponownie za chwilę.';
    case 'rate_limited':
      return 'Dostawca AI jest chwilowo przeciążony. Spróbuj ponownie.';
    case 'cancelled':
      return 'Generowanie obrazu zostało anulowane.';
    case 'provider_unavailable':
    case 'invalid_output':
    case 'unknown':
    default:
      return fallback || 'Nie udało się wygenerować obrazu. Spróbuj ponownie.';
  }
}

export function useExerciseImageGeneration(options: UseExerciseImageGenerationOptions = {}) {
  const {
    onSuccess,
    showErrorToast = true,
    showSuccessToast = true,
    successMessage = 'Obraz został wygenerowany',
  } = options;
  const [isGenerating, setIsGenerating] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const [imageStyle, setImageStyle] = useState<ImageStyle>('illustration');
  const abortRef = useRef<AbortController | null>(null);
  const lastParamsRef = useRef<GenerateExerciseImageParams | null>(null);
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const generate = useCallback(
    async (params: GenerateExerciseImageParams): Promise<File | null> => {
      const name = params.exerciseName.trim();
      if (!name || name.length < 2) {
        if (showErrorToast) {
          toast.error(messageForError('missing_name', ''));
        }
        return null;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      lastParamsRef.current = { ...params, style: params.style ?? imageStyle };

      setIsGenerating(true);
      setAttemptCount((prev) => prev + 1);

      try {
        const result = await aiService.generateExerciseImage(
          name,
          params.exerciseDescription,
          params.exerciseType,
          params.style ?? imageStyle,
          { signal: controller.signal }
        );

        if (controller.signal.aborted) {
          return null;
        }

        if (result.status === 'ok') {
          await onSuccessRef.current?.(result.file);
          if (showSuccessToast) {
            toast.success(successMessage);
          }
          return result.file;
        }

        if (result.code === 'cancelled') {
          return null;
        }

        if (showErrorToast) {
          toast.error(messageForError(result.code, result.message), {
            action: {
              label: 'Spróbuj ponownie',
              onClick: () => {
                const last = lastParamsRef.current;
                if (last) {
                  void generate(last);
                }
              },
            },
          });
        }

        return null;
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
          setIsGenerating(false);
        }
      }
    },
    [imageStyle, showErrorToast, showSuccessToast, successMessage]
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsGenerating(false);
  }, []);

  return {
    generate,
    cancel,
    isGenerating,
    attemptCount,
    imageStyle,
    setImageStyle,
  };
}
