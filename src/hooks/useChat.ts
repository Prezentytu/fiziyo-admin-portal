"use client";

import { useState, useCallback, useEffect } from "react";
import { chatService } from "@/services/chatService";
import type { ChatMessageType, ParsedExercise } from "@/types/chat.types";

const SESSION_ID_KEY = "AI_CHAT_SESSION_ID";

/**
 * Generuje unikalne ID dla wiadomości
 */
function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
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
    const restRepsMatch = /odpoczynku między powtórzeniami:.*?<b>(.*?)<\/b>/i.exec(block);
    const restSetsMatch = /odpoczynku między seriami:.*?<b>(.*?)<\/b>/i.exec(block);
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

interface UseChatReturn {
  messages: ChatMessageType[];
  isLoading: boolean;
  error: string | null;
  sessionId: string | null;
  sendMessage: (content: string) => Promise<void>;
  clearChat: () => void;
}

/**
 * Hook do zarządzania stanem czatu AI
 */
export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Pobierz sessionId z sessionStorage przy mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedSessionId = sessionStorage.getItem(SESSION_ID_KEY);
      if (savedSessionId) {
        setSessionId(savedSessionId);
      }
    }
  }, []);

  // Zapisz sessionId do sessionStorage gdy się zmieni
  useEffect(() => {
    if (typeof window !== "undefined" && sessionId) {
      sessionStorage.setItem(SESSION_ID_KEY, sessionId);
    }
  }, [sessionId]);

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
        const aiContent = response.response?.response || "Przepraszam, nie udało się uzyskać odpowiedzi.";

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
   * Czyści historię czatu
   */
  const clearChat = useCallback(() => {
    setMessages([]);
    setSessionId(null);
    setError(null);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(SESSION_ID_KEY);
    }
  }, []);

  return {
    messages,
    isLoading,
    error,
    sessionId,
    sendMessage,
    clearChat,
  };
}

