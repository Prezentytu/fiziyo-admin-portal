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
import type { EnrichmentPatientMistakeV3, ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';

interface EnrichmentDisplayProps {
  enrichmentData?: ExerciseEnrichmentData | null;
  editable?: boolean;
  setPath?: (path: string, value: unknown) => void;
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
  items: EnrichmentPatientMistakeV3[];
  onChange: (items: EnrichmentPatientMistakeV3[]) => void;
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
              data-testid={`exercise-enrichment-mistake-text-${index}`}
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
              data-testid={`exercise-enrichment-mistake-remove-${index}`}
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
            data-testid={`exercise-enrichment-mistake-fix-${index}`}
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
  persist,
}: Readonly<EnrichmentDisplayProps>) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  if (!enrichmentData && !editable) {
    return null;
  }

  const data = enrichmentData ?? {};
  const safeSetPath = setPath ?? (() => {});
  const safePersist = persist ?? (async () => {});

  const mistakes = data.patient?.mistakes ?? [];
  const equipment = data.equipment ?? [];
  const aiKeywords = data.ai?.keywords ?? [];

  const hasMistakes = mistakes.length > 0;
  const hasFeel = hasValue(data.patient?.should_feel) || hasValue(data.patient?.should_not_feel);
  const hasSafety = hasValue(data.safety?.stop_if) || data.safety?.requires_supervision === true;
  const hasPatientNotes = hasValue(data.patient?.why) || hasValue(data.patient?.when_to_do);
  const hasTherapistNotes =
    hasValue(data.therapist?.clinical_notes) ||
    hasListValue(data.therapist?.indications) ||
    hasListValue(data.therapist?.contraindications) ||
    hasListValue(data.therapist?.rehab_phases) ||
    hasListValue(data.therapist?.clinical_benefits) ||
    hasValue(data.therapist?.progression_notes);

  const hasFeelSafetyNotes = hasFeel || hasSafety || hasPatientNotes;
  const hasClinical = hasMistakes || hasFeelSafetyNotes || hasTherapistNotes;
  const hasAdvanced = equipment.length > 0 || aiKeywords.length > 0;

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
              items={mistakes}
              onChange={(items) => safeSetPath('patient.mistakes', items)}
              onBlur={() => void safePersist()}
            />
          ) : (
            <div className="space-y-3">
              {mistakes.map((mistake, index) => (
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
              {hasValue(data.patient?.should_feel) && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Powinno być odczuwalne:</span>{' '}
                  {data.patient?.should_feel}
                </p>
              )}
              {hasValue(data.patient?.should_not_feel) && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Nie powinno boleć ani dawać:</span>{' '}
                  {data.patient?.should_not_feel}
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
            </section>
          )}

          {hasPatientNotes && (
            <section className="rounded-xl bg-surface-light/30 p-4 space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                Dlaczego to ćwiczenie
              </p>
              {hasValue(data.patient?.why) && <p className="text-sm text-muted-foreground">{data.patient?.why}</p>}
              {hasValue(data.patient?.when_to_do) && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Kiedy wykonywać:</span> {data.patient?.when_to_do}
                </p>
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
              {hasValue(data.therapist?.clinical_notes) && (
                <p className="text-sm text-muted-foreground">{data.therapist?.clinical_notes}</p>
              )}
              {hasListValue(data.therapist?.indications) && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Wskazania:</span>{' '}
                  {(data.therapist?.indications ?? []).join(', ')}
                </p>
              )}
              {hasListValue(data.therapist?.contraindications) && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Przeciwwskazania:</span>{' '}
                  {(data.therapist?.contraindications ?? []).join(', ')}
                </p>
              )}
              {hasListValue(data.therapist?.rehab_phases) && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Faza rehab:</span>{' '}
                  {(data.therapist?.rehab_phases ?? []).join(', ')}
                </p>
              )}
              {hasListValue(data.therapist?.clinical_benefits) && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Korzyści kliniczne:</span>{' '}
                  {(data.therapist?.clinical_benefits ?? []).join(', ')}
                </p>
              )}
              {hasValue(data.therapist?.progression_notes) && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Progresja:</span> {data.therapist?.progression_notes}
                </p>
              )}
            </>
          )}
        </section>
      )}

      {/* Zaawansowane (zwijane): sprzęt, słowa kluczowe AI */}
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
                  <section className="rounded-xl bg-surface-light/30 p-4 space-y-1.5">
                    <ListEditor
                      title="Potrzebny sprzęt"
                      items={equipment}
                      placeholder="np. Mata do ćwiczeń"
                      addLabel="Dodaj sprzęt"
                      onChange={(items) => safeSetPath('equipment', items)}
                      onBlur={() => void safePersist()}
                      testIdPrefix="exercise-enrichment-equipment"
                    />
                  </section>

                  <section className="rounded-xl bg-surface-light/30 p-4 space-y-1.5">
                    <ListEditor
                      title="Słowa kluczowe AI"
                      items={aiKeywords}
                      placeholder="np. stabilizacja centralna"
                      addLabel="Dodaj słowo kluczowe"
                      onChange={(items) => safeSetPath('ai.keywords', items)}
                      onBlur={() => void safePersist()}
                      testIdPrefix="exercise-enrichment-ai-keywords"
                    />
                  </section>
                </>
              ) : (
                <>
                  {equipment.length > 0 && (
                    <section className="rounded-xl bg-surface-light/30 p-4 space-y-1.5">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                        Potrzebny sprzęt
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {equipment.map((item) => (
                          <span
                            key={item}
                            className="rounded-full bg-background border border-border/60 px-2 py-0.5 text-[11px] text-muted-foreground"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
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
