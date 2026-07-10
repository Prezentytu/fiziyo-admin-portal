export interface EnrichmentInstructionStep {
  step?: number;
  phase?: string;
  text?: string;
  image_ref?: string | null;
  duration_hint_seconds?: number;
}

export interface EnrichmentPhase {
  phase_name?: string;
  description?: string;
}

export interface EnrichmentFeedbackQuestion {
  id?: string;
  question?: string;
}

export interface EnrichmentCommonMistake {
  mistake?: string;
  fix?: string;
}

export interface EnrichmentDosingProfile {
  sets?: number;
  reps?: number;
  duration_seconds?: number;
  rest_reps_seconds?: number;
  rest_sets_seconds?: number;
  frequency?: string;
  notes?: string;
}

export interface EnrichmentCoachingCue {
  text?: string;
  phases?: string[];
  priority?: number;
  repeat?: boolean;
}

// ============================================
// Schema v3 (SPEC-022, fizjo-app) — kanoniczny kształt EnrichmentData.
// Pola v2 poniżej pozostają na razie w typie (Faza sprzątająca usunie je po potwierdzeniu
// 100% v3 na prod) — ale edytor/widoki operują wyłącznie na v3 dzięki `toV3()`
// (src/features/verification/utils/enrichmentToV3.ts) wołanemu raz przy wczytaniu draftu.
// Patrz: docs/architecture/admin-enrichment-v3-migration-plan.md w repo fizjo-app.
// ============================================

export interface EnrichmentPatientMistakeV3 {
  mistake?: string;
  fix?: string;
}

export interface ExerciseEnrichmentPatientV3 {
  summary?: string;
  steps?: string[];
  cues?: string[];
  mistakes?: EnrichmentPatientMistakeV3[];
  should_feel?: string;
  should_not_feel?: string;
  why?: string;
  when_to_do?: string;
}

export interface ExerciseEnrichmentTherapistV3 {
  clinical_notes?: string;
  indications?: string[];
  contraindications?: string[];
  rehab_phases?: string[];
  progression_notes?: string;
  clinical_benefits?: string[];
}

export interface ExerciseEnrichmentAiV3 {
  keywords?: string[];
  problems?: string[];
  suitable_for?: string[];
  contraindicated_for?: string[];
}

export interface ExerciseEnrichmentData {
  // Marker schemy v3 — obecny na wierszach już znormalizowanych przez backend (SPEC-022).
  $schema?: string;
  patient?: ExerciseEnrichmentPatientV3;
  therapist?: ExerciseEnrichmentTherapistV3;
  ai?: ExerciseEnrichmentAiV3;
  equipment?: string[];
  simplified_instruction?: string;
  patient_notes?: {
    why_this_exercise?: string;
    technique_reminders?: string[];
    when_to_do?: string;
  };
  safety?: {
    stop_if?: string;
    intensity_guide?: string;
    requires_supervision?: boolean;
  };
  feel_description?: {
    should_feel?: string;
    should_not_feel?: string;
  };
  common_mistakes?: EnrichmentCommonMistake[];
  dosing_profiles?: Record<string, EnrichmentDosingProfile>;
  therapist_notes?: {
    clinical_notes?: string;
    clinical_indications?: string[];
    contraindications?: string[];
    rehab_phase?: string[];
    coaching_cues?: EnrichmentCoachingCue[];
    clinical_benefits?: string[];
    progression_notes?: string;
  };
  patient_instruction?: {
    pre_exercise?: {
      quick_summary?: string;
      safety_note?: string;
      what_you_need?: string[];
      instruction_steps?: EnrichmentInstructionStep[];
      instruction_steps_simple?: EnrichmentInstructionStep[];
      instruction_steps_child?: EnrichmentInstructionStep[];
      instruction_steps_technical?: EnrichmentInstructionStep[];
    };
    during_exercise?: {
      phases?: EnrichmentPhase[];
    };
    post_exercise?: {
      completion_message?: string;
      feedback_questions?: EnrichmentFeedbackQuestion[];
      patient_note_prompt?: string;
    };
  };
  ai_metadata?: {
    search_keywords?: string[];
  };
}
