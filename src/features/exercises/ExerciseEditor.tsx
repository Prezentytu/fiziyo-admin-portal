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
import { deepMergeFillGaps, revertUnchangedAiValues } from './utils/enrichmentFillGaps';
import { ExerciseSaveConflictNotice } from './ExerciseSaveConflictNotice';
import { countV33AiFillSections, mergeV33AiFill, parseV33JsonDocument } from './utils/enrichmentV33Document';

import { aiService } from '@/services/aiService';
import { compactEnrichment, parseEnrichmentJson, toFullShapeJson } from '@/features/verification/utils/enrichment';
import { toV3 } from '@/features/verification/utils/enrichmentToV3';
import { computeCompleteness } from '@/features/verification/utils/enrichmentSkeleton';
import type { ExerciseContentVersion } from '@/components/shared/exercise/readExerciseContent';
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

interface AiFillChange {
  before: ExerciseEnrichmentData;
  after: ExerciseEnrichmentData;
}

function AiFillBar({
  context,
  enrichment,
  contentVersion,
  disabled,
  onApply,
}: Readonly<{
  context: ExerciseEditorAiFillContext;
  enrichment: ExerciseEnrichmentData;
  contentVersion: ExerciseContentVersion;
  disabled: boolean;
  onApply: (data: ExerciseEnrichmentData) => void;
}>) {
  const [isGenerating, setIsGenerating] = useState(false);
  const enrichmentRef = useRef(enrichment);
  enrichmentRef.current = enrichment;
  // A 3.3 draft is never compacted or widened: AI may only fill the fields that live in the same place in 3.3.
  const isV33 = contentVersion === '3.3';
  const countFilled = useCallback(
    (data: ExerciseEnrichmentData) => (isV33 ? countV33AiFillSections(data) : computeCompleteness(data)),
    [isV33]
  );
  const completeness = useMemo(() => countFilled(enrichment), [countFilled, enrichment]);

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
    onApply(isV33 ? restored : (compactEnrichment(restored) ?? {}));
    toast.info('Cofnięto propozycję AI, zachowując ręczne zmiany.');
  }, [isV33, onApply]);

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

    const currentEnrichment = enrichmentRef.current;
    const cleanedMerged = isV33
      ? mergeV33AiFill(currentEnrichment, response.enrichmentData as ExerciseEnrichmentData)
      : (compactEnrichment(
          deepMergeFillGaps(
            currentEnrichment,
            toV3(response.enrichmentData as ExerciseEnrichmentData)
          ) as ExerciseEnrichmentData
        ) ?? {});

    const beforeFilled = countFilled(currentEnrichment).filled;
    const afterFilled = countFilled(cleanedMerged).filled;
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
  }, [context, countFilled, disabled, enrichment, handleDiscard, isGenerating, isV33, onApply]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/40 bg-surface/50 p-3">
      <p className="text-xs text-muted-foreground">
        Wypełnione{' '}
        <span className={completeness.filled === completeness.total ? 'text-status-success' : ''}>
          {completeness.filled}/{completeness.total}
        </span>{' '}
        {isV33 ? 'sekcji, które uzupełnia AI' : 'sekcji rozszerzonych'}
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
  contentVersion,
  disabled,
  onApply,
}: Readonly<{
  enrichment: ExerciseEnrichmentData;
  contentVersion: ExerciseContentVersion;
  disabled: boolean;
  onApply: (data: ExerciseEnrichmentData) => void;
}>) {
  const isV33 = contentVersion === '3.3';
  // The 3.3 document is shown as stored: the skeleton would add retired keys and `toV3` could drop the new ones.
  const toRawJson = (data: ExerciseEnrichmentData) =>
    isV33 ? JSON.stringify(data, null, 2) : toFullShapeJson(toV3(data));
  const [isOpen, setIsOpen] = useState(false);
  const [rawJson, setRawJson] = useState(() => toRawJson(enrichment));
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setRawJson(toRawJson(enrichment));
      setError(null);
    }
  };

  const handleApply = () => {
    try {
      const cleaned = isV33
        ? parseV33JsonDocument(rawJson)
        : (compactEnrichment(toV3(parseEnrichmentJson(rawJson))) ?? {});
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
            {isV33
              ? 'Surowy JSON treści ćwiczenia (3.3). „Zastosuj” przenosi do formularza pola, które da się w nim edytować; pozostałe części dokumentu zostają zapisane bez zmian.'
              : 'Surowy JSON danych rozszerzonych (v3). Zmiany tutaj nadpisują wszystkie sekcje powyżej po kliknięciu „Zastosuj”.'}
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
          {error && (
            <p className="text-xs text-destructive" data-testid="exercise-editor-advanced-json-error">
              {error}
            </p>
          )}
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
    // A 3.3 record has no patient or clinical description; the summary is the context for the generator.
    patientDescription:
      form.contentVersion === '3.3' ? (form.enrichment.patient?.summary ?? '') : form.core.patientDescription,
    clinicalDescription: form.contentVersion === '3.3' ? '' : form.core.clinicalDescription,
    type: form.exerciseType,
  },
  showAdvancedJson = false,
  className,
}: Readonly<ExerciseEditorProps>) {
  const {
    core,
    enrichment,
    contentVersion,
    setCoreField,
    setEnrichmentPath,
    replaceEnrichment,
    isCoreFieldDirty,
    isPathDirty,
  } = form;

  return (
    <div className={cn('space-y-4', className)}>
      {form.hasSaveConflict && (
        <ExerciseSaveConflictNotice collisions={form.saveCollisions} onLoadCurrent={form.loadCurrentVersion} />
      )}
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
        <AiFillBar
          context={aiFillContext}
          enrichment={enrichment}
          contentVersion={contentVersion}
          disabled={disabled}
          onApply={replaceEnrichment}
        />
      )}

      <div>
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
          <RefreshCw className="h-4 w-4 text-muted-foreground" />
          Parametry wykonania
        </h2>
        <ExerciseParametersEditor
          core={core}
          exerciseType={form.exerciseType}
          alternatingPerSide={form.alternatingPerSide}
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
        contentVersion={contentVersion}
      />

      {showAdvancedJson && (
        <AdvancedJsonSection
          enrichment={enrichment}
          contentVersion={contentVersion}
          disabled={disabled}
          onApply={replaceEnrichment}
        />
      )}
    </div>
  );
}
