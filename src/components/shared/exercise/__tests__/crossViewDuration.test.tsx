import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { calculateExerciseTotalSeconds } from '@/utils/exerciseTime';
import { ExerciseExecutionCard } from '../ExerciseExecutionCard';
import { fromExerciseMapping } from '../adapters';
import {
  estimateEffectiveExerciseSeconds,
  resolveEffectiveExerciseParams,
} from '../resolveEffectiveExerciseParams';

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt?: string }) => <img src={src} alt={alt ?? ''} />,
}));

/** Zapisany REPS z pozostałym duration (review #137, P1): lista zestawów i karta liczą to samo. */
const leftoverDurationMapping = {
  id: 'mapping-reps',
  exerciseId: 'exercise-reps',
  sets: 1,
  reps: 10,
  duration: 300,
  restSets: 0,
  restReps: 0,
  preparationTime: 0,
  exercise: { id: 'exercise-reps', name: 'Wspięcia', type: 'REPS', side: 'NONE' },
};

describe('czas ćwiczenia: jedna reguła w liście zestawów i na karcie', () => {
  it('calculateExerciseTotalSeconds: REPS ignoruje duration, TIME i szkic bez typu go używają', () => {
    const base = { sets: 1, reps: 10, duration: 300 };
    expect(calculateExerciseTotalSeconds({ ...base, type: 'REPS' }).seconds).toBe(30);
    expect(calculateExerciseTotalSeconds({ ...base, type: 'TIME' }).seconds).toBe(300);
    expect(calculateExerciseTotalSeconds(base).seconds).toBe(300);
  });

  it('SetCard (resolver) i ExerciseExecutionCard pokazują 30 s, nie 5 min', () => {
    expect(estimateEffectiveExerciseSeconds(resolveEffectiveExerciseParams(leftoverDurationMapping))).toBe(30);

    render(<ExerciseExecutionCard mode="view" exercise={fromExerciseMapping(leftoverDurationMapping)} />);
    expect(screen.getAllByText(/~30 s/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/5 min/)).not.toBeInTheDocument();
  });
});
