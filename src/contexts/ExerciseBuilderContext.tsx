'use client';

import { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { exerciseBuilderKey } from '@/lib/auth/userBrowserState';
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
  /** Rekord w kontrakcie 3.3 (`isV33ExerciseRecord`): „naprzemiennie” liczy się na stronę. Brak: łącznie. */
  alternatingPerSide?: boolean;
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
  /** Estimated set duration (shared formatter with CreateSetWizard) */
  totalSetDuration: { seconds: number; isEstimate: boolean };
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

// The key depends on the organization: the cart holds its private exercises (userBrowserState.ts).
function getStoredExercises(storageKey: string | null): BuilderExercise[] {
  if (typeof window === 'undefined' || !storageKey) return [];
  try {
    const stored = localStorage.getItem(storageKey);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function setStoredExercises(storageKey: string | null, exercises: BuilderExercise[]): void {
  if (typeof window === 'undefined' || !storageKey) return;
  try {
    if (exercises.length === 0) {
      localStorage.removeItem(storageKey);
    } else {
      localStorage.setItem(storageKey, JSON.stringify(exercises));
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
  const { currentOrganization } = useOrganization();
  const storageKey = exerciseBuilderKey(currentOrganization?.organizationId);
  const storageKeyRef = useRef(storageKey);
  storageKeyRef.current = storageKey;
  const [selectedExercises, setSelectedExercises] = useState<BuilderExercise[]>(() => getStoredExercises(storageKey));

  // After switching organizations the previous organization's cart must not carry over.
  useEffect(() => {
    setSelectedExercises(getStoredExercises(storageKey));
  }, [storageKey]);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Sync to localStorage whenever exercises change
  const updateExercises = useCallback((exercises: BuilderExercise[]) => {
    setSelectedExercises(exercises);
    setStoredExercises(storageKeyRef.current, exercises);
  }, []);

  const addExercise = useCallback((exercise: BuilderExercise) => {
    setSelectedExercises((prev) => {
      // Don't add duplicates
      if (prev.some((e) => e.id === exercise.id)) {
        return prev;
      }
      const updated = [...prev, exercise];
      setStoredExercises(storageKeyRef.current, updated);
      return updated;
    });
  }, []);

  const removeExercise = useCallback((exerciseId: string) => {
    setSelectedExercises((prev) => {
      const updated = prev.filter((e) => e.id !== exerciseId);
      setStoredExercises(storageKeyRef.current, updated);
      return updated;
    });
  }, []);

  const updateExercise = useCallback((exerciseId: string, updates: Partial<BuilderExercise>) => {
    setSelectedExercises((prev) => {
      const updated = prev.map((e) => (e.id === exerciseId ? { ...e, ...updates } : e));
      setStoredExercises(storageKeyRef.current, updated);
      return updated;
    });
  }, []);

  const reorderExercises = useCallback((fromIndex: number, toIndex: number) => {
    setSelectedExercises((prev) => {
      const updated = [...prev];
      const [removed] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, removed);
      setStoredExercises(storageKeyRef.current, updated);
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
  const totalSetDuration = useMemo(() => {
    let totalSeconds = 0;
    let isEstimate = false;

    for (const exercise of selectedExercises) {
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
        type: exercise.type,
        alternatingPerSide: exercise.alternatingPerSide,
      });

      totalSeconds += duration.seconds;
      isEstimate = isEstimate || duration.isEstimate;
    }

    return { seconds: totalSeconds, isEstimate };
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
      totalSetDuration,
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
      totalSetDuration,
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
