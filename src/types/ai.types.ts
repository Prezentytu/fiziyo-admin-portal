/**
 * Typy dla AI Service - komunikacja z /api/ai endpoints
 */

// ============================================
// 1. Exercise Suggestion
// ============================================

export interface ExerciseSuggestionRequest {
  exerciseName: string;
  availableTags?: string[];
}

export interface ExerciseSuggestionResponse {
  description: string;
  type: 'reps' | 'time';
  sets: number;
  reps: number | null;
  duration: number | null;
  restSets: number;
  exerciseSide: 'none' | 'left' | 'right' | 'both' | 'alternating';
  suggestedTags: string[];
  confidence: number;
}

// ============================================
// 2. Set Generation
// ============================================

export interface PatientContext {
  patientName?: string;
  diagnosis?: string[];
  painLocation?: string;
}

export interface SetGenerationRequest {
  prompt: string;
  patientName?: string;
  diagnosis?: string[];
  painLocation?: string;
  availableExerciseNames: string[];
}

export interface GeneratedExercise {
  name: string;
  matchedExerciseName: string | null;
  sets: number;
  reps: number | null;
  duration: number | null;
  reasoning: string;
}

export interface SetGenerationResponse {
  exercises: GeneratedExercise[];
  setName: string;
  setDescription: string;
}

// ============================================
// 3. Clinical Notes
// ============================================

export type ClinicalNoteAction = 'expand' | 'summarize' | 'suggest' | 'format';

export interface ClinicalNoteRequest {
  currentNote: string;
  action: ClinicalNoteAction;
  patientContext?: string;
  exerciseSetContext?: string;
}

export interface ClinicalNoteResponse {
  suggestedNote: string;
  keyPoints: string[];
}

// ============================================
// 4. Voice Parse
// ============================================

export interface VoiceParseRequest {
  voiceText: string;
}

export interface VoiceParseResponse {
  name: string;
  description: string;
  type: 'reps' | 'time';
  sets: number;
  reps: number | null;
  duration: number | null;
  restSets: number;
  exerciseSide: 'none' | 'left' | 'right' | 'both' | 'alternating';
  suggestedTags: string[];
}

// ============================================
// 5. Exercise Image Generation
// ============================================

export type ImageStyle = 'illustration' | 'diagram' | 'photo';

export interface ExerciseImageRequest {
  exerciseName: string;
  exerciseDescription?: string;
  exerciseType?: 'reps' | 'time' | 'hold';
  style?: ImageStyle;
}

export interface ExerciseImageResponse {
  imageBase64: string;
  contentType: string;
  prompt: string;
  success: boolean;
  errorMessage?: string;
  /** Opis tekstowy wygenerowany przez AI (gdy model zwraca tekst zamiast obrazu) */
  textDescription?: string;
  /** Czy odpowiedź zawiera tylko tekst (bez obrazu) */
  isTextOnly?: boolean;
}
