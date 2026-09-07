import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useVisitListening } from './useVisitListening';

class RecognitionFake {
  static latest: RecognitionFake;
  continuous = false; interimResults = false; lang = '';
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onresult: ((event: { resultIndex: number; results: { isFinal: boolean; 0: { transcript: string } }[] }) => void) | null = null;
  start = vi.fn(() => this.onstart?.());
  stop = vi.fn(() => this.onend?.());
  abort = vi.fn();
  constructor() { RecognitionFake.latest = this; }
}
beforeEach(() => { vi.useFakeTimers(); vi.stubGlobal('SpeechRecognition', RecognitionFake); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
describe('visit capture', () => {
  it('restarts after silence without sending or losing committed text', () => {
    const { result } = renderHook(useVisitListening);
    act(() => result.current.start());
    const recognition = RecognitionFake.latest;
    act(() => recognition.onresult?.({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: 'Kolano boli' } }] }));
    act(() => recognition.onend?.());
    act(() => vi.advanceTimersByTime(300));
    expect(recognition.start).toHaveBeenCalledTimes(2);
    expect(result.current.transcript).toBe('Kolano boli');
    expect(result.current.state).toBe('listening');
  });
  it('does not restart after explicit pause and releases microphone on unmount', () => {
    const { result, unmount } = renderHook(useVisitListening);
    act(() => result.current.start());
    const recognition = RecognitionFake.latest;
    act(() => result.current.pause());
    act(() => vi.advanceTimersByTime(500));
    expect(recognition.start).toHaveBeenCalledTimes(1);
    act(() => result.current.start());
    const active = RecognitionFake.latest;
    unmount(); expect(active.abort).toHaveBeenCalled();
  });
  it('deduplicates repeated final results', () => {
    const { result } = renderHook(useVisitListening);
    act(() => result.current.start());
    const event = { resultIndex: 0, results: [{ isFinal: true, 0: { transcript: 'Dwie serie' } }] };
    act(() => { RecognitionFake.latest.onresult?.(event); RecognitionFake.latest.onresult?.(event); });
    expect(result.current.transcript).toBe('Dwie serie');
  });
});
