'use client';

import { useState } from 'react';
import { ChevronDown, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ListEditor } from '@/components/shared/enrichment/ListEditor';
import { FeelSafetySection } from '@/components/shared/enrichment/FeelSafetySection';
import { TherapistNotesSection } from '@/components/shared/enrichment/TherapistNotesSection';
import { DosingProfilesSection } from '@/components/shared/enrichment/DosingProfilesSection';
import type { EnrichmentCommonMistake, ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';

interface EnrichmentDisplayProps {
  enrichmentData?: ExerciseEnrichmentData | null;
  editable?: boolean;
  setPath?: (path: string, value: unknown) => void;
  updateDraft?: (updater: (current: ExerciseEnrichmentData) => ExerciseEnrichmentData) => void;
  persist?: () => Promise<void>;
}

function hasValue(value: string | undefined): value is string {
  return Boolean(value && value.trim().length > 0);
}

function hasListValue(values: string[] | undefined): boolean {
  return Boolean(values?.some((value) => hasValue(value)));
}

function MistakesEditor({
  items,
  onChange,
  onBlur,
}: Readonly<{
  items: EnrichmentCommonMistake[];
  onChange: (items: EnrichmentCommonMistake[]) => void;
  onBlur: () => void;
}>) {
  const safeItems = items.length > 0 ? items : [{ mistake: '', fix: '' }];

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onChange([...items, { mistake: '', fix: '' }])}
          data-testid="exercise-enrichment-add-mistake-btn"
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Dodaj błąd
        </Button>
      </div>
      {safeItems.map((item, index) => (
        <div key={`mistake-${index}`} className="space-y-1.5 rounded-lg border border-border/40 p-2.5">
          <div className="flex min-w-0 gap-2">
            <Input
              value={item.mistake ?? ''}
              placeholder="Błąd"
              className="min-w-0 w-full"
              onChange={(event) => {
                const next = [...safeItems];
                next[index] = { ...next[index], mistake: event.target.value };
                onChange(next);
              }}
              onBlur={onBlur}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Usuń błąd"
              onClick={() => {
                onChange(safeItems.filter((_, entryIndex) => entryIndex !== index));
                onBlur();
              }}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
          <Input
            value={item.fix ?? ''}
            placeholder="Jak poprawić"
            onChange={(event) => {
              const next = [...safeItems];
              next[index] = { ...next[index], fix: event.target.value };
              onChange(next);
            }}
            onBlur={onBlur}
          />
        </div>
      ))}
    </div>
  );
}

export function EnrichmentDisplay({
  enrichmentData,
  editable = false,
  setPath,
  updateDraft,
  persist,
}: Readonly<EnrichmentDisplayProps>) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  if (!enrichmentData && !editable) {
    return null;
  }

  const data = enrichmentData ?? {};
  const safeSetPath = setPath ?? (() => {});
  const safeUpdateDraft = updateDraft ?? (() => {});
  const safePersist = persist ?? (async () => {});

  const commonMistakes = data.common_mistakes ?? [];
  const dosingProfiles = Object.entries(data.dosing_profiles ?? {});
  const aiKeywords = data.ai_metadata?.search_keywords ?? [];
  const postExercise = data.patient_instruction?.post_exercise;
  const feedbackQuestions = postExercise?.feedback_questions ?? [];

  const hasMistakes = commonMistakes.length > 0;
  const hasFeel = hasValue(data.feel_description?.should_feel) || hasValue(data.feel_description?.should_not_feel);
  const hasSafety =
    hasValue(data.safety?.stop_if) || hasValue(data.safety?.intensity_guide) || data.safety?.requires_supervision === true;
  const hasPatientNotes =
    hasValue(data.patient_notes?.why_this_exercise) ||
    hasValue(data.patient_notes?.when_to_do) ||
    hasListValue(data.patient_notes?.technique_reminders);
  const hasTherapistNotes =
    hasValue(data.therapist_notes?.clinical_notes) ||
    hasListValue(data.therapist_notes?.clinical_indications) ||
    hasListValue(data.therapist_notes?.contraindications) ||
    hasListValue(data.therapist_notes?.rehab_phase) ||
    hasListValue(data.therapist_notes?.clinical_benefits) ||
    hasValue(data.therapist_notes?.progression_notes);

  const hasFeelSafetyNotes = hasFeel || hasSafety || hasPatientNotes;
  const hasClinical = hasMistakes || hasFeelSafetyNotes || hasTherapistNotes;
  const hasAdvanced = dosingProfiles.length > 0 || aiKeywords.length > 0 || feedbackQuestions.length > 0;

  if (!editable && !hasClinical && !hasAdvanced) {
    return null;
  }

  return (
    <div
      className="space-y-3 rounded-2xl border border-border/40 bg-surface/50 p-4 sm:p-6"
      data-testid="exercise-enrichment-display"
    >
      <h3 className="text-base font-semibold text-foreground">Dane rozszerzone</h3>

      {/* Typowe błędy */}
      {(editable || hasMistakes) && (
        <section className="rounded-xl bg-surface-light/30 p-4 space-y-2" data-testid="exercise-enrichment-mistakes">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
            Typowe błędy i korekty
          </p>
          {editable ? (
            <MistakesEditor
              items={commonMistakes}
              onChange={(items) => safeSetPath('common_mistakes', items)}
              onBlur={() => void safePersist()}
            />
          ) : (
            <div className="space-y-3">
              {commonMistakes.map((mistake, index) => (
                <div key={`${mistake.mistake ?? ''}-${index}`} className="text-sm text-muted-foreground space-y-0.5">
                  <p>
                    <span className="font-medium text-foreground">Błąd:</span> {mistake.mistake || 'Brak opisu'}
                  </p>
                  {mistake.fix && (
                    <p>
                      <span className="font-medium text-foreground">Korekta:</span> {mistake.fix}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Odczucia, bezpieczeństwo, notatki dla pacjenta */}
      {editable ? (
        <section
          className="rounded-xl bg-surface-light/30 p-4 space-y-3"
          data-testid="exercise-enrichment-feel-safety"
        >
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
            Odczucia, bezpieczeństwo i notatki dla pacjenta
          </p>
          <FeelSafetySection draft={data} setPath={safeSetPath} persist={safePersist} />
        </section>
      ) : (
        <>
          {hasFeel && (
            <section className="rounded-xl bg-surface-light/30 p-4 space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                Odczucia pacjenta
              </p>
              {hasValue(data.feel_description?.should_feel) && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Powinno być odczuwalne:</span>{' '}
                  {data.feel_description?.should_feel}
                </p>
              )}
              {hasValue(data.feel_description?.should_not_feel) && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Nie powinno boleć ani dawać:</span>{' '}
                  {data.feel_description?.should_not_feel}
                </p>
              )}
            </section>
          )}

          {hasSafety && (
            <section className="rounded-xl bg-amber-500/5 border border-amber-500/15 p-4 space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-600/70">Bezpieczeństwo</p>
              {data.safety?.requires_supervision && (
                <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Wymaga nadzoru fizjoterapeuty</p>
              )}
              {hasValue(data.safety?.stop_if) && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Przerwij gdy:</span> {data.safety?.stop_if}
                </p>
              )}
              {hasValue(data.safety?.intensity_guide) && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Intensywność:</span> {data.safety?.intensity_guide}
                </p>
              )}
            </section>
          )}

          {hasPatientNotes && (
            <section className="rounded-xl bg-surface-light/30 p-4 space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                Dlaczego to ćwiczenie
              </p>
              {hasValue(data.patient_notes?.why_this_exercise) && (
                <p className="text-sm text-muted-foreground">{data.patient_notes?.why_this_exercise}</p>
              )}
              {hasValue(data.patient_notes?.when_to_do) && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Kiedy wykonywać:</span> {data.patient_notes?.when_to_do}
                </p>
              )}
              {hasListValue(data.patient_notes?.technique_reminders) && (
                <ul className="list-disc pl-5 space-y-0.5 text-sm text-muted-foreground">
                  {(data.patient_notes?.technique_reminders ?? [])
                    .filter((item) => hasValue(item))
                    .map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                </ul>
              )}
            </section>
          )}
        </>
      )}

      {/* Notatki terapeutyczne */}
      {(editable || hasTherapistNotes) && (
        <section className="rounded-xl bg-surface-light/30 p-4 space-y-1.5" data-testid="exercise-enrichment-therapist-notes">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
            Notatki terapeutyczne
          </p>
          {editable ? (
            <TherapistNotesSection draft={data} setPath={safeSetPath} persist={safePersist} />
          ) : (
            <>
              {hasValue(data.therapist_notes?.clinical_notes) && (
                <p className="text-sm text-muted-foreground">{data.therapist_notes?.clinical_notes}</p>
              )}
              {hasListValue(data.therapist_notes?.clinical_indications) && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Wskazania:</span>{' '}
                  {(data.therapist_notes?.clinical_indications ?? []).join(', ')}
                </p>
              )}
              {hasListValue(data.therapist_notes?.contraindications) && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Przeciwwskazania:</span>{' '}
                  {(data.therapist_notes?.contraindications ?? []).join(', ')}
                </p>
              )}
              {hasListValue(data.therapist_notes?.rehab_phase) && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Faza rehab:</span>{' '}
                  {(data.therapist_notes?.rehab_phase ?? []).join(', ')}
                </p>
              )}
              {hasListValue(data.therapist_notes?.clinical_benefits) && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Korzyści kliniczne:</span>{' '}
                  {(data.therapist_notes?.clinical_benefits ?? []).join(', ')}
                </p>
              )}
              {hasValue(data.therapist_notes?.progression_notes) && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Progresja:</span>{' '}
                  {data.therapist_notes?.progression_notes}
                </p>
              )}
            </>
          )}
        </section>
      )}

      {/* Zaawansowane (zwijane): dosing profiles, AI keywords, feedback */}
      {(editable || hasAdvanced) && (
        <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
          <CollapsibleTrigger
            className="flex w-full items-center justify-between rounded-xl bg-surface-light/20 px-4 py-2.5 text-left transition-colors hover:bg-surface-light/40"
            data-testid="exercise-enrichment-advanced-toggle"
          >
            <span className="text-xs font-medium text-muted-foreground">Zaawansowane</span>
            <ChevronDown
              className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', isAdvancedOpen && 'rotate-180')}
            />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-3 pt-3">
              {editable ? (
                <>
                  <section className="rounded-xl bg-surface-light/30 p-4 space-y-1.5" data-testid="exercise-enrichment-dosing-profiles">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                      Profile dawkowania
                    </p>
                    <DosingProfilesSection draft={data} setPath={safeSetPath} updateDraft={safeUpdateDraft} persist={safePersist} />
                  </section>

                  <section className="rounded-xl bg-surface-light/30 p-4 space-y-1.5">
                    <ListEditor
                      title="Pytania feedbackowe (po ćwiczeniu)"
                      items={feedbackQuestions.map((question) => question.question ?? '')}
                      placeholder="np. Jak oceniasz trudność tego ćwiczenia?"
                      addLabel="Dodaj pytanie"
                      onChange={(items) =>
                        safeSetPath(
                          'patient_instruction.post_exercise.feedback_questions',
                          items.map((question, index) => ({
                            id: feedbackQuestions[index]?.id ?? `fb-${index}`,
                            question,
                          }))
                        )
                      }
                      onBlur={() => void safePersist()}
                      testIdPrefix="exercise-enrichment-feedback-questions"
                    />
                  </section>

                  <section className="rounded-xl bg-surface-light/30 p-4 space-y-1.5">
                    <ListEditor
                      title="Słowa kluczowe AI"
                      items={aiKeywords}
                      placeholder="np. stabilizacja centralna"
                      addLabel="Dodaj słowo kluczowe"
                      onChange={(items) => safeSetPath('ai_metadata.search_keywords', items)}
                      onBlur={() => void safePersist()}
                      testIdPrefix="exercise-enrichment-ai-keywords"
                    />
                  </section>
                </>
              ) : (
                <>
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
                            {(profile.rest_sets_seconds ?? 0) > 0 && `, odpoczynek ${profile.rest_sets_seconds}s`}
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
                </>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
