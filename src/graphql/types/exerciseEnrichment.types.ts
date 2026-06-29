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

export interface ExerciseEnrichmentData {
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
