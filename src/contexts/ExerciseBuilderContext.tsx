'use client';

import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { calculateExerciseTotalSeconds } from '@/utils/exerciseTime';

// ========================================
// Types
// ========================================

export interface BuilderExercise {
  id: string;
  name: string;
  thumbnailUrl?: string;
  imageUrl?: string;
  images?: string[];
  description?: string;
  patientDescription?: string;
  clinicalDescription?: string;
  audioCue?: string;
  notes?: string;
  tempo?: string;
  side?: string;
  exerciseSide?: string;
  preparationTime?: number;
  defaultSets?: number;
  defaultReps?: number;
  defaultDuration?: number;
  defaultExecutionTime?: number;
  defaultRestBetweenSets?: number;
  defaultRestBetweenReps?: number;
  sets: number;
  reps: number;
  duration: number;
  executionTime?: number;
  restSets?: number;
  restReps?: number;
  customName?: string;
  customDescription?: string;
  loadType?: string;
  loadValue?: number;
  loadUnit?: string;
  loadText?: string;
  loadWeightKg?: number;
  loadSource?: string;
  type?: string;
}

interface ExerciseBuilderContextValue {
  /** Selected exercises in the builder */
  selectedExercises: BuilderExercise[];
  /** Add an exercise to the builder */
  addExercise: (exercise: BuilderExercise) => void;
  /** Remove an exercise from the builder */
  removeExercise: (exerciseId: string) => void;
  /** Update exercise parameters (sets, reps, duration) */
  updateExercise: (exerciseId: string, updates: Partial<BuilderExercise>) => void;
  /** Reorder exercises in the list */
  reorderExercises: (fromIndex: number, toIndex: number) => void;
  /** Clear all exercises from the builder */
  clearBuilder: () => void;
  /** Check if an exercise is in the builder */
  isInBuilder: (exerciseId: string) => boolean;
  /** Toggle exercise in builder (add if not present, remove if present) */
  toggleExercise: (exercise: BuilderExercise) => void;
  /** Get estimated time in minutes */
  estimatedTime: number;
  /** Whether the builder has any exercises */
  hasExercises: boolean;
  /** Count of exercises in builder */
  exerciseCount: number;
  /** Whether the AI chat is open */
  isChatOpen: boolean;
  /** Set whether the AI chat is open */
  setIsChatOpen: (isOpen: boolean) => void;
}

const ExerciseBuilderContext = createContext<ExerciseBuilderContextValue | null>(null);

// ========================================
// Local Storage Keys
// ========================================

const BUILDER_STORAGE_KEY = 'fizyo_exercise_builder';

function getStoredExercises(): BuilderExercise[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(BUILDER_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function setStoredExercises(exercises: BuilderExercise[]): void {
  if (typeof window === 'undefined') return;
  try {
    if (exercises.length === 0) {
      localStorage.removeItem(BUILDER_STORAGE_KEY);
    } else {
      localStorage.setItem(BUILDER_STORAGE_KEY, JSON.stringify(exercises));
    }
  } catch {
    // Ignore localStorage errors
  }
}

// ========================================
// Provider Component
// ========================================

interface ExerciseBuilderProviderProps {
  children: React.ReactNode;
}

export function ExerciseBuilderProvider({ children }: ExerciseBuilderProviderProps) {
  const [selectedExercises, setSelectedExercises] = useState<BuilderExercise[]>(() => getStoredExercises());
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Sync to localStorage whenever exercises change
  const updateExercises = useCallback((exercises: BuilderExercise[]) => {
    setSelectedExercises(exercises);
    setStoredExercises(exercises);
  }, []);

  const addExercise = useCallback((exercise: BuilderExercise) => {
    setSelectedExercises((prev) => {
      // Don't add duplicates
      if (prev.some((e) => e.id === exercise.id)) {
        return prev;
      }
      const updated = [...prev, exercise];
      setStoredExercises(updated);
      return updated;
    });
  }, []);

  const removeExercise = useCallback((exerciseId: string) => {
    setSelectedExercises((prev) => {
      const updated = prev.filter((e) => e.id !== exerciseId);
      setStoredExercises(updated);
      return updated;
    });
  }, []);

  const updateExercise = useCallback((exerciseId: string, updates: Partial<BuilderExercise>) => {
    setSelectedExercises((prev) => {
      const updated = prev.map((e) => (e.id === exerciseId ? { ...e, ...updates } : e));
      setStoredExercises(updated);
      return updated;
    });
  }, []);

  const reorderExercises = useCallback((fromIndex: number, toIndex: number) => {
    setSelectedExercises((prev) => {
      const updated = [...prev];
      const [removed] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, removed);
      setStoredExercises(updated);
      return updated;
    });
  }, []);

  const clearBuilder = useCallback(() => {
    updateExercises([]);
  }, [updateExercises]);

  const isInBuilder = useCallback(
    (exerciseId: string) => {
      return selectedExercises.some((e) => e.id === exerciseId);
    },
    [selectedExercises]
  );

  const toggleExercise = useCallback(
    (exercise: BuilderExercise) => {
      if (isInBuilder(exercise.id)) {
        removeExercise(exercise.id);
      } else {
        addExercise(exercise);
      }
    },
    [isInBuilder, removeExercise, addExercise]
  );

  // Keep sidebar summary aligned with set wizard total duration logic.
  const estimatedTime = useMemo(() => {
    const totalSeconds = selectedExercises.reduce((sum, exercise) => {
      const duration = calculateExerciseTotalSeconds({
        sets: exercise.sets ?? 0,
        reps: exercise.reps,
        duration: exercise.duration,
        executionTime: exercise.executionTime,
        restSets: exercise.restSets,
        restReps: exercise.restReps,
        preparationTime: exercise.preparationTime,
        tempo: exercise.tempo,
        side: exercise.exerciseSide ?? exercise.side,
      });

      return sum + duration.seconds;
    }, 0);

    return Math.ceil(totalSeconds / 60);
  }, [selectedExercises]);

  const hasExercises = selectedExercises.length > 0;
  const exerciseCount = selectedExercises.length;

  const value = useMemo<ExerciseBuilderContextValue>(
    () => ({
      selectedExercises,
      addExercise,
      removeExercise,
      updateExercise,
      reorderExercises,
      clearBuilder,
      isInBuilder,
      toggleExercise,
      estimatedTime,
      hasExercises,
      exerciseCount,
      isChatOpen,
      setIsChatOpen,
    }),
    [
      selectedExercises,
      addExercise,
      removeExercise,
      updateExercise,
      reorderExercises,
      clearBuilder,
      isInBuilder,
      toggleExercise,
      estimatedTime,
      hasExercises,
      exerciseCount,
      isChatOpen,
      setIsChatOpen,
    ]
  );

  return <ExerciseBuilderContext.Provider value={value}>{children}</ExerciseBuilderContext.Provider>;
}

// ========================================
// Hook
// ========================================

export function useExerciseBuilder() {
  const context = useContext(ExerciseBuilderContext);
  if (!context) {
    throw new Error('useExerciseBuilder must be used within an ExerciseBuilderProvider');
  }
  return context;
}
