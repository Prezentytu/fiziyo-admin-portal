"use client";

import { useState, useCallback, useEffect, useRef } from "react";

// Rozszerzenie typów dla Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export type VoiceInputState = "idle" | "listening" | "processing";

interface UseVoiceInputOptions {
  /** Język rozpoznawania mowy (domyślnie pl-PL) */
  language?: string;
  /** Czy automatycznie wysyłać po zakończeniu mówienia */
  autoSend?: boolean;
  /** Callback gdy tekst jest rozpoznany */
  onTranscript?: (text: string) => void;
  /** Callback do wysłania wiadomości */
  onSend?: (text: string) => void;
  /** Czas ciszy po którym kończy się nagrywanie (ms) */
  silenceTimeout?: number;
}

interface UseVoiceInputReturn {
  /** Stan nagrywania */
  state: VoiceInputState;
  /** Czy przeglądarka wspiera Web Speech API */
  isSupported: boolean;
  /** Tymczasowy transkrypt (podczas mówienia) */
  interimTranscript: string;
  /** Końcowy transkrypt */
  finalTranscript: string;
  /** Komunikat błędu */
  error: string | null;
  /** Rozpocznij nagrywanie */
  startListening: () => void;
  /** Zatrzymaj nagrywanie */
  stopListening: () => void;
  /** Przełącz nagrywanie */
  toggleListening: () => void;
}

/**
 * Hook do obsługi voice input z Web Speech API
 */
export function useVoiceInput(
  options: UseVoiceInputOptions = {}
): UseVoiceInputReturn {
  const {
    language = "pl-PL",
    autoSend = true,
    onTranscript,
    onSend,
    silenceTimeout = 1500,
  } = options;

  const [state, setState] = useState<VoiceInputState>("idle");
  const [isSupported, setIsSupported] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const finalTranscriptRef = useRef("");

  // Sprawdź wsparcie dla Web Speech API
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognitionAPI =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      setIsSupported(!!SpeechRecognitionAPI);
    }
  }, []);

  // Cleanup przy unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
    };
  }, []);

  const startListening = useCallback(async () => {
    if (!isSupported) {
      setError("Twoja przeglądarka nie wspiera rozpoznawania mowy");
      return;
    }

    // Test czy mikrofon w ogóle działa
    try {
      console.log("Testing microphone access...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("Microphone access OK, stopping stream...");
      stream.getTracks().forEach((track) => track.stop());
    } catch (e) {
      console.error("getUserMedia failed:", e);
      setError("Nie można uzyskać dostępu do mikrofonu. Sprawdź ustawienia.");
      return;
    }

    setError(null);
    setInterimTranscript("");
    setFinalTranscript("");
    finalTranscriptRef.current = "";

    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionAPI();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onstart = () => {
      console.log("🎤 Speech recognition started");
      setState("listening");
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      console.log("🎤 Speech result received:", event.results);
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        console.log(`  Result ${i}: "${transcript}", isFinal: ${result.isFinal}`);

        if (result.isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      console.log(`  Interim: "${interim}", Final: "${final}"`);

      if (final) {
        finalTranscriptRef.current += final;
        setFinalTranscript(finalTranscriptRef.current);
        console.log("  Calling onTranscript with:", finalTranscriptRef.current);
        onTranscript?.(finalTranscriptRef.current);
      }

      setInterimTranscript(interim);

      // Reset silence timeout
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }

      // Set new silence timeout
      if (autoSend && finalTranscriptRef.current) {
        silenceTimeoutRef.current = setTimeout(() => {
          if (finalTranscriptRef.current.trim()) {
            setState("processing");
            onSend?.(finalTranscriptRef.current.trim());
            recognition.stop();
          }
        }, silenceTimeout);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Speech recognition error:", event.error);

      switch (event.error) {
        case "no-speech":
          setError("Nie wykryto mowy. Spróbuj ponownie.");
          break;
        case "audio-capture":
          setError("Brak dostępu do mikrofonu.");
          break;
        case "not-allowed":
          setError(
            "Dostęp do mikrofonu został zablokowany. Kliknij ikonę kłódki w pasku adresu, aby zmienić ustawienia."
          );
          break;
        case "network":
          setError("Błąd sieci. Sprawdź połączenie.");
          break;
        default:
          setError("Wystąpił błąd podczas rozpoznawania mowy.");
      }

      setState("idle");
    };

    recognition.onend = () => {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }

      // Jeśli jest transkrypt i nie był wysłany automatycznie
      if (
        !autoSend &&
        finalTranscriptRef.current.trim() &&
        state === "listening"
      ) {
        onTranscript?.(finalTranscriptRef.current.trim());
      }

      setState("idle");
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (e) {
      console.error("Failed to start speech recognition:", e);
      setError("Nie udało się uruchomić rozpoznawania mowy.");
      setState("idle");
    }
  }, [isSupported, language, autoSend, onTranscript, onSend, silenceTimeout, state]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }

    // Jeśli jest transkrypt, wyślij go
    if (autoSend && finalTranscriptRef.current.trim()) {
      setState("processing");
      onSend?.(finalTranscriptRef.current.trim());
    }

    setState("idle");
  }, [autoSend, onSend]);

  const toggleListening = useCallback(() => {
    if (state === "listening") {
      stopListening();
    } else if (state === "idle") {
      startListening();
    }
  }, [state, startListening, stopListening]);

  return {
    state,
    isSupported,
    interimTranscript,
    finalTranscript,
    error,
    startListening,
    stopListening,
    toggleListening,
  };
}

