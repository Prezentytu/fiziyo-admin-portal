'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { FeelSafetySection } from '@/components/shared/enrichment/FeelSafetySection';
import { ListEditor } from '@/components/shared/enrichment/ListEditor';
import { MistakesCuesSection } from './enrichment/MistakesCuesSection';
import { PatientInstructionSection } from './enrichment/PatientInstructionSection';
import { TherapistNotesSection } from '@/components/shared/enrichment/TherapistNotesSection';
import { useEnrichmentDraft } from '@/components/shared/enrichment/useEnrichmentDraft';
import { aiService } from '@/services/aiService';
import type { AdminExercise } from '@/graphql/types/adminExercise.types';
import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';
import { computeCompleteness } from './utils/enrichmentSkeleton';
import { cleanupEnrichment, parseEnrichmentJson, toFullShapeJson } from './utils/enrichment';
import { toV3 } from './utils/enrichmentToV3';

interface EnrichmentEditorProps {
  exercise: AdminExercise;
  enrichmentData?: ExerciseEnrichmentData | null;
  videoUrl?: string;
  disabled?: boolean;
  onFieldChange: (field: string, value: unknown) => Promise<void>;
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

export function EnrichmentEditor({
  exercise,
  enrichmentData,
  videoUrl,
  disabled = false,
  onFieldChange,
}: Readonly<EnrichmentEditorProps>) {
  const [localVideoUrl, setLocalVideoUrl] = useState(videoUrl ?? '');
  const [rawJson, setRawJson] = useState('{}');
  const [rawJsonError, setRawJsonError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const preAiSnapshotRef = useRef<ExerciseEnrichmentData | null>(null);

  const { draft, setDraft, setPath, updateDraft, composePayload, persist } = useEnrichmentDraft({
    enrichmentData,
    onFieldChange,
  });

  useEffect(() => {
    setLocalVideoUrl(videoUrl ?? '');
  }, [videoUrl]);

  useEffect(() => {
    setRawJson(toFullShapeJson(toV3(enrichmentData)));
    setRawJsonError(null);
  }, [enrichmentData]);

  const persistStructuredData = useCallback(async () => {
    await persist();
    setRawJson(toFullShapeJson(composePayload()));
    setRawJsonError(null);
  }, [composePayload, persist]);

  const handleVideoBlur = useCallback(async () => {
    await onFieldChange('videoUrl', localVideoUrl.trim() || null);
  }, [localVideoUrl, onFieldChange]);

  const canPersistRawJson = useMemo(() => rawJson.trim().length > 0, [rawJson]);
  const completeness = useMemo(() => computeCompleteness(draft), [draft]);
  const missingLabels = useMemo(() => completeness.missing.map((section) => section.label), [completeness.missing]);

  const applyAndSave = useCallback(
    async (data: ExerciseEnrichmentData) => {
      setDraft(data);
      setRawJson(toFullShapeJson(data));
      await onFieldChange('enrichmentData', data);
    },
    [onFieldChange, setDraft]
  );

  const handleApplyRawJson = useCallback(async () => {
    try {
      const parsed = parseEnrichmentJson(rawJson);
      // toV3 obsługuje też przypadek, gdyby ktoś wkleił JSON w starym (v2) kształcie.
      const cleaned = (cleanupEnrichment(toV3(parsed)) ?? {}) as ExerciseEnrichmentData;
      await applyAndSave(cleaned);
      setRawJsonError(null);
    } catch (error) {
      setRawJsonError(error instanceof Error ? error.message : 'Nie udało się przetworzyć JSON.');
    }
  }, [applyAndSave, rawJson]);

  const handleDiscardAiProposal = useCallback(async () => {
    const snapshot = preAiSnapshotRef.current;
    if (!snapshot) return;
    await applyAndSave(snapshot);
    setRawJsonError(null);
    toast.info('Przywrócono dane sprzed AI.');
  }, [applyAndSave]);

  const handleGenerateAi = useCallback(async () => {
    if (isGenerating || disabled) return;

    setIsGenerating(true);
    setRawJsonError(null);

    const preAiPayload = composePayload();
    preAiSnapshotRef.current = preAiPayload;

    const tags = [...(exercise.mainTags ?? []), ...(exercise.additionalTags ?? [])];
    const response = await aiService.generateEnrichment({
      exerciseName: exercise.name,
      patientDescription: exercise.patientDescription,
      clinicalDescription: exercise.clinicalDescription,
      type: exercise.type?.toLowerCase() === 'time' ? 'time' : 'reps',
      tags,
      existingEnrichmentJson: JSON.stringify(preAiPayload),
    });

    setIsGenerating(false);

    if (!response?.success || !response.enrichmentData) {
      toast.error('Nie udało się wygenerować danych. Spróbuj ponownie.');
      return;
    }

    // toV3 jest idempotentny — bezpieczny niezależnie od tego, czy AI zwróciło już v3 (docelowo) czy v2.
    // Nie walidujemy Zodem, który mógłby cicho zwrócić {} i wyciszyć dane.
    const aiData = toV3(response.enrichmentData as ExerciseEnrichmentData);
    const merged = deepMergeFillGaps(preAiPayload, aiData) as ExerciseEnrichmentData;
    const cleanedMerged = (cleanupEnrichment(merged) ?? {}) as ExerciseEnrichmentData;

    const beforeFilled = computeCompleteness(preAiPayload).filled;
    const afterFilled = computeCompleteness(cleanedMerged).filled;
    const newSections = afterFilled - beforeFilled;

    try {
      await applyAndSave(cleanedMerged);
      toast.success(
        newSections > 0
          ? `AI uzupełniło ${newSections} ${newSections === 1 ? 'sekcję' : 'sekcji'} i zapisało.`
          : 'AI przejrzało ćwiczenie — wszystkie sekcje były już wypełnione.',
        {
          action:
            newSections > 0
              ? { label: 'Cofnij', onClick: () => void handleDiscardAiProposal() }
              : undefined,
          duration: 7000,
        }
      );
    } catch {
      toast.error('AI wypełniło dane, ale zapis nie powiódł się. Kliknij "Zapisz" ręcznie.');
    }
  }, [applyAndSave, composePayload, disabled, exercise, handleDiscardAiProposal, isGenerating]);

  return (
    <div className="@container/enrich space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/40 bg-muted/20 p-2">
        <p className="text-xs text-muted-foreground">
          Wypełnione{' '}
          <span className={completeness.filled === completeness.total ? 'text-emerald-600 dark:text-emerald-400' : ''}>
            {completeness.filled}/{completeness.total}
          </span>{' '}
          sekcji
        </p>
        <Button
          type="button"
          size="sm"
          variant={completeness.filled < completeness.total ? 'default' : 'outline'}
          disabled={disabled || isGenerating}
          onClick={() => void handleGenerateAi()}
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

      <Tabs defaultValue="structured" className="w-full">
        <TabsList className="grid h-9 w-full grid-cols-2">
          <TabsTrigger value="structured" className="text-xs">
            Edytor pełny
          </TabsTrigger>
          <TabsTrigger value="raw" className="text-xs">
            Zaawansowane JSON
          </TabsTrigger>
        </TabsList>

        <TabsContent value="structured" className="space-y-4 pt-2">
          <div className="space-y-1">
            <Label htmlFor="enrichment-video-url" className="text-xs text-muted-foreground">
              URL wideo (YouTube / Vimeo / mp4 / mov)
            </Label>
            <Input
              id="enrichment-video-url"
              value={localVideoUrl}
              disabled={disabled}
              placeholder="https://www.youtube.com/watch?v=... lub https://.../video.mp4"
              onChange={(event) => setLocalVideoUrl(event.target.value)}
              onBlur={() => void handleVideoBlur()}
            />
          </div>

          <div className="space-y-2 rounded-md border border-border/40 p-2.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Instrukcja pacjenta</p>
            <PatientInstructionSection
              draft={draft}
              disabled={disabled}
              setPath={setPath}
              persist={persistStructuredData}
            />
          </div>

          <div className="space-y-2 rounded-md border border-border/40 p-2.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Błędy i wskazówki techniczne</p>
            <MistakesCuesSection
              draft={draft}
              disabled={disabled}
              updateDraft={updateDraft}
              setPath={setPath}
              persist={persistStructuredData}
            />
          </div>

          <div className="space-y-2 rounded-md border border-border/40 p-2.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Odczucia i bezpieczeństwo</p>
            <FeelSafetySection draft={draft} disabled={disabled} setPath={setPath} persist={persistStructuredData} />
          </div>

          <div className="space-y-2 rounded-md border border-border/40 p-2.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notatki terapeutyczne</p>
            <TherapistNotesSection
              draft={draft}
              disabled={disabled}
              setPath={setPath}
              persist={persistStructuredData}
            />
          </div>

          <div className="space-y-2 rounded-md border border-border/40 p-2.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Słowa kluczowe do wyszukiwania</p>
            <ListEditor
              title="Słowa kluczowe wyszukiwania"
              items={draft.ai?.keywords ?? []}
              placeholder="np. stabilizacja centralna"
              addLabel="Dodaj słowo kluczowe"
              disabled={disabled}
              onChange={(items) => setPath('ai.keywords', items)}
              onBlur={() => void persistStructuredData()}
              testIdPrefix="enrichment-editor-ai-keywords"
            />
          </div>
        </TabsContent>

        <TabsContent value="raw" className="space-y-3 pt-2">
          <div className="space-y-2 rounded-md border border-border/40 bg-muted/20 p-2.5">
            <p className="text-xs font-medium text-muted-foreground">
              Wypełnione {completeness.filled}/{completeness.total} sekcji
            </p>
            {missingLabels.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {missingLabels.map((label) => (
                  <span
                    key={label}
                    className="rounded-full border border-border/60 bg-background/70 px-2 py-0.5 text-[10px] text-muted-foreground"
                  >
                    Brakuje: {label}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400">Wszystkie sekcje są uzupełnione.</p>
            )}
          </div>

          <Textarea
            value={rawJson}
            disabled={disabled}
            onChange={(event) => {
              setRawJson(event.target.value);
              setRawJsonError(null);
            }}
            className="min-h-[320px] font-mono text-xs"
            data-testid="enrichment-raw-json"
          />
          {rawJsonError && <p className="text-xs text-destructive">{rawJsonError}</p>}
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              disabled={disabled || !canPersistRawJson}
              onClick={() => void handleApplyRawJson()}
            >
              Zapisz JSON
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
