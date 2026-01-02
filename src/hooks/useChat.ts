"use client";

import { useState, useCallback, useEffect } from "react";
import { chatService } from "@/services/chatService";
import type {
  ChatMessageType,
  ParsedExercise,
  SerializableChatSession,
  SerializableChatMessage,
} from "@/types/chat.types";

const SESSION_ID_KEY = "AI_CHAT_SESSION_ID";
const SESSIONS_KEY = "AI_CHAT_SESSIONS";
const CURRENT_SESSION_KEY = "AI_CHAT_CURRENT_SESSION";
const MAX_SESSIONS = 20;

/**
 * Generuje unikalne ID dla wiadomości
 */
function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Generuje unikalne ID dla sesji
 */
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Parsuje HTML odpowiedzi AI i wyciąga ćwiczenia
 */
export function parseExercisesFromHtml(html: string): ParsedExercise[] {
  const exercises: ParsedExercise[] = [];

  // Regex do wyciągania bloków exercise
  const exerciseRegex = /<div class="exercise">([\s\S]*?)<\/div>/gi;
  let match;

  while ((match = exerciseRegex.exec(html)) !== null) {
    const block = match[1];

    // Wyciągnij nazwę
    const nameMatch = /<h2>(.*?)<\/h2>/i.exec(block);
    const name = nameMatch ? nameMatch[1].trim() : "";

    // Wyciągnij tagi
    const tagRegex = /<li class="tag">(.*?)<\/li>/gi;
    const tags: string[] = [];
    let tagMatch;
    while ((tagMatch = tagRegex.exec(block)) !== null) {
      tags.push(tagMatch[1].trim());
    }

    // Wyciągnij opis
    const descMatch = /<p>(.*?)<\/p>/i.exec(block);
    const description = descMatch ? descMatch[1].trim() : "";

    // Wyciągnij parametry
    const prepTimeMatch = /Czas przygotowania:.*?<b>(.*?)<\/b>/i.exec(block);
    const repsMatch = /Liczba powtórzeń:.*?<b>(.*?)<\/b>/i.exec(block);
    const restRepsMatch =
      /odpoczynku między powtórzeniami:.*?<b>(.*?)<\/b>/i.exec(block);
    const restSetsMatch = /odpoczynku między seriami:.*?<b>(.*?)<\/b>/i.exec(
      block
    );
    const setsMatch = /Liczba serii:.*?<b>(.*?)<\/b>/i.exec(block);

    if (name) {
      exercises.push({
        name,
        tags,
        description,
        preparationTime: prepTimeMatch?.[1],
        reps: repsMatch?.[1],
        restBetweenReps: restRepsMatch?.[1],
        restBetweenSets: restSetsMatch?.[1],
        sets: setsMatch?.[1],
      });
    }
  }

  return exercises;
}

/**
 * Usuwa bloki ćwiczeń z HTML i zwraca czysty tekst
 */
export function stripExerciseBlocks(html: string): string {
  // Usuń bloki exercise
  let text = html.replace(/<div class="exercise">[\s\S]*?<\/div>/gi, "");
  // Usuń pozostałe tagi HTML
  text = text.replace(/<[^>]*>/g, "");
  // Wyczyść wielokrotne spacje i nowe linie
  text = text.replace(/\s+/g, " ").trim();
  return text;
}

/**
 * Konwertuje wiadomość na serializowalną formę
 */
function serializeMessage(msg: ChatMessageType): SerializableChatMessage {
  return {
    ...msg,
    timestamp:
      msg.timestamp instanceof Date
        ? msg.timestamp.toISOString()
        : msg.timestamp,
  };
}

/**
 * Konwertuje serializowalną wiadomość na ChatMessageType
 */
function deserializeMessage(msg: SerializableChatMessage): ChatMessageType {
  return {
    ...msg,
    timestamp: new Date(msg.timestamp),
  };
}

/**
 * Ładuje sesje z localStorage
 */
function loadSessions(): SerializableChatSession[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(SESSIONS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Zapisuje sesje do localStorage
 */
function saveSessions(sessions: SerializableChatSession[]): void {
  if (typeof window === "undefined") return;
  try {
    // Ogranicz do MAX_SESSIONS
    const limitedSessions = sessions.slice(0, MAX_SESSIONS);
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(limitedSessions));
  } catch (e) {
    console.error("Failed to save chat sessions:", e);
  }
}

/**
 * Pobiera ID bieżącej sesji z localStorage
 */
function getCurrentSessionId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(CURRENT_SESSION_KEY);
}

/**
 * Zapisuje ID bieżącej sesji do localStorage
 */
function setCurrentSessionId(id: string | null): void {
  if (typeof window === "undefined") return;
  if (id) {
    localStorage.setItem(CURRENT_SESSION_KEY, id);
  } else {
    localStorage.removeItem(CURRENT_SESSION_KEY);
  }
}

interface UseChatReturn {
  messages: ChatMessageType[];
  isLoading: boolean;
  error: string | null;
  sessionId: string | null;
  // Session management
  sessions: SerializableChatSession[];
  currentLocalSessionId: string | null;
  sendMessage: (content: string) => Promise<void>;
  clearChat: () => void;
  // New session functions
  loadSession: (localSessionId: string) => void;
  deleteSession: (localSessionId: string) => void;
  startNewSession: () => void;
}

/**
 * Hook do zarządzania stanem czatu AI z historią w localStorage
 */
export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null); // Backend session ID
  const [sessions, setSessions] = useState<SerializableChatSession[]>([]);
  const [currentLocalSessionId, setCurrentLocalSessionId] = useState<
    string | null
  >(null);

  // Załaduj sesje z localStorage przy mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const loadedSessions = loadSessions();
      setSessions(loadedSessions);

      // Pobierz backend sessionId z sessionStorage
      const savedBackendSessionId = sessionStorage.getItem(SESSION_ID_KEY);
      if (savedBackendSessionId) {
        setSessionId(savedBackendSessionId);
      }

      // Pobierz lokalną sesję
      const savedLocalSessionId = getCurrentSessionId();
      if (savedLocalSessionId) {
        const session = loadedSessions.find(
          (s) => s.id === savedLocalSessionId
        );
        if (session) {
          setCurrentLocalSessionId(savedLocalSessionId);
          setMessages(session.messages.map(deserializeMessage));
        }
      }
    }
  }, []);

  // Zapisz sessionId do sessionStorage gdy się zmieni
  useEffect(() => {
    if (typeof window !== "undefined" && sessionId) {
      sessionStorage.setItem(SESSION_ID_KEY, sessionId);
    }
  }, [sessionId]);

  // Zapisz bieżącą sesję do localStorage gdy messages się zmienią
  useEffect(() => {
    if (typeof window === "undefined" || messages.length === 0) return;

    const now = new Date().toISOString();
    const serializedMessages = messages.map(serializeMessage);

    setSessions((prevSessions) => {
      let updatedSessions: SerializableChatSession[];

      if (currentLocalSessionId) {
        // Aktualizuj istniejącą sesję
        const existingIndex = prevSessions.findIndex(
          (s) => s.id === currentLocalSessionId
        );
        if (existingIndex >= 0) {
          updatedSessions = [...prevSessions];
          updatedSessions[existingIndex] = {
            ...updatedSessions[existingIndex],
            messages: serializedMessages,
            updatedAt: now,
          };
        } else {
          // Sesja nie istnieje, utwórz nową
          const firstUserMessage = messages.find((m) => m.role === "user");
          const title = firstUserMessage
            ? firstUserMessage.content.slice(0, 50) +
              (firstUserMessage.content.length > 50 ? "..." : "")
            : "Nowa rozmowa";

          const newSession: SerializableChatSession = {
            id: currentLocalSessionId,
            title,
            createdAt: now,
            updatedAt: now,
            messages: serializedMessages,
          };
          updatedSessions = [newSession, ...prevSessions];
        }
      } else {
        // Utwórz nową sesję
        const newLocalId = generateSessionId();
        setCurrentLocalSessionId(newLocalId);
        setCurrentSessionId(newLocalId);

        const firstUserMessage = messages.find((m) => m.role === "user");
        const title = firstUserMessage
          ? firstUserMessage.content.slice(0, 50) +
            (firstUserMessage.content.length > 50 ? "..." : "")
          : "Nowa rozmowa";

        const newSession: SerializableChatSession = {
          id: newLocalId,
          title,
          createdAt: now,
          updatedAt: now,
          messages: serializedMessages,
        };
        updatedSessions = [newSession, ...prevSessions];
      }

      // Sortuj po updatedAt (najnowsze pierwsze)
      updatedSessions.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

      // Zapisz do localStorage
      saveSessions(updatedSessions);

      return updatedSessions;
    });
  }, [messages, currentLocalSessionId]);

  /**
   * Wysyła wiadomość do AI
   */
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      setError(null);

      // Dodaj wiadomość użytkownika
      const userMessage: ChatMessageType = {
        id: generateMessageId(),
        role: "user",
        content: content.trim(),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        const response = await chatService.sendMessage(
          content.trim(),
          sessionId || undefined
        );

        // Zapisz sessionId jeśli nowe
        if (response.sessionId && response.sessionId !== sessionId) {
          setSessionId(response.sessionId);
        }

        // Wyciągnij odpowiedź
        const aiContent =
          response.response?.response ||
          "Przepraszam, nie udało się uzyskać odpowiedzi.";

        // Dodaj odpowiedź AI
        const aiMessage: ChatMessageType = {
          id: generateMessageId(),
          role: "assistant",
          content: aiContent,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, aiMessage]);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Wystąpił nieoczekiwany błąd";
        setError(errorMessage);

        // Dodaj wiadomość o błędzie jako odpowiedź AI
        const errorAiMessage: ChatMessageType = {
          id: generateMessageId(),
          role: "assistant",
          content: `Przepraszam, wystąpił problem: ${errorMessage}`,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, errorAiMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, sessionId]
  );

  /**
   * Czyści bieżący czat i tworzy nową sesję
   */
  const clearChat = useCallback(() => {
    setMessages([]);
    setSessionId(null);
    setCurrentLocalSessionId(null);
    setError(null);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(SESSION_ID_KEY);
      setCurrentSessionId(null);
    }
  }, []);

  /**
   * Ładuje wybraną sesję z historii
   */
  const loadSession = useCallback(
    (localSessionId: string) => {
      const session = sessions.find((s) => s.id === localSessionId);
      if (session) {
        setMessages(session.messages.map(deserializeMessage));
        setCurrentLocalSessionId(localSessionId);
        setCurrentSessionId(localSessionId);
        // Reset backend sessionId - nowa rozmowa z AI
        setSessionId(null);
        sessionStorage.removeItem(SESSION_ID_KEY);
        setError(null);
      }
    },
    [sessions]
  );

  /**
   * Usuwa sesję z historii
   */
  const deleteSession = useCallback(
    (localSessionId: string) => {
      setSessions((prev) => {
        const updated = prev.filter((s) => s.id !== localSessionId);
        saveSessions(updated);
        return updated;
      });

      // Jeśli usuwamy bieżącą sesję, wyczyść czat
      if (localSessionId === currentLocalSessionId) {
        clearChat();
      }
    },
    [currentLocalSessionId, clearChat]
  );

  /**
   * Rozpoczyna nową sesję (zachowuje bieżącą w historii)
   */
  const startNewSession = useCallback(() => {
    setMessages([]);
    setSessionId(null);
    setCurrentLocalSessionId(null);
    setError(null);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(SESSION_ID_KEY);
      setCurrentSessionId(null);
    }
  }, []);

  return {
    messages,
    isLoading,
    error,
    sessionId,
    sessions,
    currentLocalSessionId,
    sendMessage,
    clearChat,
    loadSession,
    deleteSession,
    startNewSession,
  };
}
