/**
 * Centralny serwis AI - komunikacja z dedykowanymi endpointami /api/ai/*
 * Zastępuje exerciseAIService.ts - teraz backend gwarantuje JSON
 */

import { getBackendToken } from "@/lib/tokenCache";
import { triggerCreditsRefresh } from "@/components/settings/AICreditsPanel";
import type {
  ExerciseSuggestionRequest,
  ExerciseSuggestionResponse,
  SetGenerationRequest,
  SetGenerationResponse,
  ClinicalNoteRequest,
  ClinicalNoteResponse,
  VoiceParseRequest,
  VoiceParseResponse,
  PatientContext,
  ClinicalNoteAction,
} from "@/types/ai.types";

const isDev = process.env.NODE_ENV === "development";

/**
 * Centralny serwis AI z dedykowanymi endpointami
 */
class AIService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
  }

  /**
   * Wykonuje request do AI endpoint
   */
  private async request<T>(endpoint: string, body: unknown): Promise<T> {
    const token = getBackendToken();

    if (!token) {
      throw new Error("Brak tokenu autoryzacji. Zaloguj się ponownie.");
    }

    const url = `${this.baseUrl}/api/ai/${endpoint}`;

    if (isDev) {
      console.log(`[AIService] Request to ${endpoint}:`, body);
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Sesja wygasła. Odśwież stronę i spróbuj ponownie.");
      }
      const errorText = await response.text();
      throw new Error(`Błąd AI: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    if (isDev) {
      console.log(`[AIService] Response from ${endpoint}:`, data);
    }

    // Odśwież kredyty po udanej akcji AI
    triggerCreditsRefresh();

    return data as T;
  }

  // ============================================
  // 1. Exercise Suggestion
  // ============================================

  /**
   * Generuje sugestie parametrów dla ćwiczenia na podstawie nazwy
   * @param exerciseName - nazwa ćwiczenia (min. 2 znaki)
   * @param availableTags - opcjonalna lista dostępnych tagów
   * @returns sugestia lub null w przypadku błędu
   */
  async getExerciseSuggestion(
    exerciseName: string,
    availableTags?: string[]
  ): Promise<ExerciseSuggestionResponse | null> {
    if (!exerciseName.trim() || exerciseName.length < 2) {
      return null;
    }

    try {
      const request: ExerciseSuggestionRequest = {
        exerciseName: exerciseName.trim(),
        availableTags,
      };

      return await this.request<ExerciseSuggestionResponse>(
        "exercise-suggest",
        request
      );
    } catch (error) {
      if (isDev) {
        console.error("[AIService] getExerciseSuggestion error:", error);
      }
      return null;
    }
  }

  // ============================================
  // 2. Set Generation
  // ============================================

  /**
   * Generuje zestaw ćwiczeń na podstawie opisu potrzeb
   * @param prompt - opis celu zestawu
   * @param patientContext - opcjonalny kontekst pacjenta
   * @param exerciseNames - lista nazw dostępnych ćwiczeń
   * @returns wygenerowany zestaw lub null
   */
  async generateExerciseSet(
    prompt: string,
    patientContext?: PatientContext,
    exerciseNames: string[] = []
  ): Promise<SetGenerationResponse | null> {
    if (!prompt.trim()) {
      return null;
    }

    try {
      const request: SetGenerationRequest = {
        prompt: prompt.trim(),
        patientName: patientContext?.patientName,
        diagnosis: patientContext?.diagnosis,
        painLocation: patientContext?.painLocation,
        availableExerciseNames: exerciseNames,
      };

      return await this.request<SetGenerationResponse>("set-generate", request);
    } catch (error) {
      if (isDev) {
        console.error("[AIService] generateExerciseSet error:", error);
      }
      return null;
    }
  }

  // ============================================
  // 3. Clinical Notes
  // ============================================

  /**
   * Asystent notatek klinicznych
   * @param currentNote - aktualna treść notatki
   * @param action - akcja do wykonania: expand, summarize, suggest, format
   * @param patientContext - opcjonalny kontekst pacjenta
   * @param exerciseSetContext - opcjonalny kontekst zestawu ćwiczeń
   * @returns sugerowana notatka lub null
   */
  async assistClinicalNote(
    currentNote: string,
    action: ClinicalNoteAction,
    patientContext?: string,
    exerciseSetContext?: string
  ): Promise<ClinicalNoteResponse | null> {
    try {
      const request: ClinicalNoteRequest = {
        currentNote,
        action,
        patientContext,
        exerciseSetContext,
      };

      return await this.request<ClinicalNoteResponse>("clinical-notes", request);
    } catch (error) {
      if (isDev) {
        console.error("[AIService] assistClinicalNote error:", error);
      }
      return null;
    }
  }

  // ============================================
  // 4. Voice Parse
  // ============================================

  /**
   * Parsuje tekst z voice input na strukturę ćwiczenia
   * @param voiceText - tekst rozpoznany z mowy
   * @returns sparsowane ćwiczenie lub null
   */
  async parseVoiceInput(voiceText: string): Promise<VoiceParseResponse | null> {
    if (!voiceText.trim()) {
      return null;
    }

    try {
      const request: VoiceParseRequest = {
        voiceText: voiceText.trim(),
      };

      return await this.request<VoiceParseResponse>("voice-parse", request);
    } catch (error) {
      if (isDev) {
        console.error("[AIService] parseVoiceInput error:", error);
      }
      return null;
    }
  }
}

// Singleton instance
export const aiService = new AIService();

// Quick Templates - predefiniowane kategorie dla generowania ćwiczeń
export const QUICK_TEMPLATES = [
  { id: "acl", label: "Rehabilitacja ACL", icon: "🦵", category: "Rehabilitacja stawu kolanowego po rekonstrukcji ACL" },
  { id: "shoulder", label: "Mobilność barku", icon: "💪", category: "Ćwiczenia na mobilność i stabilizację barku" },
  { id: "core", label: "Core & stabilizacja", icon: "🎯", category: "Ćwiczenia stabilizacyjne na mięśnie głębokie tułowia" },
  { id: "lbp", label: "Ból pleców", icon: "🔙", category: "Ćwiczenia na ból dolnego odcinka kręgosłupa" },
  { id: "posture", label: "Korekta postawy", icon: "🧍", category: "Ćwiczenia korygujące postawę przy pracy siedzącej" },
  { id: "hip", label: "Biodro", icon: "🦴", category: "Wzmocnienie i mobilność stawu biodrowego" },
  { id: "ankle", label: "Kostka & stopa", icon: "👣", category: "Rehabilitacja i wzmocnienie stawu skokowego" },
  { id: "stretching", label: "Rozciąganie", icon: "🤸", category: "Ćwiczenia rozciągające całe ciało" },
];

// Re-export types for convenience
export type {
  ExerciseSuggestionResponse,
  SetGenerationResponse,
  GeneratedExercise,
  ClinicalNoteResponse,
  VoiceParseResponse,
  PatientContext,
  ClinicalNoteAction,
} from "@/types/ai.types";
