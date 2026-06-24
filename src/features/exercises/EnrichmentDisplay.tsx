'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  if (!enrichmentData) {
    return null;
  }

  const commonMistakes = enrichmentData.common_mistakes ?? [];
  const dosingProfiles = Object.entries(enrichmentData.dosing_profiles ?? {});
  const aiKeywords = enrichmentData.ai_metadata?.search_keywords ?? [];
  const postExercise = enrichmentData.patient_instruction?.post_exercise;
  const feedbackQuestions = postExercise?.feedback_questions ?? [];

  const hasMistakes = commonMistakes.length > 0;
  const hasFeel =
    hasValue(enrichmentData.feel_description?.should_feel) ||
    hasValue(enrichmentData.feel_description?.should_not_feel);
  const hasSafety =
    hasValue(enrichmentData.safety?.stop_if) ||
    hasValue(enrichmentData.safety?.intensity_guide) ||
    enrichmentData.safety?.requires_supervision === true;
  const hasPatientNotes =
    hasValue(enrichmentData.patient_notes?.why_this_exercise) ||
    hasValue(enrichmentData.patient_notes?.when_to_do) ||
    hasListValue(enrichmentData.patient_notes?.technique_reminders);
  const hasTherapistNotes =
    hasValue(enrichmentData.therapist_notes?.clinical_notes) ||
    hasListValue(enrichmentData.therapist_notes?.clinical_indications) ||
    hasListValue(enrichmentData.therapist_notes?.contraindications) ||
    hasListValue(enrichmentData.therapist_notes?.rehab_phase) ||
    hasListValue(enrichmentData.therapist_notes?.clinical_benefits) ||
    hasValue(enrichmentData.therapist_notes?.progression_notes);

  const hasClinical =
    hasMistakes || hasFeel || hasSafety || hasPatientNotes || hasTherapistNotes;

  const hasAdvanced =
    dosingProfiles.length > 0 || aiKeywords.length > 0 || feedbackQuestions.length > 0;

  if (!hasClinical && !hasAdvanced) {
    return null;
  }

  return (
    <div
      className="space-y-3 rounded-2xl border border-border/40 bg-surface/50 p-4 sm:p-6"
      data-testid="exercise-enrichment-display"
    >
      <h3 className="text-base font-semibold text-foreground">Dane rozszerzone</h3>

      {/* Typowe błędy */}
      {hasMistakes && (
        <section className="rounded-xl bg-surface-light/30 p-4 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
            Typowe błędy i korekty
          </p>
          <div className="space-y-3">
            {commonMistakes.map((mistake, index) => (
              <div
                key={`${mistake.mistake ?? ''}-${index}`}
                className="text-sm text-muted-foreground space-y-0.5"
              >
                <p>
                  <span className="font-medium text-foreground">Błąd:</span>{' '}
                  {mistake.mistake || 'Brak opisu'}
                </p>
                {mistake.fix && (
                  <p>
                    <span className="font-medium text-foreground">Korekta:</span> {mistake.fix}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Odczucia */}
      {hasFeel && (
        <section className="rounded-xl bg-surface-light/30 p-4 space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
            Odczucia pacjenta
          </p>
          {hasValue(enrichmentData.feel_description?.should_feel) && (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Powinno być odczuwalne:</span>{' '}
              {enrichmentData.feel_description?.should_feel}
            </p>
          )}
          {hasValue(enrichmentData.feel_description?.should_not_feel) && (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Nie powinno boleć ani dawać:</span>{' '}
              {enrichmentData.feel_description?.should_not_feel}
            </p>
          )}
        </section>
      )}

      {/* Bezpieczeństwo */}
      {hasSafety && (
        <section className="rounded-xl bg-amber-500/5 border border-amber-500/15 p-4 space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-600/70">
            Bezpieczeństwo
          </p>
          {enrichmentData.safety?.requires_supervision && (
            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
              Wymaga nadzoru fizjoterapeuty
            </p>
          )}
          {hasValue(enrichmentData.safety?.stop_if) && (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Przerwij gdy:</span>{' '}
              {enrichmentData.safety?.stop_if}
            </p>
          )}
          {hasValue(enrichmentData.safety?.intensity_guide) && (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Intensywność:</span>{' '}
              {enrichmentData.safety?.intensity_guide}
            </p>
          )}
        </section>
      )}

      {/* Notatki dla pacjenta (why / when) */}
      {hasPatientNotes && (
        <section className="rounded-xl bg-surface-light/30 p-4 space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
            Dlaczego to ćwiczenie
          </p>
          {hasValue(enrichmentData.patient_notes?.why_this_exercise) && (
            <p className="text-sm text-muted-foreground">
              {enrichmentData.patient_notes?.why_this_exercise}
            </p>
          )}
          {hasValue(enrichmentData.patient_notes?.when_to_do) && (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Kiedy wykonywać:</span>{' '}
              {enrichmentData.patient_notes?.when_to_do}
            </p>
          )}
          {hasListValue(enrichmentData.patient_notes?.technique_reminders) && (
            <ul className="list-disc pl-5 space-y-0.5 text-sm text-muted-foreground">
              {(enrichmentData.patient_notes?.technique_reminders ?? [])
                .filter((item) => hasValue(item))
                .map((item) => (
                  <li key={item}>{item}</li>
                ))}
            </ul>
          )}
        </section>
      )}

      {/* Notatki terapeutyczne */}
      {hasTherapistNotes && (
        <section className="rounded-xl bg-surface-light/30 p-4 space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
            Notatki terapeutyczne
          </p>
          {hasValue(enrichmentData.therapist_notes?.clinical_notes) && (
            <p className="text-sm text-muted-foreground">
              {enrichmentData.therapist_notes?.clinical_notes}
            </p>
          )}
          {hasListValue(enrichmentData.therapist_notes?.clinical_indications) && (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Wskazania:</span>{' '}
              {(enrichmentData.therapist_notes?.clinical_indications ?? []).join(', ')}
            </p>
          )}
          {hasListValue(enrichmentData.therapist_notes?.contraindications) && (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Przeciwwskazania:</span>{' '}
              {(enrichmentData.therapist_notes?.contraindications ?? []).join(', ')}
            </p>
          )}
          {hasListValue(enrichmentData.therapist_notes?.rehab_phase) && (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Faza rehab:</span>{' '}
              {(enrichmentData.therapist_notes?.rehab_phase ?? []).join(', ')}
            </p>
          )}
          {hasListValue(enrichmentData.therapist_notes?.clinical_benefits) && (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Korzyści kliniczne:</span>{' '}
              {(enrichmentData.therapist_notes?.clinical_benefits ?? []).join(', ')}
            </p>
          )}
          {hasValue(enrichmentData.therapist_notes?.progression_notes) && (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Progresja:</span>{' '}
              {enrichmentData.therapist_notes?.progression_notes}
            </p>
          )}
        </section>
      )}

      {/* Zaawansowane (zwijane): dosing profiles, AI keywords, feedback */}
      {hasAdvanced && (
        <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
          <CollapsibleTrigger
            className="flex w-full items-center justify-between rounded-xl bg-surface-light/20 px-4 py-2.5 text-left transition-colors hover:bg-surface-light/40"
            data-testid="exercise-enrichment-advanced-toggle"
          >
            <span className="text-xs font-medium text-muted-foreground">Zaawansowane</span>
            <ChevronDown
              className={cn(
                'h-3.5 w-3.5 text-muted-foreground transition-transform',
                isAdvancedOpen && 'rotate-180'
              )}
            />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-3 pt-3">
              {dosingProfiles.length > 0 && (
                <section className="rounded-xl bg-surface-light/30 p-4 space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                    Profile dawkowania
                  </p>
                  <div className="space-y-1.5 text-sm text-muted-foreground">
                    {dosingProfiles.map(([profileName, profile]) => (
                      <p key={profileName}>
                        <span className="font-medium text-foreground capitalize">{profileName}:</span>{' '}
                        {profile.sets ?? 0} serie, {profile.reps ?? 0} powt.
                        {(profile.rest_sets_seconds ?? 0) > 0 &&
                          `, odpoczynek ${profile.rest_sets_seconds}s`}
                        {profile.frequency && `, ${profile.frequency}`}
                      </p>
                    ))}
                  </div>
                </section>
              )}

              {feedbackQuestions.length > 0 && (
                <section className="rounded-xl bg-surface-light/30 p-4 space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                    Pytania feedbackowe (po ćwiczeniu)
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                    {feedbackQuestions.map((q, index) => (
                      <li key={`${q.id ?? ''}-${index}`}>{q.question || 'Brak treści pytania'}</li>
                    ))}
                  </ul>
                </section>
              )}

              {aiKeywords.length > 0 && (
                <section className="rounded-xl bg-surface-light/30 p-4 space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                    Słowa kluczowe AI
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {aiKeywords.map((kw) => (
                      <span
                        key={kw}
                        className="rounded-full bg-background border border-border/60 px-2 py-0.5 text-[11px] text-muted-foreground"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
