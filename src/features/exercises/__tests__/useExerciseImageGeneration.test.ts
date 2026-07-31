import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useExerciseImageGeneration } from '../useExerciseImageGeneration';

const generateExerciseImageMock = vi.fn();

vi.mock('@/services/aiService', () => ({
  aiService: {
    generateExerciseImage: (...args: unknown[]) => generateExerciseImageMock(...args),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { toast } from 'sonner';

describe('useExerciseImageGeneration', () => {
  beforeEach(() => {
    generateExerciseImageMock.mockReset();
    vi.mocked(toast.success).mockReset();
    vi.mocked(toast.error).mockReset();
  });

  it('returns file on success and shows success toast', async () => {
    const file = new File(['img'], 'ai.png', { type: 'image/png' });
    generateExerciseImageMock.mockResolvedValue({ status: 'ok', file, response: { success: true } });

    const { result } = renderHook(() => useExerciseImageGeneration());

    let generated: File | null = null;
    await act(async () => {
      generated = await result.current.generate({ exerciseName: 'Plank' });
    });

    expect(generated).toBe(file);
    expect(toast.success).toHaveBeenCalled();
    expect(result.current.isGenerating).toBe(false);
  });

  it('shows error toast with retry action on provider failure', async () => {
    generateExerciseImageMock.mockResolvedValue({
      status: 'error',
      code: 'provider_unavailable',
      message: 'Asystent AI jest chwilowo niedostępny. Spróbuj ponownie.',
    });

    const { result } = renderHook(() => useExerciseImageGeneration());

    await act(async () => {
      const generated = await result.current.generate({ exerciseName: 'Squat' });
      expect(generated).toBeNull();
    });

    expect(toast.error).toHaveBeenCalled();
    const errorCall = vi.mocked(toast.error).mock.calls[0];
    expect(errorCall?.[1]).toMatchObject({
      action: expect.objectContaining({ label: 'Spróbuj ponownie' }),
    });
  });

  it('toasts missing_name without calling the service for short names', async () => {
    const { result } = renderHook(() => useExerciseImageGeneration());

    await act(async () => {
      const generated = await result.current.generate({ exerciseName: 'A' });
      expect(generated).toBeNull();
    });

    expect(generateExerciseImageMock).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
  });
});
