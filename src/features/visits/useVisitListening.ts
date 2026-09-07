'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

type Recognition = InstanceType<Window['SpeechRecognition']>;
export function useVisitListening() {
  const [supported, setSupported] = useState(false);
  const [state, setState] = useState<'idle' | 'starting' | 'listening' | 'paused' | 'stopping'>('idle');
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const recognition = useRef<Recognition | null>(null);
  const running = useRef(false);
  const restartTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    queueMicrotask(() => setSupported(Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)));
    return () => {
      running.current = false;
      if (restartTimer.current) clearTimeout(restartTimer.current);
      if (recognition.current) {
        recognition.current.onend = null;
        recognition.current.onresult = null;
        recognition.current.onerror = null;
        recognition.current.abort();
      }
    };
  }, []);
  useEffect(() => {
    if (state !== 'listening') return;
    const timer = setInterval(() => setSeconds(value => value + 1), 1000);
    return () => clearInterval(timer);
  }, [state]);
  const start = useCallback(() => {
    if (recognition.current || running.current) return;
    const API = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!API) { setError('Ta przeglądarka nie obsługuje słuchania. Wpisz transkrypt ręcznie.'); return; }
    setError(null);
    running.current = true;
    setState('starting');
    const instance = new API();
    recognition.current = instance;
    instance.continuous = true;
    instance.interimResults = true;
    instance.lang = 'pl-PL';
    const committed = new Set<number>();
    instance.onstart = () => setState('listening');
    instance.onresult = event => {
      let pending = '';
      const additions: string[] = [];
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal && !committed.has(i)) {
          committed.add(i);
          additions.push(result[0].transcript.trim());
        } else if (!result.isFinal) pending += result[0].transcript;
      }
      if (additions.length) setTranscript(value => [value, ...additions].filter(Boolean).join('\n'));
      setInterim(pending);
    };
    instance.onerror = event => {
      if (event.error === 'no-speech') return;
      running.current = false;
      setError(event.error === 'not-allowed' ? 'Zezwól przeglądarce na użycie mikrofonu lub wpisz transkrypt.' : 'Słuchanie przerwane. Sprawdź połączenie i mikrofon, potem wznów. Dotychczasowy tekst zachowano.');
      setState('paused');
    };
    instance.onend = () => {
      setInterim('');
      if (!running.current) { recognition.current = null; setState('paused'); return; }
      // Browsers end recognition during silence. Restart capture, never send a draft automatically.
      committed.clear();
      setState('starting');
      restartTimer.current = setTimeout(() => {
        restartTimer.current = null;
        if (!running.current) { recognition.current = null; setState('paused'); return; }
        try { instance.start(); } catch { running.current = false; recognition.current = null; setState('paused'); setError('Wznów słuchanie, aby kontynuować.'); }
      }, 250);
    };
    try { instance.start(); } catch { running.current = false; recognition.current = null; setState('paused'); setError('Nie udało się uruchomić mikrofonu.'); }
  }, []);
  const pause = useCallback(() => {
    running.current = false;
    if (restartTimer.current) {
      clearTimeout(restartTimer.current); restartTimer.current = null;
      recognition.current?.abort(); recognition.current = null; setState('paused'); return;
    }
    if (recognition.current) { setState('stopping'); recognition.current.stop(); }
    else setState('paused');
  }, []);
  return { supported, state, transcript, setTranscript, interim, error, seconds, start, pause };
}
