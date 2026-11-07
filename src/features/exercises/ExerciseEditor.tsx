'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { ChevronDown, Code2, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

import { ExerciseParametersEditor } from './ExerciseParametersEditor';
import { ExerciseContentSections } from './ExerciseContentSections';
import type { UseExerciseEditorFormResult } from './useExerciseEditorForm';
import { deepMergeFillGaps } from './utils/enrichmentFillGaps';

import { aiService } from '@/services/aiService';
import { compactEnrichment, parseEnrichmentJson, toFullShapeJson } from '@/features/verification/utils/enrichment';
import { toV3 } from '@/features/verification/utils/enrichmentToV3';
import { computeCompleteness } from '@/features/verification/utils/enrichmentSkeleton';
import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';
import { normalizeExerciseType } from '@/utils/exerciseEnums';

/**
 * Kontekst potrzebny do "Uzupełnij przez AI" — dane wejściowe do wygenerowania treści.
 * Domyślnie pochodzi z bieżącego szkicu edytora.
 */
export interface ExerciseEditorAiFillContext {
  name: string;
  patientDescription: string;
  clinicalDescription: string;
  type?: string;
  mainTags?: string[];
  additionalTags?: string[];
}

interface ExerciseEditorProps {
  /** Wynik `useExerciseEditorForm` — jedno źródło prawdy dla draftu core + enrichment. */
  form: UseExerciseEditorFormResult;
  /** Blokuje edycję (np. status weryfikacji), zachowując layout edytora. */
  disabled?: boolean;
  /** Pokazuje kompaktowe pole nazwy na górze edytora (np. w centrum weryfikacji, gdzie nie ma osobnego hero-nagłówka). */
  showNameField?: boolean;
  /** Włącza akcję "Uzupełnij przez AI" — wymaga kontekstu ćwiczenia. */
  aiFillContext?: ExerciseEditorAiFillContext;
  /** Pokazuje zwijaną sekcję "Zaawansowane (JSON)" do edycji surowego enrichmentu. */
  showAdvancedJson?: boolean;
  className?: string;
}

function revertUnchangedAiValues(current: unknown, before: unknown, after: unknown): unknown {
  if (JSON.stringify(current) === JSON.stringify(after)) return before;
  if (!current || typeof current !== 'object' || Array.isArray(current)) return current;
  const currentFields = current as Record<string, unknown>;
  const beforeFields = (before && typeof before === 'object' ? before : {}) as Record<string, unknown>;
  const afterFields = (after && typeof after === 'object' ? after : {}) as Record<string, unknown>;
  return Object.fromEntries(Object.entries(currentFields)
    .map(([key, value]) => [key, revertUnchangedAiValues(value, beforeFields[key], afterFields[key])])
    .filter(([, value]) => value !== undefined));
}

interface AiFillChange {
  before: ExerciseEnrichmentData;
  after: ExerciseEnrichmentData;
}

function AiFillBar({
  context,
  enrichment,
  disabled,
  onApply,
}: Readonly<{
  context: ExerciseEditorAiFillContext;
  enrichment: ExerciseEnrichmentData;
  disabled: boolean;
  onApply: (data: ExerciseEnrichmentData) => void;
}>) {
  const [isGenerating, setIsGenerating] = useState(false);
  const enrichmentRef = useRef(enrichment);
  enrichmentRef.current = enrichment;
  const completeness = useMemo(() => computeCompleteness(enrichment), [enrichment]);

  const handleDiscard = useCallback((change: AiFillChange) => {
    const current = enrichmentRef.current;
    const restored = revertUnchangedAiValues(current, change.before, change.after) as ExerciseEnrichmentData;
    const cuesChanged = JSON.stringify(current.patient?.cues) !== JSON.stringify(change.after.patient?.cues);
    const cuePhasesChanged = JSON.stringify(current.patient?.cue_phases) !== JSON.stringify(change.after.patient?.cue_phases);
    if (cuesChanged || cuePhasesChanged) {
      restored.patient = {
        ...restored.patient,
        cues: current.patient?.cues,
        cue_phases: current.patient?.cue_phases,
      };
    }
    onApply(compactEnrichment(restored) ?? {});
    toast.info('Cofnięto propozycję AI, zachowując ręczne zmiany.');
  }, [onApply]);

  const handleGenerate = useCallback(async () => {
    if (isGenerating || disabled) return;
    setIsGenerating(true);

    const tags = [...(context.mainTags ?? []), ...(context.additionalTags ?? [])];
    const response = await aiService.generateEnrichment({
      exerciseName: context.name,
      patientDescription: context.patientDescription,
      clinicalDescription: context.clinicalDescription,
      type: normalizeExerciseType(context.type) ?? 'reps',
      tags,
      existingEnrichmentJson: JSON.stringify(enrichment),
    });

    setIsGenerating(false);

    if (!response?.success || !response.enrichmentData) {
      toast.error('Nie udało się wygenerować danych. Spróbuj ponownie.');
      return;
    }

    const aiData = toV3(response.enrichmentData as ExerciseEnrichmentData);
    const currentEnrichment = enrichmentRef.current;
    const merged = deepMergeFillGaps(currentEnrichment, aiData) as ExerciseEnrichmentData;
    const cleanedMerged = compactEnrichment(merged) ?? {};

    const beforeFilled = computeCompleteness(currentEnrichment).filled;
    const afterFilled = computeCompleteness(cleanedMerged).filled;
    const newSections = afterFilled - beforeFilled;

    onApply(cleanedMerged);
    toast.success(
      newSections > 0
        ? `AI uzupełniło ${newSections} ${newSections === 1 ? 'sekcję' : 'sekcji'}.`
        : 'AI przejrzało ćwiczenie — wszystkie sekcje były już wypełnione.',
      {
        action: newSections > 0 ? {
          label: 'Cofnij',
          onClick: () => handleDiscard({ before: currentEnrichment, after: cleanedMerged }),
        } : undefined,
        duration: 7000,
      }
    );
  }, [context, disabled, enrichment, handleDiscard, isGenerating, onApply]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/40 bg-surface/50 p-3">
      <p className="text-xs text-muted-foreground">
        Wypełnione{' '}
        <span className={completeness.filled === completeness.total ? 'text-status-success' : ''}>
          {completeness.filled}/{completeness.total}
        </span>{' '}
        sekcji rozszerzonych
      </p>
      <Button
        type="button"
        size="sm"
        variant={completeness.filled < completeness.total ? 'default' : 'outline'}
        disabled={disabled || isGenerating || !context.name.trim()}
        onClick={() => void handleGenerate()}
        data-testid="exercise-editor-ai-fill-btn"
      >
        {isGenerating ? (
          <>
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            Generowanie...
          </>
        ) : (
          <>
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            Uzupełnij przez AI
          </>
        )}
      </Button>
    </div>
  );
}

function AdvancedJsonSection({
  enrichment,
  disabled,
  onApply,
}: Readonly<{
  enrichment: ExerciseEnrichmentData;
  disabled: boolean;
  onApply: (data: ExerciseEnrichmentData) => void;
}>) {
  const [isOpen, setIsOpen] = useState(false);
  const [rawJson, setRawJson] = useState(() => toFullShapeJson(toV3(enrichment)));
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setRawJson(toFullShapeJson(toV3(enrichment)));
      setError(null);
    }
  };

  const handleApply = () => {
    try {
      const parsed = parseEnrichmentJson(rawJson);
      const cleaned = compactEnrichment(toV3(parsed)) ?? {};
      onApply(cleaned);
      setError(null);
      toast.success('Dane JSON zostały zastosowane.');
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : 'Nie udało się przetworzyć JSON.');
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={handleOpenChange} className="rounded-2xl border border-border/40 bg-surface/50">
      <CollapsibleTrigger
        className="flex w-full items-center justify-between p-4 transition-colors hover:bg-accent/40 rounded-2xl data-[state=open]:rounded-b-none"
        data-testid="exercise-editor-advanced-json-trigger"
      >
        <div className="flex items-center gap-2">
          <Code2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-base font-semibold text-foreground">Zaawansowane (JSON)</span>
        </div>
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', isOpen && 'rotate-180')} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-3 border-t border-border/40 p-4">
          <p className="text-xs text-muted-foreground">
            Surowy JSON danych rozszerzonych (v3). Zmiany tutaj nadpisują wszystkie sekcje powyżej po kliknięciu „Zastosuj”.
          </p>
          <Textarea
            value={rawJson}
            disabled={disabled}
            onChange={(event) => {
              setRawJson(event.target.value);
              setError(null);
            }}
            className="min-h-[280px] font-mono text-xs"
            data-testid="exercise-editor-advanced-json-textarea"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              disabled={disabled || rawJson.trim().length === 0}
              onClick={handleApply}
              data-testid="exercise-editor-advanced-json-apply-btn"
            >
              Zastosuj JSON
            </Button>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function ExerciseEditor({
  form,
  disabled = false,
  showNameField = false,
  aiFillContext = {
    name: form.core.name,
    patientDescription: form.core.patientDescription,
    clinicalDescription: form.core.clinicalDescription,
    type: form.exerciseType,
  },
  showAdvancedJson = false,
  className,
}: Readonly<ExerciseEditorProps>) {
  const { core, enrichment, setCoreField, setEnrichmentPath, replaceEnrichment, isCoreFieldDirty, isPathDirty } = form;

  return (
    <div className={cn('space-y-4', className)}>
      {showNameField && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground" htmlFor="exercise-editor-name">
            Nazwa ćwiczenia
          </Label>
          <Input
            id="exercise-editor-name"
            value={core.name}
            disabled={disabled}
            onChange={(event) => setCoreField('name', event.target.value)}
            className="h-10 text-base font-semibold"
            data-testid="exercise-editor-name-input"
          />
        </div>
      )}

      {aiFillContext && (
        <AiFillBar context={aiFillContext} enrichment={enrichment} disabled={disabled} onApply={replaceEnrichment} />
      )}

      <div>
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
          <RefreshCw className="h-4 w-4 text-muted-foreground" />
          Parametry wykonania
        </h2>
        <ExerciseParametersEditor
          core={core}
          exerciseType={form.exerciseType}
          isDirtyField={isCoreFieldDirty}
          disabled={disabled}
          onNumberChange={(field, value) => setCoreField(field, value)}
          onTextChange={(field, value) => setCoreField(field, value)}
          onSideChange={(value) => setCoreField('side', value)}
          onDifficultyChange={(value) => setCoreField('difficultyLevel', value)}
        />
        {form.savedLoadLabel && (
          <p className="mt-2 text-xs text-muted-foreground" data-testid="exercise-editor-saved-load-note">
            Zapisane obciążenie: „{form.savedLoadLabel}”. Wpisanie kilogramów je zastąpi.
          </p>
        )}
      </div>

      <ExerciseContentSections
        enrichment={enrichment}
        patientDescription={core.patientDescription}
        clinicalDescription={core.clinicalDescription}
        audioCue={core.audioCue}
        videoUrl={core.videoUrl}
        notes={core.notes}
        disabled={disabled}
        patientDescriptionDirty={isCoreFieldDirty('patientDescription')}
        clinicalDescriptionDirty={isCoreFieldDirty('clinicalDescription')}
        videoUrlDirty={isCoreFieldDirty('videoUrl')}
        notesDirty={isCoreFieldDirty('notes')}
        isPathDirty={isPathDirty}
        onPatientDescriptionChange={(value) => setCoreField('patientDescription', value)}
        onClinicalDescriptionChange={(value) => setCoreField('clinicalDescription', value)}
        onAudioCueChange={(value) => setCoreField('audioCue', value)}
        onVideoUrlChange={(value) => setCoreField('videoUrl', value)}
        onNotesChange={(value) => setCoreField('notes', value)}
        setPath={setEnrichmentPath}
      />

      {showAdvancedJson && (
        <AdvancedJsonSection enrichment={enrichment} disabled={disabled} onApply={replaceEnrichment} />
      )}
    </div>
  );
}
