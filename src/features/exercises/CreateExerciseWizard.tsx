'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useApolloClient } from '@apollo/client/react';
import {
  Loader2,
  Dumbbell,
  Clock,
  Check,
  Tag,
  Plus,
  Mic,
  Wand2,
  X,
  ChevronDown,
  ChevronLeft,
  Settings2,
  Zap,
  Sparkles,
  AlertTriangle,
  Upload,
  ZoomIn,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ImageLightbox } from '@/components/shared/ImageLightbox';
import { TagPicker } from './TagPicker';
import { ExerciseFieldLabelWithTooltip } from './ExerciseFieldLabelWithTooltip';
import { EXERCISE_FIELD_TOOLTIPS } from './exerciseFieldTooltips';
import { cn } from '@/lib/utils';

import { CREATE_EXERCISE_MUTATION, UPLOAD_EXERCISE_IMAGE_MUTATION } from '@/graphql/mutations/exercises.mutations';
import { GET_AVAILABLE_EXERCISES_QUERY } from '@/graphql/queries/exercises.queries';
import { GET_EXERCISE_TAGS_BY_ORGANIZATION_QUERY } from '@/graphql/queries/exerciseTags.queries';
import { GET_TAG_CATEGORIES_BY_ORGANIZATION_QUERY } from '@/graphql/queries/tagCategories.queries';
import type { ExerciseTagsResponse, TagCategoriesResponse } from '@/types/apollo';
import type { CreateExerciseMutationResult, CreateExerciseVariables } from '@/graphql/types/exercise.types';

import { useVoiceInput } from '@/hooks/useVoiceInput';
import { aiService } from '@/services/aiService';
import type { ExerciseSuggestionResponse } from '@/services/aiService';
import { useExerciseImageGeneration } from './useExerciseImageGeneration';
import { ImageStylePicker } from './ImageStylePicker';
import { formatDurationPolish } from '@/utils/durationPolish';
import { calculateExerciseTotalSeconds } from '@/utils/exerciseTime';
import { findSimilar } from '@/utils/stringSimilarity';
import { buildCreateExerciseVariables } from './utils/buildCreateExerciseVariables';
import { inferExerciseType } from './utils/inferExerciseType';
import { ExerciseParametersEditor } from './ExerciseParametersEditor';
import type { ExerciseCoreDraft } from './useExerciseEditorForm';

// ============================================================
// QUICK PRESETS (Unified - shows all params)
// ============================================================
const QUICK_PRESETS = [
  { label: '3×10', sets: 3, reps: 10, executionTime: null, duration: null, rest: 60 },
  { label: '3×15', sets: 3, reps: 15, executionTime: null, duration: null, rest: 45 },
  { label: '4×8', sets: 4, reps: 8, executionTime: null, duration: null, rest: 90 },
  { label: '30s×3', sets: 3, reps: 1, executionTime: 30, duration: null, rest: 30 },
  { label: '45s×3', sets: 3, reps: 1, executionTime: 45, duration: null, rest: 30 },
];

// ============================================================
// TYPES
// ============================================================
type ExerciseSide = 'none' | 'left' | 'right' | 'both' | 'alternating';

interface ExerciseData {
  name: string;
  description: string;
  clinicalDescription: string;
  audioCue: string;
  exerciseSide: ExerciseSide;
  difficultyLevel: string;
  sets: number | null;
  reps: number | null;
  duration: number | null;
  restSets: number | null;
  restReps: number | null;
  preparationTime: number | null;
  executionTime: number | null;
  videoUrl: string;
  notes: string;
  mainTags: string[];
  additionalTags: string[];
  tempo: string;
  loadKg: number | null;
  rangeOfMotion: string;
}

function parseAiWeightToLoadKg(weight: string | null | undefined): number | null {
  if (!weight) return null;
  const match = weight.replace(',', '.').match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return !Number.isNaN(parsed) && parsed > 0 ? parsed : null;
}

// Interface for existing exercises from API
interface ExistingExercise {
  id: string;
  name: string;
  imageUrl?: string | null;
}

const EXERCISE_SIDES: { value: ExerciseSide; label: string }[] = [
  { value: 'none', label: 'Bez podziału' },
  { value: 'both', label: 'Obie strony' },
  { value: 'left', label: 'Lewa strona' },
  { value: 'right', label: 'Prawa strona' },
  { value: 'alternating', label: 'Naprzemiennie' },
];

interface ExerciseTag {
  id: string;
  name: string;
  color: string;
  isMain?: boolean;
  categoryId?: string;
}

interface CreateExerciseWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  onSuccess?: (event: CreateExerciseWizardSuccessEvent) => void;
}

export interface CreateExerciseWizardSuccessEvent {
  action: 'created';
  exerciseId: string;
}

const DEFAULT_DATA: ExerciseData = {
  name: '',
  description: '',
  clinicalDescription: '',
  audioCue: '',
  exerciseSide: 'none',
  difficultyLevel: 'UNKNOWN',
  sets: 3,
  reps: 10,
  duration: null,
  restSets: 60,
  restReps: 0,
  preparationTime: 5,
  executionTime: null,
  videoUrl: '',
  notes: '',
  mainTags: [],
  additionalTags: [],
  tempo: '',
  loadKg: null,
  rangeOfMotion: '',
};

// ============================================================
// NORMALIZE TEXT - for fuzzy matching
// ============================================================
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/ł/g, 'l')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

// ============================================================
// SIMILAR EXERCISES ALERT COMPONENT
// ============================================================
interface SimilarExercisesAlertProps {
  exercises: ExistingExercise[];
  onUseExisting: (exercise: ExistingExercise) => void;
}

function SimilarExercisesAlert({ exercises, onUseExisting }: SimilarExercisesAlertProps) {
  if (exercises.length === 0) return null;

  return (
    <div
      className="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 animate-in fade-in slide-in-from-top-2 duration-200"
      data-testid="exercise-similar-alert"
    >
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
        <p className="text-xs font-medium text-amber-400">Podobne w Twojej bazie:</p>
      </div>
      <div className="space-y-1.5">
        {exercises.map((ex) => (
          <div
            key={ex.id}
            className="flex items-center justify-between gap-2 p-2 rounded-md bg-surface/50 hover:bg-surface transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0">
              {ex.imageUrl ? (
                <span className="relative w-8 h-8 rounded overflow-hidden shrink-0 block">
                  <Image src={ex.imageUrl} alt={ex.name} fill className="object-cover" sizes="32px" />
                </span>
              ) : (
                <div className="w-8 h-8 rounded bg-surface-light flex items-center justify-center shrink-0">
                  <Dumbbell className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              <span className="text-sm text-foreground truncate">{ex.name}</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onUseExisting(ex)}
              className="shrink-0 h-7 px-2 text-xs text-primary hover:text-primary hover:bg-primary/10"
              data-testid={`exercise-similar-use-${ex.id}`}
            >
              Użyj tego
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// NAME SUGGESTION HERO COMPONENT
// ============================================================
interface NameSuggestionHeroProps {
  currentName: string;
  suggestedName: string;
  reason?: string;
  similarInDatabase?: {
    exactMatch: string | null;
    similar: string[];
  } | null;
  onAccept: () => void;
}

function NameSuggestionHero({
  currentName,
  suggestedName,
  reason,
  similarInDatabase,
  onAccept,
}: NameSuggestionHeroProps) {
  const hasExactMatch = similarInDatabase?.exactMatch;
  const hasSimilar = similarInDatabase?.similar && similarInDatabase.similar.length > 0;

  return (
    <div className="border-b border-border" data-testid="ai-name-suggestion-hero">
      {/* Hero section - prominent name suggestion */}
      <div className="px-5 py-5 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
        <p className="text-[10px] font-semibold text-primary/70 uppercase tracking-widest mb-2">
          Proponowana nazwa ćwiczenia to:
        </p>

        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Current name (strikethrough) */}
            {currentName !== suggestedName && (
              <p className="text-sm text-muted-foreground line-through mb-1 truncate">{currentName}</p>
            )}
            {/* Suggested name - large and prominent */}
            <p className="text-xl font-bold text-foreground leading-tight">{suggestedName}</p>
            {/* Reason */}
            {reason && (
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-primary" />
                {reason}
              </p>
            )}
          </div>

          {/* Accept button */}
          <Button
            type="button"
            size="sm"
            onClick={onAccept}
            className="shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
            data-testid="ai-name-suggestion-accept-btn"
          >
            <Check className="h-3.5 w-3.5 mr-1.5" />
            Użyj
          </Button>
        </div>
      </div>

      {/* Alert: Exact match found in database */}
      {hasExactMatch && (
        <div className="px-5 py-3 bg-destructive/10 border-t border-destructive/20">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-destructive">Ćwiczenie o tej nazwie już istnieje!</p>
              <p className="text-xs text-destructive/80 mt-0.5">
                &quot;{similarInDatabase.exactMatch}&quot; - rozważ użycie istniejącego ćwiczenia.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Alert: Similar exercises in database */}
      {!hasExactMatch && hasSimilar && (
        <div className="px-5 py-3 bg-amber-500/10 border-t border-amber-500/20">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-400">Podobne ćwiczenia w Twojej bazie:</p>
              <ul className="mt-1 space-y-0.5">
                {similarInDatabase!.similar.slice(0, 3).map((name, idx) => (
                  <li key={idx} className="text-xs text-amber-400/80">
                    &bull; {name}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// AI DIFF DRAWER COMPONENT
// ============================================================
interface AIDiffDrawerProps {
  currentData: ExerciseData;
  suggestion: ExerciseSuggestionResponse | null;
  isLoading: boolean;
  onAcceptField: (field: keyof ExerciseData, value: unknown) => void;
  onAcceptAll: () => void;
  onClose: () => void;
  availableTags: ExerciseTag[];
}

function AIDiffDrawer({
  currentData,
  suggestion,
  isLoading,
  onAcceptField,
  onAcceptAll,
  onClose,
  availableTags,
}: AIDiffDrawerProps) {
  if (isLoading) {
    return (
      <div className="w-[420px] border-l border-border bg-dark p-6 flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <Loader2 className="h-10 w-10 animate-spin text-secondary" />
          <Sparkles className="h-4 w-4 text-secondary absolute -top-1 -right-1 animate-pulse" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground mb-1">Asystent Redakcyjny</p>
          <p className="text-xs text-muted-foreground">Analizuję dane ćwiczenia...</p>
        </div>
      </div>
    );
  }

  if (!suggestion) {
    return (
      <div className="w-[420px] border-l border-border bg-dark p-6 flex flex-col items-center justify-center gap-4">
        <AlertTriangle className="h-8 w-8 text-warning" />
        <p className="text-sm text-muted-foreground text-center">
          Nie udało się wygenerować sugestii.
          <br />
          Spróbuj ponownie.
        </p>
        <Button variant="outline" size="sm" onClick={onClose}>
          Zamknij
        </Button>
      </div>
    );
  }

  // === Analiza danych ===
  const hasNameCorrection = suggestion.correctedName && suggestion.correctedName !== currentData.name;
  const hasDescription = suggestion.description && suggestion.description !== currentData.description;
  const hasHints = suggestion.warnings && suggestion.warnings.length > 0;
  const hasAdvancedParams =
    suggestion.advancedParams &&
    (suggestion.advancedParams.tempo ||
      suggestion.advancedParams.weight ||
      suggestion.advancedParams.rangeOfMotion ||
      suggestion.advancedParams.executionTime ||
      suggestion.advancedParams.preparationTime);

  // Standard diff checks
  const hasDifferentSets = suggestion.sets !== currentData.sets;
  const hasDifferentReps = suggestion.reps !== currentData.reps;
  const hasDifferentDuration = suggestion.duration !== currentData.duration;
  const hasDifferentExecutionTime =
    (suggestion.advancedParams?.executionTime ?? null) !== (currentData.executionTime ?? null);
  const hasDifferentPreparationTime =
    (suggestion.advancedParams?.preparationTime ?? null) !== (currentData.preparationTime ?? null);
  const hasDifferentRest = suggestion.restSets !== currentData.restSets;
  const hasDifferentSide = suggestion.exerciseSide !== currentData.exerciseSide;
  const hasSuggestedTags = suggestion.suggestedTags && suggestion.suggestedTags.length > 0;

  // Find matching tags from available tags
  const matchedTags = availableTags.filter((tag) =>
    suggestion.suggestedTags?.some(
      (st) => normalizeText(st).includes(normalizeText(tag.name)) || normalizeText(tag.name).includes(normalizeText(st))
    )
  );

  // Count total suggestions
  const totalSuggestions = [
    hasNameCorrection,
    hasDescription,
    hasDifferentSets,
    hasDifferentReps,
    hasDifferentDuration,
    hasDifferentExecutionTime,
    hasDifferentPreparationTime,
    hasDifferentRest,
    hasDifferentSide,
    hasSuggestedTags, // Liczymy tagi nawet bez dopasowań w bazie
  ].filter(Boolean).length;

  return (
    <div className="w-[420px] border-l border-border bg-dark flex flex-col" data-testid="ai-diff-drawer">
      {/* Header - Asystent Redakcyjny */}
      <div className="px-5 py-4 border-b border-border bg-gradient-to-r from-secondary/5 to-transparent">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-secondary/20 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-secondary" />
            </div>
            <div>
              <span className="text-sm font-bold text-foreground">Asystent Redakcyjny</span>
              <p className="text-[10px] text-muted-foreground">Autouzupełnianie i porządek</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-surface-hover" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-[10px] bg-secondary/20 text-secondary border-0">
            {Math.round(suggestion.confidence * 100)}% pewności
          </Badge>
          {totalSuggestions > 0 && (
            <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">
              {totalSuggestions} {totalSuggestions === 1 ? 'sugestia' : totalSuggestions < 5 ? 'sugestie' : 'sugestii'}
            </Badge>
          )}
        </div>
      </div>

      {/* Content - Categorized sections */}
      <div className="flex-1 overflow-y-auto">
        {/* === HERO SEKCJA: PROPONOWANA NAZWA ĆWICZENIA === */}
        {/* Pokazuj tylko gdy jest korekta nazwy do zaakceptowania - znika po kliknięciu "Użyj" */}
        {hasNameCorrection && (
          <NameSuggestionHero
            currentName={currentData.name}
            suggestedName={suggestion.correctedName!}
            reason={suggestion.nameCorrection?.reason || 'Poprawiona nazwa'}
            similarInDatabase={suggestion.similarInDatabase}
            onAccept={() => onAcceptField('name', suggestion.correctedName)}
          />
        )}

        {/* === SEKCJA 2: PODPOWIEDZI (💡 Typowe wartości) === */}
        {hasHints && (
          <AISection icon="💡" title="Podpowiedzi" priority="low" description="Typowe wartości z bazy danych">
            {suggestion.warnings!.map((hint, idx) => (
              <div
                key={idx}
                className={cn(
                  'p-3 rounded-lg border',
                  hint.severity === 'warning'
                    ? 'bg-secondary/5 border-secondary/20'
                    : 'bg-blue-500/5 border-blue-500/20'
                )}
              >
                <p
                  className={cn(
                    'text-xs font-medium mb-1',
                    hint.severity === 'warning' ? 'text-secondary' : 'text-blue-400'
                  )}
                >
                  {hint.message}
                </p>
                <p className="text-[11px] text-muted-foreground">💡 {hint.suggestion}</p>
              </div>
            ))}
          </AISection>
        )}

        {/* === SEKCJA 3: TREŚĆ (📝 Content) === */}
        {(hasDescription || hasSuggestedTags) && (
          <AISection icon="📝" title="Treść" priority="medium" description="Opis techniczny i kategoryzacja">
            {hasDescription && (
              <SuggestionCard
                label="Opis techniczny"
                currentValue={currentData.description || '(brak opisu)'}
                suggestedValue={suggestion.description}
                reason={currentData.description ? 'Ulepszony opis techniczny' : 'Wygenerowany opis profesjonalny'}
                onAccept={() => onAcceptField('description', suggestion.description)}
                isText
                priority="medium"
              />
            )}

            {hasSuggestedTags && suggestion.suggestedTags && suggestion.suggestedTags.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Tag className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[10px] font-medium text-muted-foreground uppercase">Sugerowane tagi</span>
                </div>

                <p className="text-[10px] text-muted-foreground">Kliknij tag aby dodać (jeśli istnieje w bazie):</p>

                <div className="flex flex-wrap gap-1.5">
                  {suggestion.suggestedTags.map((tagName, idx) => {
                    // Znajdź pasujący tag w bazie
                    const matchedTag = availableTags.find(
                      (t) =>
                        normalizeText(t.name).includes(normalizeText(tagName)) ||
                        normalizeText(tagName).includes(normalizeText(t.name))
                    );
                    const isAlreadyAdded = matchedTag && currentData.mainTags.includes(matchedTag.id);

                    return (
                      <Badge
                        key={idx}
                        variant={matchedTag ? 'secondary' : 'outline'}
                        className={cn(
                          'text-xs transition-colors',
                          matchedTag && !isAlreadyAdded
                            ? 'bg-secondary/10 text-secondary border-0 cursor-pointer hover:bg-secondary/20'
                            : matchedTag && isAlreadyAdded
                              ? 'bg-secondary/30 text-secondary border-0 opacity-50 cursor-default'
                              : 'border-border text-muted-foreground cursor-not-allowed'
                        )}
                        style={matchedTag ? { borderLeftColor: matchedTag.color, borderLeftWidth: 2 } : undefined}
                        onClick={() => {
                          if (matchedTag && !isAlreadyAdded) {
                            const newTags = [...currentData.mainTags, matchedTag.id];
                            onAcceptField('mainTags', newTags);
                          }
                        }}
                        title={
                          matchedTag
                            ? isAlreadyAdded
                              ? 'Już dodany'
                              : `Kliknij aby dodać "${matchedTag.name}"`
                            : 'Nie znaleziono w bazie'
                        }
                      >
                        {matchedTag && !isAlreadyAdded && <ChevronLeft className="h-3 w-3 mr-0.5" />}
                        {isAlreadyAdded && <Check className="h-3 w-3 mr-0.5" />}
                        {tagName}
                        {matchedTag && matchedTag.name !== tagName && (
                          <span className="ml-1 text-[9px] opacity-60">→ {matchedTag.name}</span>
                        )}
                      </Badge>
                    );
                  })}
                </div>

                {/* Przycisk dodaj wszystkie pasujące */}
                {matchedTags.filter((t) => !currentData.mainTags.includes(t.id)).length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-secondary hover:text-secondary hover:bg-secondary/10"
                    onClick={() => {
                      const newTagIds = matchedTags
                        .filter((t) => !currentData.mainTags.includes(t.id))
                        .map((t) => t.id);
                      onAcceptField('mainTags', [...currentData.mainTags, ...newTagIds]);
                    }}
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Dodaj wszystkie pasujące ({matchedTags.filter((t) => !currentData.mainTags.includes(t.id)).length})
                  </Button>
                )}
              </div>
            )}
          </AISection>
        )}

        {/* === SEKCJA 4: PARAMETRY (⚡ Parameters - tylko jeśli różne) === */}
        {(hasDifferentSets ||
          hasDifferentReps ||
          hasDifferentDuration ||
          hasDifferentExecutionTime ||
          hasDifferentPreparationTime ||
          hasDifferentRest ||
          hasDifferentSide) && (
          <AISection icon="⚡" title="Parametry" priority="low" description="Optymalizacja pod cel treningowy">
            {hasDifferentSets && (
              <SuggestionCard
                label="Serie"
                currentValue={String(currentData.sets || 0)}
                suggestedValue={String(suggestion.sets)}
                reason="Optymalna liczba serii dla tego typu ćwiczenia"
                onAccept={() => onAcceptField('sets', suggestion.sets)}
                priority="low"
                inline
              />
            )}

            {hasDifferentReps && suggestion.reps && (
              <SuggestionCard
                label="Powtórzenia"
                currentValue={String(currentData.reps || 0)}
                suggestedValue={String(suggestion.reps)}
                reason={
                  suggestion.reps <= 8
                    ? 'Zakres siłowy (5-8 powt.)'
                    : suggestion.reps <= 12
                      ? 'Zakres hipertrofii (8-12 powt.)'
                      : 'Zakres wytrzymałościowy (12+ powt.)'
                }
                onAccept={() => onAcceptField('reps', suggestion.reps)}
                priority="low"
                inline
              />
            )}

            {hasDifferentDuration && suggestion.duration && (
              <SuggestionCard
                label="Czas serii"
                currentValue={currentData.duration ? formatDurationPolish(currentData.duration) : '—'}
                suggestedValue={formatDurationPolish(suggestion.duration)}
                reason="Sugerowany czas serii dla wariantu time-based"
                onAccept={() => onAcceptField('duration', suggestion.duration)}
                priority="low"
                inline
              />
            )}

            {hasDifferentExecutionTime && suggestion.advancedParams?.executionTime != null && (
              <SuggestionCard
                label="Czas powtórzenia"
                currentValue={`${currentData.executionTime || 0}s`}
                suggestedValue={`${suggestion.advancedParams.executionTime}s`}
                reason="Sugerowany timer dla pojedynczego powtórzenia"
                onAccept={() => onAcceptField('executionTime', suggestion.advancedParams?.executionTime)}
                priority="low"
                inline
              />
            )}

            {hasDifferentPreparationTime && suggestion.advancedParams?.preparationTime != null && (
              <SuggestionCard
                label="Czas przygotowania"
                currentValue={`${currentData.preparationTime || 0}s`}
                suggestedValue={`${suggestion.advancedParams.preparationTime}s`}
                reason="Sugerowany czas na przygotowanie pozycji"
                onAccept={() => onAcceptField('preparationTime', suggestion.advancedParams?.preparationTime)}
                priority="low"
                inline
              />
            )}

            {hasDifferentRest && (
              <SuggestionCard
                label="Przerwa"
                currentValue={`${currentData.restSets || 0}s`}
                suggestedValue={`${suggestion.restSets}s`}
                reason="Odpowiedni czas regeneracji między seriami"
                onAccept={() => onAcceptField('restSets', suggestion.restSets)}
                priority="low"
                inline
              />
            )}

            {hasDifferentSide && suggestion.exerciseSide !== 'none' && (
              <SuggestionCard
                label="Strona ciała"
                currentValue={EXERCISE_SIDES.find((s) => s.value === currentData.exerciseSide)?.label || 'Bez podziału'}
                suggestedValue={
                  EXERCISE_SIDES.find((s) => s.value === suggestion.exerciseSide)?.label || 'Bez podziału'
                }
                reason="Charakterystyka ćwiczenia jednostronnego"
                onAccept={() => onAcceptField('exerciseSide', suggestion.exerciseSide)}
                priority="low"
                inline
              />
            )}
          </AISection>
        )}

        {/* === SEKCJA 5: PRO TUNING (🎛️ Advanced) === */}
        {hasAdvancedParams && (
          <AISection icon="🎛️" title="Pro Tuning" priority="low" description="Dodatkowe pola do uzupełnienia">
            <div className="grid grid-cols-2 gap-2">
              {suggestion.advancedParams?.tempo && (
                <div className="p-2.5 rounded-lg bg-surface/50 border border-border">
                  <p className="text-[9px] text-muted-foreground uppercase mb-1">Tempo</p>
                  <p className="text-sm font-mono font-bold text-primary">{suggestion.advancedParams.tempo}</p>
                  <button
                    onClick={() => onAcceptField('tempo', suggestion.advancedParams?.tempo)}
                    className="text-[9px] text-secondary hover:text-secondary/80 mt-1"
                  >
                    ← Użyj
                  </button>
                </div>
              )}
              {suggestion.advancedParams?.weight && (
                <div className="p-2.5 rounded-lg bg-surface/50 border border-border">
                  <p className="text-[9px] text-muted-foreground uppercase mb-1">Obciążenie</p>
                  <p className="text-sm font-medium text-foreground">{suggestion.advancedParams.weight}</p>
                  <button
                    onClick={() =>
                      onAcceptField('loadKg', parseAiWeightToLoadKg(suggestion.advancedParams?.weight))
                    }
                    className="text-[9px] text-secondary hover:text-secondary/80 mt-1"
                  >
                    ← Użyj
                  </button>
                </div>
              )}
              {suggestion.advancedParams?.rangeOfMotion && (
                <div className="p-2.5 rounded-lg bg-surface/50 border border-border col-span-2">
                  <p className="text-[9px] text-muted-foreground uppercase mb-1">Zakres ruchu</p>
                  <p className="text-sm font-medium text-foreground">{suggestion.advancedParams.rangeOfMotion}</p>
                  <button
                    onClick={() => onAcceptField('rangeOfMotion', suggestion.advancedParams?.rangeOfMotion)}
                    className="text-[9px] text-secondary hover:text-secondary/80 mt-1"
                  >
                    ← Użyj
                  </button>
                </div>
              )}
              {suggestion.advancedParams?.executionTime != null && (
                <div className="p-2.5 rounded-lg bg-surface/50 border border-border">
                  <p className="text-[9px] text-muted-foreground uppercase mb-1">Czas powtórzenia</p>
                  <p className="text-sm font-medium text-foreground">{suggestion.advancedParams.executionTime}s</p>
                  <button
                    onClick={() => onAcceptField('executionTime', suggestion.advancedParams?.executionTime)}
                    className="text-[9px] text-secondary hover:text-secondary/80 mt-1"
                  >
                    ← Użyj
                  </button>
                </div>
              )}
              {suggestion.advancedParams?.preparationTime != null && (
                <div className="p-2.5 rounded-lg bg-surface/50 border border-border">
                  <p className="text-[9px] text-muted-foreground uppercase mb-1">Czas przygotowania</p>
                  <p className="text-sm font-medium text-foreground">{suggestion.advancedParams.preparationTime}s</p>
                  <button
                    onClick={() => onAcceptField('preparationTime', suggestion.advancedParams?.preparationTime)}
                    className="text-[9px] text-secondary hover:text-secondary/80 mt-1"
                  >
                    ← Użyj
                  </button>
                </div>
              )}
            </div>
          </AISection>
        )}

        {/* No suggestions - rozróżniamy "wysoka pewność = wszystko OK" vs "niska pewność = AI nie miało zastrzeżeń" */}
        {totalSuggestions === 0 && !hasHints && !hasAdvancedParams && (
          <div className="text-center py-12 px-6">
            {suggestion.confidence >= 0.7 ? (
              <>
                <div
                  className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4"
                  data-testid="ai-diff-no-suggestions-confident"
                >
                  <Check className="h-7 w-7 text-primary" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">Parametry optymalne</p>
                <p className="text-xs text-muted-foreground">
                  AI nie wykryło błędów ani obszarów do poprawy.
                  <br />
                  Twoje ćwiczenie jest gotowe.
                </p>
              </>
            ) : (
              <>
                <div
                  className="w-14 h-14 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-4"
                  data-testid="ai-diff-no-suggestions-low-confidence"
                >
                  <AlertTriangle className="h-7 w-7 text-warning" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">Brak sugestii AI</p>
                <p className="text-xs text-muted-foreground">
                  AI nie ma pewności co do tego ćwiczenia ({Math.round(suggestion.confidence * 100)}%).
                  <br />
                  Sprawdź nazwę i parametry ręcznie - możliwe że potrzebują uściślenia.
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-border bg-surface/30">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onClose} className="flex-1 border-border hover:bg-surface-hover">
            Zamknij
          </Button>
          {totalSuggestions > 0 && (
            <Button
              size="sm"
              onClick={onAcceptAll}
              className="flex-1 bg-secondary hover:bg-secondary/90"
              data-testid="ai-diff-accept-all-btn"
            >
              <Check className="h-3.5 w-3.5 mr-1.5" />
              Zastosuj wszystko
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// === AI Section Component ===
interface AISectionProps {
  icon: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low' | 'warning';
  children: React.ReactNode;
}

function AISection({ icon, title, description, priority, children }: AISectionProps) {
  const priorityColors = {
    high: 'border-l-destructive',
    medium: 'border-l-primary',
    low: 'border-l-border',
    warning: 'border-l-warning',
  };

  return (
    <div className={cn('border-b border-border border-l-2', priorityColors[priority])}>
      <div className="px-5 py-3 bg-surface/30">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm">{icon}</span>
          <span className="text-xs font-semibold text-foreground uppercase tracking-wide">{title}</span>
        </div>
        <p className="text-[10px] text-muted-foreground">{description}</p>
      </div>
      <div className="px-5 py-4 space-y-3">{children}</div>
    </div>
  );
}

// === Suggestion Card Component ===
interface SuggestionCardProps {
  label: string;
  currentValue: string;
  suggestedValue: string;
  reason: string;
  onAccept: () => void;
  isText?: boolean;
  inline?: boolean;
  priority: 'high' | 'medium' | 'low';
}

function SuggestionCard({
  label,
  currentValue,
  suggestedValue,
  reason,
  onAccept,
  isText,
  inline,
  priority,
}: SuggestionCardProps) {
  if (inline) {
    return (
      <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface/50 border border-border hover:border-border transition-colors">
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground min-w-[80px]">{label}</span>
          <span className="text-xs text-muted-foreground line-through">{currentValue}</span>
          <span className="text-xs text-primary font-medium">{suggestedValue}</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onAccept}
          className="h-6 px-2 text-[10px] text-secondary hover:text-secondary hover:bg-secondary/10"
        >
          <ChevronLeft className="h-3 w-3 mr-0.5" />
          Użyj
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-lg border overflow-hidden',
        priority === 'high' ? 'border-destructive/30 bg-destructive/5' : 'border-border bg-surface/30'
      )}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase">{label}</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onAccept}
          className="h-6 px-2 text-[10px] text-secondary hover:text-secondary hover:bg-secondary/10"
        >
          <ChevronLeft className="h-3 w-3 mr-0.5" />
          Użyj
        </Button>
      </div>
      <div className="p-3 space-y-2">
        {isText ? (
          <>
            <div className="p-2 rounded bg-surface-light/30">
              <p className="text-[9px] text-muted-foreground mb-1 uppercase">Teraz</p>
              <p className="text-xs text-muted-foreground line-clamp-2">{currentValue}</p>
            </div>
            <div className="p-2 rounded bg-secondary/5 border border-secondary/20">
              <p className="text-[9px] text-secondary mb-1 uppercase">Sugestia AI</p>
              <p className="text-xs text-foreground line-clamp-4">{suggestedValue}</p>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground line-through">{currentValue}</span>
            <span className="text-lg font-bold text-primary">{suggestedValue}</span>
          </div>
        )}
        {/* The "Why" - uzasadnienie */}
        <p className="text-[10px] text-muted-foreground italic flex items-start gap-1.5">
          <span className="text-secondary">💡</span>
          {reason}
        </p>
      </div>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export function CreateExerciseWizard({ open, onOpenChange, organizationId, onSuccess }: CreateExerciseWizardProps) {
  const router = useRouter();
  const [data, setData] = useState<ExerciseData>(DEFAULT_DATA);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [activeMediaPreviewIndex, setActiveMediaPreviewIndex] = useState(0);
  const [isMediaLightboxOpen, setIsMediaLightboxOpen] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const {
    generate: generateExerciseImage,
    isGenerating: isGeneratingImage,
    imageStyle,
    setImageStyle,
  } = useExerciseImageGeneration({ successMessage: 'Obraz wygenerowany' });
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // AI Enhancement states
  const [showAIDiff, setShowAIDiff] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<ExerciseSuggestionResponse | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);

  // Refs
  const nameInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get tags from organization
  const { data: tagsData } = useQuery(GET_EXERCISE_TAGS_BY_ORGANIZATION_QUERY, {
    variables: { organizationId },
    skip: !organizationId,
  });

  const { data: categoriesData } = useQuery(GET_TAG_CATEGORIES_BY_ORGANIZATION_QUERY, {
    variables: { organizationId },
    skip: !organizationId,
  });

  // Get existing exercises for duplicate detection
  const { data: exercisesData } = useQuery(GET_AVAILABLE_EXERCISES_QUERY, {
    variables: { organizationId },
    skip: !organizationId,
  });

  // Similar exercises detection (Inline Library Guard).
  // Łączy dwie strategie:
  //   1) substring match (np. "hip" → "Hip Thrust z hantlem")
  //   2) Levenshtein fuzzy match (np. "hip trust" → "Hip Thrust") - łapie literówki LOKALNIE,
  //      bez wywołania AI, więc działa zanim user kliknie "Ulepsz z AI" i nie zużywa kredytów.
  const similarExercises = useMemo((): ExistingExercise[] => {
    if (!data.name || data.name.length < 2) return [];

    const exercises = (exercisesData as { organizationExercises?: ExistingExercise[] })?.organizationExercises || [];
    const normalizedInput = normalizeText(data.name);

    const substringHits = exercises.filter((ex) => {
      const normalizedName = normalizeText(ex.name);
      return (
        (normalizedName.includes(normalizedInput) || normalizedInput.includes(normalizedName)) &&
        normalizedName !== normalizedInput
      );
    });

    const fuzzyHits = findSimilar(data.name, exercises, (ex) => ex.name, { limit: 5, threshold: 0.7 });

    // Deduplikacja po id, zachowując kolejność (substring najpierw - najpewniejsze sygnały)
    const seen = new Set<string>();
    const merged: ExistingExercise[] = [];
    for (const ex of [...substringHits, ...fuzzyHits]) {
      if (!seen.has(ex.id)) {
        seen.add(ex.id);
        merged.push(ex);
      }
    }
    return merged.slice(0, 5);
  }, [data.name, exercisesData]);

  const tags: ExerciseTag[] = useMemo(() => {
    const rawTags = (tagsData as ExerciseTagsResponse)?.exerciseTags || [];
    const categories = (categoriesData as TagCategoriesResponse)?.tagsByOrganizationId || [];

    return rawTags.map((tag) => {
      const category = categories.find((c) => c.id === tag.categoryId);
      return {
        id: tag.id,
        name: tag.name,
        color: category?.color || tag.color || '#6b7280',
        isMain: tag.isMain,
        categoryId: tag.categoryId,
      };
    });
  }, [tagsData, categoriesData]);

  const mediaPreviewUrls = useMemo(
    () => mediaFiles.map((file) => URL.createObjectURL(file)),
    [mediaFiles]
  );

  useEffect(() => {
    return () => {
      mediaPreviewUrls.forEach((previewUrl) => URL.revokeObjectURL(previewUrl));
    };
  }, [mediaPreviewUrls]);

  // Apollo client - potrzebny do final refetch listy cwiczen PO uploadzie obrazow.
  // `createExercise` ma wlasne `refetchQueries`, ale to startuje natychmiast po
  // utworzeniu rekordu - zanim petla `uploadImage` zdazy dorzucic zdjecia.
  // Bez final refetch karta na liscie pokazuje placeholder do czasu F5.
  const apolloClient = useApolloClient();

  // Mutations
  const [createExercise] = useMutation<CreateExerciseMutationResult, CreateExerciseVariables>(
    CREATE_EXERCISE_MUTATION,
    {
      refetchQueries: [{ query: GET_AVAILABLE_EXERCISES_QUERY, variables: { organizationId } }],
      awaitRefetchQueries: true,
    }
  );

  const [uploadImage] = useMutation(UPLOAD_EXERCISE_IMAGE_MUTATION);

  // Check if form has changes
  const hasChanges = useMemo(() => {
    return (
      data.name !== '' ||
      data.description !== '' ||
      mediaFiles.length > 0 ||
      data.mainTags.length > 0 ||
      data.additionalTags.length > 0
    );
  }, [data, mediaFiles]);

  const totalDuration = useMemo(
    () =>
      calculateExerciseTotalSeconds({
        sets: data.sets ?? 0,
        reps: data.reps ?? undefined,
        duration: data.duration ?? undefined,
        executionTime: data.executionTime ?? undefined,
        restSets: data.restSets ?? undefined,
        restReps: data.restReps ?? undefined,
        preparationTime: data.preparationTime ?? undefined,
        tempo: data.tempo || undefined,
        side: data.exerciseSide,
      }),
    [
      data.sets,
      data.reps,
      data.duration,
      data.executionTime,
      data.restSets,
      data.restReps,
      data.preparationTime,
      data.tempo,
      data.exerciseSide,
    ]
  );

  const exactDurationLabel = useMemo(() => {
    const normalizedSeconds = Math.max(0, Math.round(totalDuration.seconds));
    const minutes = Math.floor(normalizedSeconds / 60);
    const seconds = normalizedSeconds % 60;

    if (minutes <= 0) {
      return `${seconds} s`;
    }

    return `${minutes} min ${seconds} s`;
  }, [totalDuration.seconds]);

  const durationBadgeTooltip = useMemo(() => {
    const baseTooltip = `Laczny czas cwiczenia: ${exactDurationLabel} (serie + przerwy + przygotowanie).`;
    if (!totalDuration.isEstimate) {
      return baseTooltip;
    }

    return `${baseTooltip} Wyliczenie na podstawie aktualnych parametrow tempa/czasu.`;
  }, [exactDurationLabel, totalDuration.isEstimate]);

  // Reset form
  const resetForm = useCallback(() => {
    setData(DEFAULT_DATA);
    setMediaFiles([]);
    setActiveMediaPreviewIndex(0);
    setIsMediaLightboxOpen(false);
    setShowTagPicker(false);
    setShowAdvanced(false);
    setShowAIDiff(false);
    setAiSuggestion(null);
    setIsLoadingAI(false);
  }, []);

  // Handle close attempt
  const handleCloseAttempt = useCallback(() => {
    if (hasChanges) {
      setShowCloseConfirm(true);
    } else {
      onOpenChange(false);
    }
  }, [hasChanges, onOpenChange]);

  const handleConfirmClose = useCallback(() => {
    setShowCloseConfirm(false);
    resetForm();
    onOpenChange(false);
  }, [resetForm, onOpenChange]);

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open, resetForm]);

  // Focus name input when opened
  useEffect(() => {
    if (open && nameInputRef.current) {
      setTimeout(() => nameInputRef.current?.focus(), 100);
    }
  }, [open]);

  // Update data field
  const updateField = useCallback(<K extends keyof ExerciseData>(field: K, value: ExerciseData[K]) => {
    setData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const parametersCore = useMemo<ExerciseCoreDraft>(
    () => ({
      name: data.name,
      patientDescription: data.description,
      clinicalDescription: data.clinicalDescription,
      notes: data.notes,
      audioCue: data.audioCue,
      tempo: data.tempo,
      rangeOfMotion: data.rangeOfMotion,
      side: data.exerciseSide,
      difficultyLevel: data.difficultyLevel,
      videoUrl: data.videoUrl,
      sets: data.sets,
      reps: data.reps,
      executionTime: data.executionTime,
      restSets: data.restSets,
      restReps: data.restReps,
      preparationTime: data.preparationTime,
      duration: data.duration,
      loadKg: data.loadKg,
      mainTags: data.mainTags,
      additionalTags: data.additionalTags,
    }),
    [data]
  );

  // Apply preset (One-Tap Setup) - works with new unified presets
  const applyPreset = useCallback(
    (preset: {
      sets: number;
      reps: number | null;
      executionTime: number | null;
      duration: number | null;
      rest: number;
    }) => {
      setData((prev) => ({
        ...prev,
        sets: preset.sets,
        reps: preset.reps,
        executionTime: preset.executionTime,
        duration: preset.duration,
        restSets: preset.rest,
      }));
      toast.success('Preset zastosowany');
    },
    []
  );

  // Voice input hook
  const handleVoiceResult = useCallback(
    (text: string) => {
      updateField('name', text);
      toast.success('Nazwa rozpoznana');
    },
    [updateField]
  );

  const {
    state: voiceState,
    isSupported: voiceSupported,
    interimTranscript,
    toggleListening,
    error: voiceError,
  } = useVoiceInput({
    language: 'pl-PL',
    autoSend: true,
    onSend: handleVoiceResult,
    silenceTimeout: 2000,
  });

  // Handle file upload
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;

      const newFiles = Array.from(files).filter((file) => {
        if (!file.type.startsWith('image/')) {
          toast.error('Można dodawać tylko obrazy');
          return false;
        }
        if (file.size > 10 * 1024 * 1024) {
          toast.error('Plik jest za duży (max 10MB)');
          return false;
        }
        return true;
      });

      if (mediaFiles.length + newFiles.length > 5) {
        toast.error('Maksymalnie 5 zdjęć');
        return;
      }

      setMediaFiles((prev) => [...prev, ...newFiles]);
    },
    [mediaFiles.length]
  );

  // Handle AI image generation
  const handleGenerateImage = useCallback(async () => {
    if (!data.name.trim()) {
      toast.error('Wpisz nazwę ćwiczenia');
      return;
    }

    const inferredType = inferExerciseType(data.executionTime);
    const file = await generateExerciseImage({
      exerciseName: data.name,
      exerciseDescription: data.description,
      exerciseType: inferredType,
      style: imageStyle,
    });

    if (file) {
      setMediaFiles((prev) => [file, ...prev]);
    }
  }, [data.name, data.description, data.executionTime, generateExerciseImage, imageStyle]);

  // Remove image
  const handleRemoveImage = useCallback((index: number) => {
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleOpenMediaPreview = useCallback((index: number) => {
    setActiveMediaPreviewIndex(index);
    setIsMediaLightboxOpen(true);
  }, []);

  // Handle use existing exercise (from duplicate detection)
  const handleUseExisting = useCallback(
    (exercise: ExistingExercise) => {
      // Close modal and notify parent that user chose existing exercise
      toast.info(`Wybrano istniejące ćwiczenie: ${exercise.name}`);
      onOpenChange(false);
      // Note: Parent component should handle adding this exercise to the set
    },
    [onOpenChange]
  );

  // Handle AI Enhancement
  const handleEnhanceWithAI = useCallback(async () => {
    if (!data.name.trim() || data.name.length < 2) {
      toast.error('Wpisz nazwę ćwiczenia (min. 2 znaki)');
      return;
    }

    setIsLoadingAI(true);
    setShowAIDiff(true);

    try {
      const tagNames = tags.map((t) => t.name);
      // Pobierz nazwy istniejących ćwiczeń dla wykrywania duplikatów przez AI
      const existingNames = (
        (exercisesData as { organizationExercises?: ExistingExercise[] })?.organizationExercises || []
      ).map((e) => e.name);
      const suggestion = await aiService.getExerciseSuggestion(data.name, tagNames, existingNames);
      setAiSuggestion(suggestion);
    } catch (error) {
      console.error('AI enhancement error:', error);
      toast.error('Nie udało się uzyskać sugestii AI');
      setAiSuggestion(null);
    } finally {
      setIsLoadingAI(false);
    }
  }, [data.name, tags, exercisesData]);

  // Accept single AI field
  const handleAcceptAIField = useCallback(<K extends keyof ExerciseData>(field: K, value: unknown) => {
    setData((prev) => ({ ...prev, [field]: value as ExerciseData[K] }));
    toast.success('Zaakceptowano sugestię');
  }, []);

  // Accept all AI suggestions
  const handleAcceptAllAI = useCallback(() => {
    if (!aiSuggestion) return;

    setData((prev) => ({
      ...prev,
      // Korekta nazwy (jeśli jest)
      name: aiSuggestion.correctedName || prev.name,
      // Opis
      description: aiSuggestion.description || prev.description,
      // Parametry podstawowe
      sets: aiSuggestion.sets,
      reps: aiSuggestion.reps,
      duration: aiSuggestion.duration,
      restSets: aiSuggestion.restSets,
      exerciseSide: aiSuggestion.exerciseSide as ExerciseSide,
      // Pro Tuning fields
      preparationTime: aiSuggestion.advancedParams?.preparationTime ?? prev.preparationTime,
      executionTime: aiSuggestion.advancedParams?.executionTime ?? prev.executionTime,
      tempo: aiSuggestion.advancedParams?.tempo || prev.tempo,
      loadKg: parseAiWeightToLoadKg(aiSuggestion.advancedParams?.weight) ?? prev.loadKg,
      rangeOfMotion: aiSuggestion.advancedParams?.rangeOfMotion || prev.rangeOfMotion,
    }));

    // Add suggested tags if they match available tags
    const matchedTagIds = tags
      .filter((tag) =>
        aiSuggestion.suggestedTags?.some(
          (st) =>
            normalizeText(st).includes(normalizeText(tag.name)) || normalizeText(tag.name).includes(normalizeText(st))
        )
      )
      .map((t) => t.id);

    if (matchedTagIds.length > 0) {
      setData((prev) => ({
        ...prev,
        mainTags: [...new Set([...prev.mainTags, ...matchedTagIds])].slice(0, 3),
      }));
    }

    toast.success('Wszystkie sugestie zastosowane!');
    setShowAIDiff(false);
  }, [aiSuggestion, tags]);

  // Close AI Diff drawer - abortuje aktywny request, zwalnia kredyty po stronie backendu
  const handleCloseAIDiff = useCallback(() => {
    aiService.abortEndpoint('exercise-suggest');
    setShowAIDiff(false);
    setAiSuggestion(null);
    setIsLoadingAI(false);
  }, []);

  // Cleanup gdy modal się zamyka w trakcie ładowania AI
  useEffect(() => {
    if (!open && isLoadingAI) {
      aiService.abortEndpoint('exercise-suggest');
    }
  }, [open, isLoadingAI]);

  // Validation
  const isValid = data.name.trim().length >= 2;

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
    });
  };

  // Handle save
  const handleSave = async () => {
    if (!isValid) {
      toast.error('Podaj nazwę ćwiczenia (min. 2 znaki)');
      nameInputRef.current?.focus();
      return;
    }

    setIsSaving(true);

    try {
      const result = await createExercise({
        variables: buildCreateExerciseVariables({
          organizationId,
          draft: {
            name: data.name,
            patientDescription: data.description,
            clinicalDescription: data.clinicalDescription,
            audioCue: data.audioCue,
            notes: data.notes,
            side: data.exerciseSide,
            difficultyLevel: data.difficultyLevel,
            sets: data.sets,
            reps: data.reps,
            duration: data.duration,
            restSets: data.restSets,
            restReps: data.restReps,
            preparationTime: data.preparationTime,
            executionTime: data.executionTime,
            videoUrl: data.videoUrl,
            tempo: data.tempo,
            rangeOfMotion: data.rangeOfMotion,
            loadKg: data.loadKg,
            mainTags: data.mainTags,
            additionalTags: data.additionalTags,
            gifUrl: null,
          },
        }),
      });

      const exerciseId = result.data?.createExercise?.id;

      // Upload images if any
      if (exerciseId && mediaFiles.length > 0) {
        for (const file of mediaFiles) {
          try {
            const base64 = await fileToBase64(file);
            await uploadImage({
              variables: {
                exerciseId,
                base64Image: base64,
                contentType: file.type,
              },
            });
          } catch (err) {
            console.error('Error uploading image:', err);
          }
        }

        // Final refetch listy cwiczen - po uploadzie obrazow backend ma juz pelne
        // dane (thumbnailUrl/imageUrl/images). Bez tego refetchu kafelek na
        // /exercises pokazuje placeholder az do recznego odswiezenia strony.
        await apolloClient.refetchQueries({
          include: [GET_AVAILABLE_EXERCISES_QUERY],
        });
      }

      toast.success('Ćwiczenie utworzone!', {
        action: exerciseId
          ? {
              label: 'Dokończ opis',
              onClick: () => router.push(`/exercises/${exerciseId}`),
            }
          : undefined,
        duration: 8000,
      });
      onOpenChange(false);
      if (exerciseId) {
        onSuccess?.({ action: 'created', exerciseId });
      }
    } catch (error) {
      console.error('Error creating exercise:', error);
      toast.error('Nie udało się utworzyć ćwiczenia');
    } finally {
      setIsSaving(false);
    }
  };

  // Get selected tag names for display
  const selectedTags = useMemo(() => {
    return tags.filter((t) => data.mainTags.includes(t.id) || data.additionalTags.includes(t.id));
  }, [tags, data.mainTags, data.additionalTags]);

  return (
    <Dialog open={open} onOpenChange={() => handleCloseAttempt()}>
      <DialogContent
        className={cn(
          'max-h-[90vh] flex flex-col p-0 gap-0 bg-surface border-border transition-all duration-300',
          showAIDiff ? 'max-w-5xl w-[95vw]' : 'max-w-3xl w-[95vw]'
        )}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          handleCloseAttempt();
        }}
      >
        {/* ========== HEADER ========== */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border">
          <div className="flex items-center gap-3 pr-8">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/20">
              <Dumbbell className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle className="text-lg font-semibold text-foreground">Nowe ćwiczenie</DialogTitle>
            {totalDuration.seconds > 0 && (
              <div
                className="flex shrink-0 items-center gap-1.5 rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5"
                data-testid="exercise-create-duration-badge"
                title={durationBadgeTooltip}
                aria-label={durationBadgeTooltip}
              >
                <Clock className="h-3 w-3 text-primary" />
                <span className="text-xs font-semibold text-primary">
                  {exactDurationLabel}
                </span>
              </div>
            )}
          </div>
        </DialogHeader>

        {/* ========== MAIN CONTENT WRAPPER (with AI Drawer) ========== */}
        <div className="flex-1 flex overflow-hidden">
          {/* ========== CONTENT ========== */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {/* SEKCJA 1: NAZWA + AI ENHANCE */}
            <section className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                  Nazwa ćwiczenia
                </label>
                {/* AI Enhance Button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleEnhanceWithAI}
                  disabled={isLoadingAI || !data.name.trim() || data.name.length < 2}
                  className={cn(
                    'h-7 px-2.5 text-[10px] gap-1.5',
                    'text-secondary hover:text-secondary hover:bg-secondary/10',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                  data-testid="exercise-create-ai-enhance-btn"
                >
                  {isLoadingAI ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  Ulepsz z AI
                </Button>
              </div>
              <div className="relative">
                <Input
                  ref={nameInputRef}
                  value={voiceState === 'listening' ? interimTranscript || data.name : data.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="np. Przysiad ze sztangą"
                  className={cn(
                    'h-12 text-lg font-semibold bg-surface border-border text-foreground placeholder:text-muted-foreground/50',
                    'focus:border-primary/50 focus:ring-primary/20',
                    voiceState === 'listening' && 'ring-2 ring-primary animate-pulse'
                  )}
                  disabled={voiceState === 'listening'}
                  data-testid="exercise-create-name-input"
                />
                {voiceSupported && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={toggleListening}
                    className={cn(
                      'absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-md',
                      'hover:bg-surface-light',
                      voiceState === 'listening' && 'bg-destructive/20 text-destructive'
                    )}
                    data-testid="exercise-create-voice-btn"
                  >
                    <Mic
                      className={cn(
                        'h-4 w-4',
                        voiceState === 'listening' ? 'text-destructive' : 'text-muted-foreground'
                      )}
                    />
                  </Button>
                )}
              </div>
              {voiceError && <p className="text-sm text-destructive mt-1">{voiceError}</p>}
              {data.name.length > 0 && data.name.length < 2 && (
                <p className="text-sm text-warning mt-1">Min. 2 znaki</p>
              )}

              {/* INLINE LIBRARY GUARD - Similar Exercises Alert */}
              <SimilarExercisesAlert exercises={similarExercises} onUseExisting={handleUseExisting} />

              {/* Tagi */}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {selectedTags.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant="secondary"
                    className="bg-surface-light border-border text-muted-foreground hover:bg-surface-hover cursor-pointer"
                    style={{ borderLeftColor: tag.color, borderLeftWidth: 3 }}
                    onClick={() => setShowTagPicker(true)}
                  >
                    {tag.name}
                    <X
                      className="ml-1 h-3 w-3 hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateField(
                          'mainTags',
                          data.mainTags.filter((id) => id !== tag.id)
                        );
                        updateField(
                          'additionalTags',
                          data.additionalTags.filter((id) => id !== tag.id)
                        );
                      }}
                    />
                  </Badge>
                ))}
              </div>

              {showTagPicker && (
                <div className="rounded-lg border border-border bg-surface-light/50 p-3 mt-3 animate-in fade-in slide-in-from-top-2 duration-200">
                  <TagPicker
                    availableTags={tags}
                    selectedMainTags={data.mainTags}
                    selectedAdditionalTags={data.additionalTags}
                    onMainTagsChange={(tags) => updateField('mainTags', tags)}
                    onAdditionalTagsChange={(tags) => updateField('additionalTags', tags)}
                    maxMainTags={3}
                  />
                </div>
              )}
            </section>

            {/* SEKCJA 2: MEDIA */}
            <section className="mb-6" data-testid="exercise-create-media-gallery">
              <div className="mb-3 flex items-center justify-between gap-3">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                  Media
                </label>
                <span className="text-[10px] tabular-nums text-muted-foreground" data-testid="exercise-create-media-count">
                  {mediaFiles.length}/5
                </span>
              </div>

              {mediaFiles.length === 0 ? (
                isGeneratingImage ? (
                  <div
                    className="relative flex h-40 w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-xl border border-border bg-muted/30"
                    aria-busy
                    data-testid="exercise-create-ai-image-skeleton"
                  >
                    <div className="absolute inset-0 animate-pulse bg-muted/40" aria-hidden />
                    <Loader2 className="relative z-10 h-7 w-7 animate-spin text-secondary" />
                    <div className="relative z-10 text-center">
                      <p className="text-sm font-medium text-foreground">Generowanie obrazu AI…</p>
                      <p className="mt-1 text-xs text-muted-foreground">To potrwa kilka sekund</p>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const files = Array.from(e.dataTransfer.files).filter(
                        (f) => f.type.startsWith('image/') || f.type.startsWith('video/')
                      );
                      if (files.length > 0) {
                        handleFileSelect({ target: { files } } as unknown as React.ChangeEvent<HTMLInputElement>);
                      }
                    }}
                    className={cn(
                      'flex h-40 w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border',
                      'bg-surface/30 transition-colors duration-150 group',
                      'hover:border-primary/30 hover:bg-surface/50',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                    )}
                    tabIndex={2}
                    role="button"
                    data-testid="exercise-create-media-dropzone"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-light/50 transition-colors group-hover:bg-primary/10">
                        <Upload className="h-6 w-6 text-muted-foreground transition-colors group-hover:text-primary" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium text-muted-foreground transition-colors group-hover:text-foreground">
                          Przeciągnij zdjęcia lub wideo
                        </p>
                        <p className="text-xs text-muted-foreground/80">Start / Koniec ruchu • maks. 5 plików</p>
                      </div>
                    </div>
                  </div>
                )
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {mediaFiles.map((file, idx) => (
                    <div
                      key={`${file.name}-${file.lastModified}-${file.size}-${idx}`}
                      className={cn(
                        'group relative aspect-video overflow-hidden rounded-xl border border-border bg-surface',
                        'animate-in fade-in zoom-in-95 duration-200'
                      )}
                      style={{ animationDelay: `${idx * 40}ms` }}
                    >
                      <div
                        className="absolute inset-0 bg-cover bg-center opacity-30 blur-2xl scale-110"
                        style={{ backgroundImage: `url(${mediaPreviewUrls[idx]})` }}
                        aria-hidden
                      />
                      <Image
                        src={mediaPreviewUrls[idx]}
                        alt={`Media ${idx + 1}`}
                        fill
                        className="object-contain"
                        unoptimized
                      />

                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />

                      <span className="absolute bottom-2 left-2 z-10 rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-medium text-foreground dark:bg-black/50 dark:text-white">
                        {idx === 0 ? 'Start' : idx === 1 ? 'Koniec' : `#${idx + 1}`}
                      </span>

                      <div className="absolute right-2 top-2 z-20 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenMediaPreview(idx)}
                          className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-full',
                            'border border-border/60 bg-background/90 text-foreground shadow-sm',
                            'transition-colors duration-150 hover:bg-background',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            'dark:border-white/15 dark:bg-black/55 dark:text-white dark:hover:bg-black/75'
                          )}
                          aria-label={`Powiększ zdjęcie ${idx + 1}`}
                          data-testid={`exercise-create-media-preview-${idx}`}
                        >
                          <ZoomIn className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-full',
                            'border border-border/60 bg-background/90 text-foreground shadow-sm',
                            'transition-colors duration-150 hover:border-destructive/40 hover:bg-destructive hover:text-destructive-foreground',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            'dark:border-white/15 dark:bg-black/55 dark:text-white'
                          )}
                          aria-label={`Usuń zdjęcie ${idx + 1}`}
                          data-testid={`exercise-create-media-remove-${idx}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {isGeneratingImage && mediaFiles.length < 5 && (
                    <div
                      className="relative flex aspect-video flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border border-border bg-muted/30"
                      aria-busy
                      data-testid="exercise-create-ai-image-skeleton"
                    >
                      <div className="absolute inset-0 animate-pulse bg-muted/40" aria-hidden />
                      <Loader2 className="relative z-10 h-5 w-5 animate-spin text-secondary" />
                      <span className="relative z-10 text-xs text-muted-foreground">Generowanie…</span>
                    </div>
                  )}

                  {!isGeneratingImage && mediaFiles.length < 5 && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className={cn(
                        'flex aspect-video cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border',
                        'bg-surface/30 transition-colors duration-150 group',
                        'hover:border-primary/30 hover:bg-surface/50',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                      )}
                      tabIndex={2}
                      data-testid="exercise-create-media-add-btn"
                    >
                      <Plus className="h-6 w-6 text-muted-foreground transition-colors group-hover:text-primary" />
                      <span className="text-xs text-muted-foreground">Dodaj</span>
                    </button>
                  )}

                  {!isGeneratingImage && mediaFiles.length < 4 && (
                    <button
                      type="button"
                      onClick={handleGenerateImage}
                      disabled={!data.name.trim()}
                      className={cn(
                        'flex aspect-video cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border',
                        'bg-surface/20 transition-colors duration-150 group',
                        'hover:border-secondary/40 hover:bg-secondary/5',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        'disabled:cursor-not-allowed disabled:opacity-40'
                      )}
                      data-testid="exercise-create-ai-image-generate-btn"
                    >
                      <Wand2 className="h-6 w-6 text-muted-foreground transition-colors group-hover:text-secondary" />
                      <span className="text-xs text-muted-foreground transition-colors group-hover:text-secondary">
                        Generuj AI
                      </span>
                    </button>
                  )}
                </div>
              )}

              {/* Stabilny pasek AI — poza dropzone, bez layout shift */}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Styl AI
                  </span>
                  <ImageStylePicker
                    value={imageStyle}
                    onChange={setImageStyle}
                    disabled={isGeneratingImage}
                    testIdPrefix="exercise-create-ai-style"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateImage}
                  disabled={isGeneratingImage || !data.name.trim() || mediaFiles.length >= 5}
                  aria-busy={isGeneratingImage}
                  className="shrink-0 gap-1.5"
                  data-testid="exercise-create-ai-image-btn"
                >
                  {isGeneratingImage ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Wand2 className="h-3.5 w-3.5" />
                  )}
                  {isGeneratingImage ? 'Generowanie…' : 'Wygeneruj z AI'}
                </Button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
            </section>

            {/* SEKCJA 3: Parametry — shared ExerciseParametersEditor (fieldContract) */}
            <section className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                  Parametry
                </label>
                <div className="flex gap-1.5">
                  {QUICK_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className={cn(
                        'text-[10px] bg-surface/50 border border-border text-muted-foreground',
                        'hover:text-foreground hover:border-primary/50 px-2 py-1 rounded',
                        'transition-colors flex items-center gap-1'
                      )}
                      data-testid={`exercise-preset-${idx}`}
                    >
                      {idx === 0 && <Zap className="w-3 h-3 text-warning" />}
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <ExerciseParametersEditor
                variant="create"
                core={parametersCore}
                isDirtyField={() => false}
                onNumberChange={(field, value) => {
                  setData((previous) => ({ ...previous, [field]: value }));
                }}
                onTextChange={(field, value) => {
                  setData((previous) => ({ ...previous, [field]: value }));
                }}
                onSideChange={(value) => updateField('exerciseSide', value as ExerciseSide)}
                onDifficultyChange={(value) => updateField('difficultyLevel', value)}
              />
            </section>

            {/* SEKCJA 4: OPIS / INSTRUKCJA */}
            <section className="mb-6">
              <ExerciseFieldLabelWithTooltip
                label="Opis dla pacjenta"
                tooltip={EXERCISE_FIELD_TOOLTIPS.patientDescription}
                labelClassName="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest"
                className="mb-2"
                testId="exercise-create-description-info"
              />
              <Textarea
                value={data.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Opisz ćwiczenie prostym językiem dla pacjenta..."
                className="w-full h-20 bg-surface/50 border-border text-sm text-foreground rounded-xl resize-none placeholder:text-muted-foreground focus:border-primary/50"
                tabIndex={7}
                data-testid="exercise-create-description-input"
              />
            </section>

            {/* Treść zaawansowana (notatki, audio, clinical, video) — poza parametrami wykonania */}
            <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    'w-full flex items-center justify-between px-4 py-3 rounded-lg',
                    'border border-border bg-surface/50',
                    'text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-surface',
                    'transition-colors uppercase tracking-wider'
                  )}
                  data-testid="exercise-create-advanced-toggle"
                >
                  <div className="flex items-center gap-2">
                    <Settings2 className="h-3.5 w-3.5" />
                    <span>Treść dodatkowa</span>
                    {(data.audioCue || data.clinicalDescription || data.notes || data.videoUrl) && (
                      <span className="px-1.5 py-0.5 text-[9px] rounded bg-primary/20 text-primary normal-case">
                        Zmienione
                      </span>
                    )}
                  </div>
                  <ChevronDown
                    className={cn('h-4 w-4 transition-transform duration-200', showAdvanced && 'rotate-180')}
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <div className="rounded-lg border border-border bg-surface/50 p-4 space-y-4">
                  <div className="space-y-2">
                    <ExerciseFieldLabelWithTooltip
                      htmlFor="notes-input"
                      label="Notatki wewnętrzne"
                      tooltip={EXERCISE_FIELD_TOOLTIPS.notes}
                      labelClassName="text-[10px] font-semibold text-muted-foreground uppercase"
                      className="gap-2"
                      testId="exercise-create-notes-info"
                    />
                    <Textarea
                      id="notes-input"
                      value={data.notes}
                      onChange={(e) => updateField('notes', e.target.value)}
                      placeholder="Uwagi, modyfikacje, przeciwwskazania..."
                      className="min-h-[60px] resize-none bg-surface border-border text-foreground placeholder:text-muted-foreground/50 text-sm"
                      data-testid="exercise-create-notes-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <ExerciseFieldLabelWithTooltip
                      htmlFor="audio-cue-input"
                      label="Polecenia audio"
                      tooltip={EXERCISE_FIELD_TOOLTIPS.audioCue}
                      labelClassName="text-[10px] font-semibold text-muted-foreground uppercase"
                      className="gap-2"
                      testId="exercise-create-audio-cue-info"
                    />
                    <Input
                      id="audio-cue-input"
                      type="text"
                      value={data.audioCue}
                      onChange={(e) => updateField('audioCue', e.target.value)}
                      placeholder='np. "Proste plecy"'
                      maxLength={200}
                      className="bg-surface border-border text-foreground placeholder:text-muted-foreground/50 text-sm"
                      data-testid="exercise-create-audio-cue-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <ExerciseFieldLabelWithTooltip
                      htmlFor="clinical-description-input"
                      label="Opis dla fizjoterapeuty"
                      tooltip={EXERCISE_FIELD_TOOLTIPS.clinicalDescription}
                      labelClassName="text-[10px] font-semibold text-muted-foreground uppercase"
                      className="gap-2"
                      testId="exercise-create-clinical-description-info"
                    />
                    <Textarea
                      id="clinical-description-input"
                      value={data.clinicalDescription}
                      onChange={(e) => updateField('clinicalDescription', e.target.value)}
                      placeholder="Opis kliniczny dla fizjoterapeuty (język medyczny)..."
                      className="min-h-[80px] resize-none bg-surface border-border text-foreground placeholder:text-muted-foreground/50 text-sm"
                      data-testid="exercise-create-clinical-description-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <ExerciseFieldLabelWithTooltip
                      htmlFor="video-url-input"
                      label="URL filmu"
                      tooltip={EXERCISE_FIELD_TOOLTIPS.videoUrl}
                      labelClassName="text-[10px] font-semibold text-muted-foreground uppercase"
                      className="gap-2"
                      testId="exercise-create-video-url-info"
                    />
                    <Input
                      id="video-url-input"
                      type="url"
                      value={data.videoUrl}
                      onChange={(e) => updateField('videoUrl', e.target.value)}
                      placeholder="https://..."
                      className="bg-surface border-border text-foreground placeholder:text-muted-foreground/50 text-sm"
                      data-testid="exercise-create-video-url-input"
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
          {/* END OF CONTENT */}

          {/* ========== AI DIFF DRAWER ========== */}
          {showAIDiff && (
            <AIDiffDrawer
              currentData={data}
              suggestion={aiSuggestion}
              isLoading={isLoadingAI}
              onAcceptField={handleAcceptAIField}
              onAcceptAll={handleAcceptAllAI}
              onClose={handleCloseAIDiff}
              availableTags={tags}
            />
          )}
        </div>
        {/* END OF MAIN CONTENT WRAPPER */}

        <ImageLightbox
          src={mediaPreviewUrls[activeMediaPreviewIndex] ?? ''}
          alt={data.name || 'Podgląd zdjęcia ćwiczenia'}
          open={isMediaLightboxOpen}
          onOpenChange={setIsMediaLightboxOpen}
          images={mediaPreviewUrls.length > 0 ? mediaPreviewUrls : undefined}
          currentIndex={activeMediaPreviewIndex}
          onIndexChange={setActiveMediaPreviewIndex}
        />

        {/* ========== FOOTER ========== */}
        <div className="px-6 py-4 border-t border-border bg-surface flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={handleCloseAttempt}
            disabled={isSaving}
            className="text-muted-foreground hover:text-foreground"
            data-testid="exercise-create-cancel-btn"
          >
            Anuluj
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !isValid}
            className={cn(
              'px-8 bg-primary hover:bg-primary-dark text-primary-foreground font-semibold',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            data-testid="exercise-create-save-btn"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
            Zapisz
          </Button>
        </div>
      </DialogContent>

      <ConfirmDialog
        open={showCloseConfirm}
        onOpenChange={setShowCloseConfirm}
        title="Porzucić zmiany?"
        description="Masz niezapisane zmiany. Czy na pewno chcesz zamknąć?"
        confirmText="Tak, zamknij"
        cancelText="Kontynuuj"
        variant="destructive"
        onConfirm={handleConfirmClose}
      />
    </Dialog>
  );
}
