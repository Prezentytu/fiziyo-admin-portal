/**
 * Typy dla AI Chat
 */

// Rola wiadomości
export type ChatMessageRole = "user" | "assistant";

// Wiadomość w czacie
export interface ChatMessageType {
  id: string;
  role: ChatMessageRole;
  content: string;
  timestamp: Date;
}

// Request do API
export interface ChatQuestionRequest {
  question: string;
  sessionId?: string;
}

// Response z API - struktura odpowiedzi AI
export interface ChatDataExchange {
  response: string;
}

// Pełna odpowiedź z API
export interface ChatDataContainer {
  sessionId: string;
  response: ChatDataExchange;
  messages: Array<{
    role: string;
    text: string;
  }>;
  usage?: {
    inputTokenCount?: number;
    outputTokenCount?: number;
    totalTokenCount?: number;
  };
}

// Sparsowane ćwiczenie z odpowiedzi AI
export interface ParsedExercise {
  name: string;
  tags: string[];
  description: string;
  preparationTime?: string;
  reps?: string;
  restBetweenReps?: string;
  restBetweenSets?: string;
  sets?: string;
}

// Quick action preset
export interface QuickActionPreset {
  id: string;
  label: string;
  prompt: string;
  icon?: string;
}

// Sesja czatu (dla historii)
export interface ChatSession {
  id: string;
  title: string; // Pierwsze pytanie użytkownika
  createdAt: string; // ISO string dla JSON serialization
  updatedAt: string;
  messages: ChatMessageType[];
}

// Serializowalna wiadomość (timestamp jako string)
export interface SerializableChatMessage {
  id: string;
  role: ChatMessageRole;
  content: string;
  timestamp: string; // ISO string
}

// Serializowalna sesja
export interface SerializableChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: SerializableChatMessage[];
}

