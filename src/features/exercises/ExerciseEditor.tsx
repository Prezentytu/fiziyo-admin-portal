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
import { ExerciseExecutionSteps } from './ExerciseExecutionSteps';
import { ExerciseAudioCues } from './ExerciseAudioCues';
import {
  PatientLeadSection,
  PatientExtrasSection,
  SafetySection,
  TherapistSection,
  MetadataSection,
} from './ExerciseDetailSections';
import type { UseExerciseEditorFormResult } from './useExerciseEditorForm';

import { aiService } from '@/services/aiService';
import { cleanupEnrichment, parseEnrichmentJson, toFullShapeJson } from '@/features/verification/utils/enrichment';
import { toV3 } from '@/features/verification/utils/enrichmentToV3';
import { computeCompleteness } from '@/features/verification/utils/enrichmentSkeleton';
import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';

/**
 * Kontekst potrzebny do "Uzupełnij przez AI" — dane wejściowe do wygenerowania treści.
 * Opcjonalny: gdy nie podany, przycisk AI-fill nie jest renderowany (np. na stronie ćwiczenia).
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

function isFillable(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value as Record<string, unknown>).length === 0;
  return false;
}

function deepMergeFillGaps(currentValue: unknown, aiValue: unknown): unknown {
  if (aiValue === undefined || aiValue === null) return currentValue;
  if (isFillable(currentValue)) return aiValue;

  if (Array.isArray(currentValue) || Array.isArray(aiValue)) {
    return currentValue;
  }

  if (typeof currentValue === 'object' && typeof aiValue === 'object' && currentValue && aiValue) {
    const currentRecord = currentValue as Record<string, unknown>;
    const aiRecord = aiValue as Record<string, unknown>;
    const keys = new Set([...Object.keys(currentRecord), ...Object.keys(aiRecord)]);
    const merged: Record<string, unknown> = {};
    for (const key of keys) {
      merged[key] = deepMergeFillGaps(currentRecord[key], aiRecord[key]);
    }
    return merged;
  }

  return currentValue;
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
  const preAiSnapshotRef = useRef<ExerciseEnrichmentData | null>(null);
  const completeness = useMemo(() => computeCompleteness(enrichment), [enrichment]);

  const handleDiscard = useCallback(() => {
    const snapshot = preAiSnapshotRef.current;
    if (!snapshot) return;
    onApply(snapshot);
    toast.info('Przywrócono dane sprzed AI.');
  }, [onApply]);

  const handleGenerate = useCallback(async () => {
    if (isGenerating || disabled) return;
    setIsGenerating(true);
    preAiSnapshotRef.current = enrichment;

    const tags = [...(context.mainTags ?? []), ...(context.additionalTags ?? [])];
    const response = await aiService.generateEnrichment({
      exerciseName: context.name,
      patientDescription: context.patientDescription,
      clinicalDescription: context.clinicalDescription,
      type: context.type?.toLowerCase() === 'time' ? 'time' : 'reps',
      tags,
      existingEnrichmentJson: JSON.stringify(enrichment),
    });

    setIsGenerating(false);

    if (!response?.success || !response.enrichmentData) {
      toast.error('Nie udało się wygenerować danych. Spróbuj ponownie.');
      return;
    }

    const aiData = toV3(response.enrichmentData as ExerciseEnrichmentData);
    const merged = deepMergeFillGaps(enrichment, aiData) as ExerciseEnrichmentData;
    const cleanedMerged = (cleanupEnrichment(merged) ?? {}) as ExerciseEnrichmentData;

    const beforeFilled = computeCompleteness(enrichment).filled;
    const afterFilled = computeCompleteness(cleanedMerged).filled;
    const newSections = afterFilled - beforeFilled;

    onApply(cleanedMerged);
    toast.success(
      newSections > 0
        ? `AI uzupełniło ${newSections} ${newSections === 1 ? 'sekcję' : 'sekcji'}.`
        : 'AI przejrzało ćwiczenie — wszystkie sekcje były już wypełnione.',
      {
        action: newSections > 0 ? { label: 'Cofnij', onClick: handleDiscard } : undefined,
        duration: 7000,
      }
    );
  }, [context, disabled, enrichment, handleDiscard, isGenerating, onApply]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/40 bg-surface/50 p-3">
      <p className="text-xs text-muted-foreground">
        Wypełnione{' '}
        <span className={completeness.filled === completeness.total ? 'text-emerald-600 dark:text-emerald-400' : ''}>
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
      const cleaned = (cleanupEnrichment(toV3(parsed)) ?? {}) as ExerciseEnrichmentData;
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
  aiFillContext,
  showAdvancedJson = false,
  className,
}: Readonly<ExerciseEditorProps>) {
  const { core, enrichment, setCoreField, setEnrichmentPath, replaceEnrichment, isCoreFieldDirty, isPathDirty } = form;

  const patientDescription = core.patientDescription;
  const audioCue = core.audioCue;

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
          isDirtyField={isCoreFieldDirty}
          disabled={disabled}
          onNumberChange={(field, value) => setCoreField(field, value)}
          onTextChange={(field, value) => setCoreField(field, value)}
          onSideChange={(value) => setCoreField('side', value)}
          onDifficultyChange={(value) => setCoreField('difficultyLevel', value)}
        />
      </div>

      <PatientLeadSection
        data={enrichment}
        patientDescription={patientDescription}
        editable
        disabled={disabled}
        patientDescriptionDirty={isCoreFieldDirty('patientDescription')}
        isPathDirty={isPathDirty}
        onPatientDescriptionChange={(value) => setCoreField('patientDescription', value)}
        setPath={setEnrichmentPath}
      />

      <ExerciseExecutionSteps
        enrichmentData={enrichment}
        patientDescription={patientDescription}
        editable
        disabled={disabled}
        setPath={setEnrichmentPath}
      />

      <ExerciseAudioCues
        audioCue={audioCue}
        enrichmentData={enrichment}
        editable
        disabled={disabled}
        onAudioCueChange={(value) => setCoreField('audioCue', value)}
        setPath={setEnrichmentPath}
      />

      <PatientExtrasSection data={enrichment} editable disabled={disabled} isPathDirty={isPathDirty} setPath={setEnrichmentPath} />

      <SafetySection data={enrichment} editable disabled={disabled} isPathDirty={isPathDirty} setPath={setEnrichmentPath} />

      <TherapistSection
        data={enrichment}
        clinicalDescription={core.clinicalDescription}
        editable
        disabled={disabled}
        clinicalDescriptionDirty={isCoreFieldDirty('clinicalDescription')}
        onClinicalDescriptionChange={(value) => setCoreField('clinicalDescription', value)}
        setPath={setEnrichmentPath}
        persist={async () => {}}
      />

      <MetadataSection
        data={enrichment}
        videoUrl={core.videoUrl}
        notes={core.notes}
        editable
        disabled={disabled}
        videoUrlDirty={isCoreFieldDirty('videoUrl')}
        notesDirty={isCoreFieldDirty('notes')}
        isPathDirty={isPathDirty}
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
