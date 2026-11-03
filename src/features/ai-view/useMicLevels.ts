'use client';

import { useEffect, useState } from 'react';

import { pushLevel, rmsLevel } from './utils/micLevels';

const TICK_MS = 60;

/**
 * Live loudness of the microphone while dictation runs, for the wave in the composer. Opens its own
 * audio stream next to speech recognition and closes it when dictation stops; nothing is recorded.
 */
export function useMicLevels(active: boolean): number[] {
  const [levels, setLevels] = useState<number[]>([]);

  useEffect(() => {
    if (!active || !navigator.mediaDevices?.getUserMedia) return;
    let cancelled = false;
    let stream: MediaStream | undefined;
    let context: AudioContext | undefined;
    let interval: number | undefined;

    void navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((media) => {
        if (cancelled) {
          media.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = media;
        context = new AudioContext();
        const analyser = context.createAnalyser();
        analyser.fftSize = 512;
        context.createMediaStreamSource(media).connect(analyser);
        const samples = new Uint8Array(analyser.fftSize);
        interval = window.setInterval(() => {
          analyser.getByteTimeDomainData(samples);
          setLevels((previous) => pushLevel(previous, rmsLevel(samples)));
        }, TICK_MS);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      stream?.getTracks().forEach((track) => track.stop());
      void context?.close();
      setLevels([]);
    };
  }, [active]);

  return levels;
}
