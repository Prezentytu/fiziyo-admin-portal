/**
 * Verification AI Service - ON-DEMAND AI dla weryfikacji ćwiczeń
 *
 * Zasada: Koszt AI generowany TYLKO gdy użytkownik kliknie przycisk
 *
 * Funkcje:
 * - suggestTags: Sugestie tagów anatomicznych
 * - rephraseDescription: Przepisanie opisu na język pacjenta
 * - validateExercise: Walidacja kliniczna ćwiczenia
 *
 * Cache:
 * - Sugestie są cache'owane w bazie danych (TTL 7 dni)
 * - Przy ponownym żądaniu zwracane z cache ($0)
 */

import { getAuthHeaders } from "@/lib/tokens";

// Types
export interface TagSuggestions {
  mainTags: string[];
  additionalTags: string[];
  suggestedCategory?: string;
  confidence?: number;
  fromCache?: boolean;
}

export interface RephraseResult {
  rewrittenDescription: string;
  changes: string[];
  readabilityScore?: number;
  fromCache?: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  suggestions: string[];
  overallScore: number;
}

export interface ValidationIssue {
  field: string;
  severity: "error" | "warning" | "info";
  message: string;
  suggestion?: string;
}

// Request types
interface SuggestTagsRequest {
  exerciseName: string;
  exerciseDescription?: string;
  tagType?: "main" | "additional";
  existingTags?: string[];
}

interface RephraseRequest {
  exerciseName: string;
  currentDescription: string;
}

interface ValidateRequest {
  exerciseName: string;
  exerciseDescription?: string;
  exerciseType?: string;
  sets?: number | null;
  reps?: number | null;
  duration?: number | null;
  mainTags?: string[];
}

/**
 * Verification AI Service
 *
 * Używa REST API zamiast GraphQL dla AI, bo:
 * - Łatwiejszy caching HTTP
 * - Prostsze error handling
 * - Nie mieszamy "darmowych" danych z "płatnymi" w jednym query
 */
class VerificationAIService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
  }

  /**
   * Pobierz nagłówki autoryzacji
   */
  private async getHeaders(): Promise<HeadersInit> {
    const authHeaders = await getAuthHeaders();
    return {
      "Content-Type": "application/json",
      ...authHeaders,
    };
  }

  /**
   * Wykonaj request do API
   */
  private async request<T>(
    endpoint: string,
    body: unknown,
    method: "POST" | "GET" = "POST"
  ): Promise<T> {
    const headers = await this.getHeaders();

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers,
      body: method === "POST" ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `Request failed with status ${response.status}`
      );
    }

    return response.json();
  }

  /**
   * Sugestie tagów - ON-DEMAND
   *
   * Koszt: ~$0.01 (lub $0 jeśli cached)
   *
   * @param exerciseId - ID ćwiczenia (dla cache)
   * @param request - Dane do analizy
   */
  async suggestTags(
    exerciseId: string,
    request: SuggestTagsRequest
  ): Promise<TagSuggestions> {
    return this.request<TagSuggestions>(
      `/api/ai/verification/suggest-tags/${exerciseId}`,
      request
    );
  }

  /**
   * Przepisz opis na język pacjenta - ON-DEMAND
   *
   * Koszt: ~$0.02 (lub $0 jeśli cached)
   *
   * @param exerciseId - ID ćwiczenia (dla cache)
   * @param request - Dane do przepisania
   */
  async rephraseDescription(
    exerciseId: string,
    request: RephraseRequest
  ): Promise<RephraseResult> {
    return this.request<RephraseResult>(
      `/api/ai/verification/rephrase/${exerciseId}`,
      request
    );
  }

  /**
   * Walidacja kliniczna ćwiczenia - ON-DEMAND
   *
   * Koszt: ~$0.03 (lub $0 jeśli cached)
   *
   * @param exerciseId - ID ćwiczenia (dla cache)
   * @param request - Dane do walidacji
   */
  async validateExercise(
    exerciseId: string,
    request: ValidateRequest
  ): Promise<ValidationResult> {
    return this.request<ValidationResult>(
      `/api/ai/verification/validate/${exerciseId}`,
      request
    );
  }

  /**
   * Sprawdź czy sugestie są w cache (bez generowania)
   *
   * Koszt: $0 (tylko sprawdzenie cache)
   *
   * @param exerciseId - ID ćwiczenia
   * @param type - Typ sugestii
   */
  async checkCache(
    exerciseId: string,
    type: "tags" | "rephrase" | "validate"
  ): Promise<{ cached: boolean; expiresAt?: string }> {
    return this.request<{ cached: boolean; expiresAt?: string }>(
      `/api/ai/verification/cache-status/${exerciseId}/${type}`,
      {},
      "GET"
    );
  }

  /**
   * Wyczyść cache dla ćwiczenia
   *
   * @param exerciseId - ID ćwiczenia
   * @param type - Typ sugestii (opcjonalnie, jeśli brak - wszystkie)
   */
  async clearCache(
    exerciseId: string,
    type?: "tags" | "rephrase" | "validate"
  ): Promise<{ success: boolean }> {
    const endpoint = type
      ? `/api/ai/verification/cache/${exerciseId}/${type}`
      : `/api/ai/verification/cache/${exerciseId}`;

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "DELETE",
      headers: await this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error("Failed to clear cache");
    }

    return response.json();
  }
}

// Singleton instance
export const verificationAIService = new VerificationAIService();

/**
 * React hook wrapper dla suggestTags
 */
export function useSuggestTags() {
  return {
    suggestTags: verificationAIService.suggestTags.bind(verificationAIService),
  };
}

/**
 * React hook wrapper dla rephraseDescription
 */
export function useRephraseDescription() {
  return {
    rephraseDescription: verificationAIService.rephraseDescription.bind(
      verificationAIService
    ),
  };
}

/**
 * React hook wrapper dla validateExercise
 */
export function useValidateExercise() {
  return {
    validateExercise: verificationAIService.validateExercise.bind(
      verificationAIService
    ),
  };
}
