import { chatService } from "./chatService";

const isDev = process.env.NODE_ENV === "development";

/**
 * Sugestie AI dla ćwiczenia
 */
export interface ExerciseSuggestion {
  description: string;
  type: "reps" | "time" | "hold";
  sets: number;
  reps: number | null;
  duration: number | null;
  restSets: number;
  exerciseSide: "none" | "left" | "right" | "both" | "alternating";
  suggestedTags: string[];
  confidence: number; // 0-1
}

/**
 * Parsowane ćwiczenie z AI (dla voice input i templates)
 */
export interface ParsedExerciseFromAI {
  name: string;
  description: string;
  type: "reps" | "time" | "hold";
  sets: number;
  reps: number | null;
  duration: number | null;
  restSets: number;
  exerciseSide: "none" | "left" | "right" | "both" | "alternating";
  suggestedTags: string[];
}

/**
 * Prompt do generowania sugestii dla ćwiczenia
 */
function buildExerciseSuggestionPrompt(exerciseName: string, availableTags?: string[]): string {
  const tagsInfo = availableTags?.length
    ? `\nDostępne kategorie/tagi w systemie: ${availableTags.join(", ")}`
    : "";

  return `Jesteś asystentem fizjoterapeuty. Dla ćwiczenia "${exerciseName}":

1. Napisz krótki opis techniki wykonania (2-3 zdania po polsku, profesjonalnie ale zrozumiale dla pacjenta)
2. Określ typ ćwiczenia: "reps" (powtórzenia), "time" (czasowe) lub "hold" (utrzymywanie pozycji)
3. Zasugeruj parametry: liczba serii, powtórzeń (dla reps) lub czas w sekundach (dla time/hold), przerwa między seriami
4. Określ stronę ciała: "none" (bez podziału), "both" (obie strony), "left", "right" lub "alternating" (naprzemiennie)
5. Podaj 2-3 pasujące kategorie/tagi${tagsInfo}

Odpowiedz TYLKO w formacie JSON (bez markdown):
{
  "description": "opis techniki",
  "type": "reps|time|hold",
  "sets": 3,
  "reps": 12,
  "duration": null,
  "restSets": 60,
  "exerciseSide": "none|left|right|both|alternating",
  "suggestedTags": ["tag1", "tag2"]
}`;
}

/**
 * Prompt do parsowania voice input
 */
function buildVoiceParsePrompt(voiceText: string): string {
  return `Jesteś asystentem fizjoterapeuty. Użytkownik podyktował opis ćwiczenia:

"${voiceText}"

Przeanalizuj tekst i wyodrębnij informacje o ćwiczeniu. Odpowiedz TYLKO w formacie JSON:
{
  "name": "nazwa ćwiczenia",
  "description": "opis techniki wykonania",
  "type": "reps|time|hold",
  "sets": 3,
  "reps": 12,
  "duration": null,
  "restSets": 60,
  "exerciseSide": "none|left|right|both|alternating",
  "suggestedTags": ["kategoria1", "kategoria2"]
}

Jeśli nie podano parametrów, użyj rozsądnych domyślnych wartości.`;
}

/**
 * Prompt do generowania ćwiczenia z szablonu
 */
function buildTemplatePrompt(templateName: string, context?: string): string {
  const contextInfo = context ? `\nKontekst pacjenta: ${context}` : "";

  return `Jesteś ekspertem fizjoterapeutą. Zaproponuj jedno konkretne ćwiczenie dla kategorii: "${templateName}"${contextInfo}

Wybierz popularne, sprawdzone ćwiczenie pasujące do tej kategorii.

Odpowiedz TYLKO w formacie JSON:
{
  "name": "nazwa ćwiczenia",
  "description": "szczegółowy opis techniki wykonania (3-4 zdania)",
  "type": "reps|time|hold",
  "sets": 3,
  "reps": 12,
  "duration": null,
  "restSets": 60,
  "exerciseSide": "none|left|right|both|alternating",
  "suggestedTags": ["${templateName}", "inne pasujące"]
}`;
}

/**
 * Parsuje odpowiedź JSON z AI
 */
function parseJSONResponse<T>(response: string): T | null {
  try {
    // Usuń ewentualne markdown code blocks
    let cleaned = response.trim();
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    return JSON.parse(cleaned) as T;
  } catch (error) {
    if (isDev) {
      console.error("[ExerciseAIService] Failed to parse JSON:", error, response);
    }
    return null;
  }
}

/**
 * Waliduje i normalizuje sugestie
 */
function validateSuggestion(raw: Partial<ExerciseSuggestion>): ExerciseSuggestion {
  const validTypes = ["reps", "time", "hold"];
  const validSides = ["none", "left", "right", "both", "alternating"];

  return {
    description: raw.description || "",
    type: validTypes.includes(raw.type || "") ? (raw.type as "reps" | "time" | "hold") : "reps",
    sets: typeof raw.sets === "number" ? Math.max(1, Math.min(raw.sets, 10)) : 3,
    reps: raw.type === "reps" && typeof raw.reps === "number" ? Math.max(1, Math.min(raw.reps, 100)) : null,
    duration: raw.type !== "reps" && typeof raw.duration === "number" ? Math.max(5, Math.min(raw.duration, 300)) : null,
    restSets: typeof raw.restSets === "number" ? Math.max(0, Math.min(raw.restSets, 180)) : 60,
    exerciseSide: validSides.includes(raw.exerciseSide || "")
      ? (raw.exerciseSide as "none" | "left" | "right" | "both" | "alternating")
      : "none",
    suggestedTags: Array.isArray(raw.suggestedTags) ? raw.suggestedTags.slice(0, 5) : [],
    confidence: 0.8,
  };
}

/**
 * Waliduje parsed exercise
 */
function validateParsedExercise(raw: Partial<ParsedExerciseFromAI>): ParsedExerciseFromAI {
  const validTypes = ["reps", "time", "hold"];
  const validSides = ["none", "left", "right", "both", "alternating"];

  return {
    name: raw.name || "Nowe ćwiczenie",
    description: raw.description || "",
    type: validTypes.includes(raw.type || "") ? (raw.type as "reps" | "time" | "hold") : "reps",
    sets: typeof raw.sets === "number" ? Math.max(1, Math.min(raw.sets, 10)) : 3,
    reps: raw.type === "reps" && typeof raw.reps === "number" ? Math.max(1, Math.min(raw.reps, 100)) : 10,
    duration: raw.type !== "reps" && typeof raw.duration === "number" ? Math.max(5, Math.min(raw.duration, 300)) : null,
    restSets: typeof raw.restSets === "number" ? Math.max(0, Math.min(raw.restSets, 180)) : 60,
    exerciseSide: validSides.includes(raw.exerciseSide || "")
      ? (raw.exerciseSide as "none" | "left" | "right" | "both" | "alternating")
      : "none",
    suggestedTags: Array.isArray(raw.suggestedTags) ? raw.suggestedTags.slice(0, 5) : [],
  };
}

/**
 * Serwis AI do generowania sugestii i parsowania ćwiczeń
 */
class ExerciseAIService {
  /**
   * Generuje sugestie dla ćwiczenia na podstawie nazwy
   */
  async getSuggestions(
    exerciseName: string,
    availableTags?: string[]
  ): Promise<ExerciseSuggestion | null> {
    if (!exerciseName.trim() || exerciseName.length < 3) {
      return null;
    }

    try {
      const prompt = buildExerciseSuggestionPrompt(exerciseName, availableTags);
      const response = await chatService.sendMessage(prompt);
      const responseText = response.response?.response || "";

      if (!responseText) {
        return null;
      }

      const parsed = parseJSONResponse<Partial<ExerciseSuggestion>>(responseText);
      if (!parsed) {
        return null;
      }

      return validateSuggestion(parsed);
    } catch (error) {
      if (isDev) {
        console.error("[ExerciseAIService] getSuggestions error:", error);
      }
      return null;
    }
  }

  /**
   * Parsuje tekst z voice input na strukturę ćwiczenia
   */
  async parseVoiceInput(voiceText: string): Promise<ParsedExerciseFromAI | null> {
    if (!voiceText.trim()) {
      return null;
    }

    try {
      const prompt = buildVoiceParsePrompt(voiceText);
      const response = await chatService.sendMessage(prompt);
      const responseText = response.response?.response || "";

      if (!responseText) {
        return null;
      }

      const parsed = parseJSONResponse<Partial<ParsedExerciseFromAI>>(responseText);
      if (!parsed) {
        return null;
      }

      return validateParsedExercise(parsed);
    } catch (error) {
      if (isDev) {
        console.error("[ExerciseAIService] parseVoiceInput error:", error);
      }
      return null;
    }
  }

  /**
   * Generuje ćwiczenie z szablonu/kategorii
   */
  async generateFromTemplate(
    templateName: string,
    context?: string
  ): Promise<ParsedExerciseFromAI | null> {
    try {
      const prompt = buildTemplatePrompt(templateName, context);
      const response = await chatService.sendMessage(prompt);
      const responseText = response.response?.response || "";

      if (!responseText) {
        return null;
      }

      const parsed = parseJSONResponse<Partial<ParsedExerciseFromAI>>(responseText);
      if (!parsed) {
        return null;
      }

      return validateParsedExercise(parsed);
    } catch (error) {
      if (isDev) {
        console.error("[ExerciseAIService] generateFromTemplate error:", error);
      }
      return null;
    }
  }

  /**
   * Rozszerza istniejący opis o dodatkowe informacje
   */
  async enhanceDescription(
    exerciseName: string,
    currentDescription: string,
    enhancementType: "technical" | "safety" | "variations"
  ): Promise<string | null> {
    const enhancementPrompts = {
      technical: `Rozszerz opis ćwiczenia "${exerciseName}" o szczegóły techniczne wykonania.
Obecny opis: "${currentDescription}"
Dodaj informacje o prawidłowej postawie, zakresie ruchu i typowych błędach. Odpowiedz tylko rozszerzonym opisem (2-3 zdania).`,
      safety: `Dodaj wskazówki bezpieczeństwa dla ćwiczenia "${exerciseName}".
Obecny opis: "${currentDescription}"
Wymień przeciwwskazania i środki ostrożności. Odpowiedz tylko wskazówkami (2-3 zdania).`,
      variations: `Podaj warianty i modyfikacje ćwiczenia "${exerciseName}".
Obecny opis: "${currentDescription}"
Opisz łatwiejszą i trudniejszą wersję. Odpowiedz tylko wariantami (2-3 zdania).`,
    };

    try {
      const prompt = enhancementPrompts[enhancementType];
      const response = await chatService.sendMessage(prompt);
      const responseText = response.response?.response || "";

      return responseText.trim() || null;
    } catch (error) {
      if (isDev) {
        console.error("[ExerciseAIService] enhanceDescription error:", error);
      }
      return null;
    }
  }
}

// Singleton
export const exerciseAIService = new ExerciseAIService();

// Quick Templates - predefiniowane kategorie
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


