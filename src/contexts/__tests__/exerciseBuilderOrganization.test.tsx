import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const org = vi.hoisted(() => ({ id: 'org-a' as string | null }));

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: () => ({ currentOrganization: org.id ? { organizationId: org.id } : null }),
}));

import { ExerciseBuilderProvider, useExerciseBuilder } from '../ExerciseBuilderContext';

const wrapper = ({ children }: { children: ReactNode }) => <ExerciseBuilderProvider>{children}</ExerciseBuilderProvider>;

beforeEach(() => {
  localStorage.clear();
  org.id = 'org-a';
});

describe('exercise builder per organization', () => {
  it('does not carry private exercises of one organization into another', () => {
    const { result, rerender } = renderHook(() => useExerciseBuilder(), { wrapper });
    act(() =>
      result.current.addExercise({ id: 'ex-private-a', name: 'Ćwiczenie gabinetu A', sets: 3, reps: 10, duration: 0 })
    );

    org.id = 'org-b';
    rerender();
    expect(result.current.selectedExercises).toEqual([]);

    org.id = 'org-a';
    rerender();
    expect(result.current.selectedExercises.map((exercise) => exercise.id)).toEqual(['ex-private-a']);
  });

  it('ignores the cart saved before carts were per organization', () => {
    localStorage.setItem('fizyo_exercise_builder', JSON.stringify([{ id: 'ex-unknown-org', name: 'Stare' }]));

    const { result } = renderHook(() => useExerciseBuilder(), { wrapper });
    expect(result.current.selectedExercises).toEqual([]);
  });
});
