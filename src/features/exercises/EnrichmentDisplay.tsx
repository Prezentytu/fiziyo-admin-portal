import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';

interface EnrichmentDisplayProps {
  enrichmentData?: ExerciseEnrichmentData | null;
}

function hasValue(value: string | undefined): value is string {
  return Boolean(value && value.trim().length > 0);
}

function hasListValue(values: string[] | undefined): boolean {
  return Boolean(values?.some((value) => hasValue(value)));
}

export function EnrichmentDisplay({ enrichmentData }: Readonly<EnrichmentDisplayProps>) {
  if (!enrichmentData) {
    return null;
  }

  const preExercise = enrichmentData.patient_instruction?.pre_exercise;
  const postExercise = enrichmentData.patient_instruction?.post_exercise;
  const duringExercise = enrichmentData.patient_instruction?.during_exercise;
  const instructionSteps = preExercise?.instruction_steps ?? [];
  const instructionStepsSimple = preExercise?.instruction_steps_simple ?? [];
  const instructionStepsChild = preExercise?.instruction_steps_child ?? [];
  const instructionStepsTechnical = preExercise?.instruction_steps_technical ?? [];
  const duringPhases = duringExercise?.phases ?? [];
  const feedbackQuestions = postExercise?.feedback_questions ?? [];
  const commonMistakes = enrichmentData.common_mistakes ?? [];
  const coachingCues = enrichmentData.therapist_notes?.coaching_cues ?? [];
  const dosingProfiles = Object.entries(enrichmentData.dosing_profiles ?? {});
  const aiKeywords = enrichmentData.ai_metadata?.search_keywords ?? [];

  const hasAnySection =
    hasValue(enrichmentData.simplified_instruction) ||
    hasValue(preExercise?.quick_summary) ||
    hasValue(preExercise?.safety_note) ||
    hasListValue(preExercise?.what_you_need) ||
    instructionSteps.length > 0 ||
    instructionStepsSimple.length > 0 ||
    instructionStepsChild.length > 0 ||
    instructionStepsTechnical.length > 0 ||
    duringPhases.length > 0 ||
    hasValue(postExercise?.completion_message) ||
    hasValue(postExercise?.patient_note_prompt) ||
    feedbackQuestions.length > 0 ||
    commonMistakes.length > 0 ||
    coachingCues.length > 0 ||
    hasValue(enrichmentData.safety?.stop_if) ||
    hasValue(enrichmentData.safety?.intensity_guide) ||
    hasValue(enrichmentData.feel_description?.should_feel) ||
    hasValue(enrichmentData.feel_description?.should_not_feel) ||
    hasValue(enrichmentData.patient_notes?.why_this_exercise) ||
    hasValue(enrichmentData.patient_notes?.when_to_do) ||
    hasListValue(enrichmentData.patient_notes?.technique_reminders) ||
    hasValue(enrichmentData.therapist_notes?.clinical_notes) ||
    hasListValue(enrichmentData.therapist_notes?.clinical_indications) ||
    hasListValue(enrichmentData.therapist_notes?.contraindications) ||
    hasListValue(enrichmentData.therapist_notes?.rehab_phase) ||
    hasListValue(enrichmentData.therapist_notes?.clinical_benefits) ||
    hasValue(enrichmentData.therapist_notes?.progression_notes) ||
    dosingProfiles.length > 0 ||
    aiKeywords.length > 0 ||
    enrichmentData.safety?.requires_supervision === true;

  if (!hasAnySection) {
    return null;
  }

  const renderSteps = (title: string, steps: NonNullable<typeof instructionSteps>) => {
    if (steps.length === 0) {
      return null;
    }
    return (
      <section className="rounded-xl bg-surface-light/30 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
        <ol className="mt-2 space-y-2 text-sm text-muted-foreground">
          {steps.map((step, index) => (
            <li key={`${title}-${step.step ?? index}-${step.text ?? ''}`}>
              <span className="font-medium text-foreground">{step.step ?? index + 1}.</span> {step.text ?? 'Brak opisu'}
              {hasValue(step.phase) && <span className="ml-1 text-xs text-muted-foreground/80">({step.phase})</span>}
            </li>
          ))}
        </ol>
      </section>
    );
  };

  return (
    <div className="space-y-4 rounded-2xl border border-border/40 bg-surface/50 p-4 sm:p-6" data-testid="exercise-enrichment-display">
      <h3 className="text-base font-semibold text-foreground">Dane rozszerzone</h3>

      {hasValue(enrichmentData.simplified_instruction) && (
        <section className="rounded-xl bg-surface-light/30 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Uproszczona instrukcja</p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{enrichmentData.simplified_instruction}</p>
        </section>
      )}

      {(hasValue(preExercise?.quick_summary) || hasValue(preExercise?.safety_note) || hasListValue(preExercise?.what_you_need)) && (
        <section className="rounded-xl bg-surface-light/30 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Wprowadzenie pacjenta</p>
          {hasValue(preExercise?.quick_summary) && (
            <p className="mt-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Quick summary:</span> {preExercise?.quick_summary}
            </p>
          )}
          {hasValue(preExercise?.safety_note) && (
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Safety note:</span> {preExercise?.safety_note}
            </p>
          )}
          {hasListValue(preExercise?.what_you_need) && (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {(preExercise?.what_you_need ?? []).filter((item) => hasValue(item)).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </section>
      )}

      {renderSteps('Instrukcja krok po kroku', instructionSteps)}
      {renderSteps('Instrukcja uproszczona', instructionStepsSimple)}
      {renderSteps('Instrukcja dla dziecka', instructionStepsChild)}
      {renderSteps('Instrukcja techniczna', instructionStepsTechnical)}

      {duringPhases.length > 0 && (
        <section className="rounded-xl bg-surface-light/30 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fazy podczas ćwiczenia</p>
          <div className="mt-2 space-y-2 text-sm text-muted-foreground">
            {duringPhases.map((phase, index) => (
              <p key={`${phase.phase_name ?? ''}-${index}`}>
                <span className="font-medium text-foreground">{phase.phase_name || `Faza ${index + 1}`}:</span>{' '}
                {phase.description || 'Brak opisu'}
              </p>
            ))}
          </div>
        </section>
      )}

      {(hasValue(postExercise?.completion_message) || hasValue(postExercise?.patient_note_prompt) || feedbackQuestions.length > 0) && (
        <section className="rounded-xl bg-surface-light/30 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Po ćwiczeniu</p>
          {hasValue(postExercise?.completion_message) && (
            <p className="mt-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Komunikat:</span> {postExercise?.completion_message}
            </p>
          )}
          {hasValue(postExercise?.patient_note_prompt) && (
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Prompt notatki:</span> {postExercise?.patient_note_prompt}
            </p>
          )}
          {feedbackQuestions.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {feedbackQuestions.map((question, index) => (
                <li key={`${question.id ?? ''}-${index}`}>{question.question || 'Brak treści pytania'}</li>
              ))}
            </ul>
          )}
        </section>
      )}

      {coachingCues.length > 0 && (
        <section className="rounded-xl bg-surface-light/30 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Coaching cues</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {coachingCues.map((cue, index) => (
              <li key={`${cue.text ?? ''}-${index}`}>{cue.text ?? 'Brak treści'}</li>
            ))}
          </ul>
        </section>
      )}

      {commonMistakes.length > 0 && (
        <section className="rounded-xl bg-surface-light/30 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Typowe błędy</p>
          <div className="mt-2 space-y-3">
            {commonMistakes.map((mistake, index) => (
              <div key={`${mistake.mistake ?? ''}-${index}`} className="text-sm text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">Błąd:</span> {mistake.mistake || 'Brak opisu'}
                </p>
                <p>
                  <span className="font-medium text-foreground">Jak poprawić:</span> {mistake.fix || 'Brak wskazówki'}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {(hasValue(enrichmentData.feel_description?.should_feel) || hasValue(enrichmentData.feel_description?.should_not_feel)) && (
        <section className="rounded-xl bg-surface-light/30 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Odczucia pacjenta</p>
          {hasValue(enrichmentData.feel_description?.should_feel) && (
            <p className="mt-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Powinno być:</span> {enrichmentData.feel_description?.should_feel}
            </p>
          )}
          {hasValue(enrichmentData.feel_description?.should_not_feel) && (
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Nie powinno być:</span> {enrichmentData.feel_description?.should_not_feel}
            </p>
          )}
        </section>
      )}

      {(hasValue(enrichmentData.safety?.stop_if) || hasValue(enrichmentData.safety?.intensity_guide)) && (
        <section className="rounded-xl bg-surface-light/30 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bezpieczeństwo</p>
          {hasValue(enrichmentData.safety?.stop_if) && (
            <p className="mt-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Przerwij, gdy:</span> {enrichmentData.safety?.stop_if}
            </p>
          )}
          {hasValue(enrichmentData.safety?.intensity_guide) && (
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Intensywność:</span> {enrichmentData.safety?.intensity_guide}
            </p>
          )}
        </section>
      )}

      {(hasValue(enrichmentData.patient_notes?.why_this_exercise) ||
        hasValue(enrichmentData.patient_notes?.when_to_do) ||
        hasListValue(enrichmentData.patient_notes?.technique_reminders)) && (
        <section className="rounded-xl bg-surface-light/30 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notatki pacjenta</p>
          {hasValue(enrichmentData.patient_notes?.why_this_exercise) && (
            <p className="mt-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Dlaczego to ćwiczenie:</span>{' '}
              {enrichmentData.patient_notes?.why_this_exercise}
            </p>
          )}
          {hasValue(enrichmentData.patient_notes?.when_to_do) && (
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Kiedy wykonywać:</span> {enrichmentData.patient_notes?.when_to_do}
            </p>
          )}
          {hasListValue(enrichmentData.patient_notes?.technique_reminders) && (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {(enrichmentData.patient_notes?.technique_reminders ?? [])
                .filter((item) => hasValue(item))
                .map((item) => (
                  <li key={item}>{item}</li>
                ))}
            </ul>
          )}
        </section>
      )}

      {(hasValue(enrichmentData.therapist_notes?.clinical_notes) ||
        hasListValue(enrichmentData.therapist_notes?.clinical_indications) ||
        hasListValue(enrichmentData.therapist_notes?.contraindications) ||
        hasListValue(enrichmentData.therapist_notes?.rehab_phase) ||
        hasListValue(enrichmentData.therapist_notes?.clinical_benefits) ||
        hasValue(enrichmentData.therapist_notes?.progression_notes)) && (
        <section className="rounded-xl bg-surface-light/30 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notatki terapeutyczne</p>
          {hasValue(enrichmentData.therapist_notes?.clinical_notes) && (
            <p className="mt-2 text-sm text-muted-foreground">{enrichmentData.therapist_notes?.clinical_notes}</p>
          )}
          {hasListValue(enrichmentData.therapist_notes?.clinical_indications) && (
            <p className="mt-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Wskazania:</span>{' '}
              {(enrichmentData.therapist_notes?.clinical_indications ?? []).join(', ')}
            </p>
          )}
          {hasListValue(enrichmentData.therapist_notes?.contraindications) && (
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Przeciwwskazania:</span>{' '}
              {(enrichmentData.therapist_notes?.contraindications ?? []).join(', ')}
            </p>
          )}
          {hasListValue(enrichmentData.therapist_notes?.rehab_phase) && (
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Faza rehab:</span>{' '}
              {(enrichmentData.therapist_notes?.rehab_phase ?? []).join(', ')}
            </p>
          )}
          {hasListValue(enrichmentData.therapist_notes?.clinical_benefits) && (
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Korzyści:</span>{' '}
              {(enrichmentData.therapist_notes?.clinical_benefits ?? []).join(', ')}
            </p>
          )}
          {hasValue(enrichmentData.therapist_notes?.progression_notes) && (
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Progresja:</span> {enrichmentData.therapist_notes?.progression_notes}
            </p>
          )}
        </section>
      )}

      {dosingProfiles.length > 0 && (
        <section className="rounded-xl bg-surface-light/30 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dawkowanie</p>
          <div className="mt-2 space-y-2 text-sm text-muted-foreground">
            {dosingProfiles.map(([profileName, profile]) => (
              <p key={profileName}>
                <span className="font-medium text-foreground">{profileName}:</span> {profile.sets ?? 0} serie, {profile.reps ?? 0}{' '}
                powt., odpoczynek {profile.rest_sets_seconds ?? 0}s
              </p>
            ))}
          </div>
        </section>
      )}

      {aiKeywords.length > 0 && (
        <section className="rounded-xl bg-surface-light/30 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Słowa kluczowe AI</p>
          <p className="mt-2 text-sm text-muted-foreground">{aiKeywords.join(', ')}</p>
        </section>
      )}
    </div>
  );
}
