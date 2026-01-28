'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import {
  Loader2,
  Dumbbell,
  Check,
  Clock,
  Tag,
  FileText,
  Plus,
  Mic,
  Wand2,
  X,
  ChevronDown,
  ChevronLeft,
  Settings2,
  ArrowLeftRight,
  Timer,
  Pause,
  Zap,
  Sparkles,
  AlertTriangle,
  Scale,
  Activity,
  Target,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { TagPicker } from './TagPicker';
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

// ============================================================
// CLEAN NUMBER INPUT - Pure number, no steppers (Linear/Vercel style)
// ============================================================
interface CleanNumberInputProps {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  suffix?: string;
  placeholder?: string;
  dimmed?: boolean;
  tabIndex?: number;
  testId?: string;
}

function CleanNumberInput({
  label,
  value,
  onChange,
  suffix,
  placeholder = '0',
  dimmed = false,
  tabIndex,
  testId,
}: CleanNumberInputProps) {
  // Handle change with min=0 validation (no negative values)
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    if (rawValue === '') {
      onChange(null);
      return;
    }
    const numValue = Number(rawValue);
    // Prevent negative values
    onChange(numValue < 0 ? 0 : numValue);
  };

  return (
    <div className={cn(
      "flex flex-col gap-1.5 transition-opacity duration-200",
      dimmed && "opacity-40"
    )}>
      {/* Label */}
      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-center">
        {label}
      </span>
      
      {/* Clean Number Input */}
      <div className={cn(
        "relative h-14 rounded-xl transition-all duration-200",
        "bg-zinc-900/50 border border-zinc-800",
        "hover:border-zinc-700 focus-within:border-primary/50 focus-within:bg-zinc-900",
        dimmed && "hover:border-zinc-800"
      )}>
        <input 
          type="number"
          inputMode="numeric"
          min={0}
          value={value ?? ''}
          onChange={handleChange}
          placeholder={placeholder}
          tabIndex={tabIndex}
          className={cn(
            "w-full h-full bg-transparent text-xl font-bold text-center outline-none",
            "text-foreground placeholder:text-zinc-600",
            "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
            suffix ? "pr-6" : ""
          )}
          data-testid={testId}
        />
        {suffix && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================================
// QUICK PRESETS (Unified - shows all params)
// ============================================================
const QUICK_PRESETS = [
  { label: '3×10', sets: 3, reps: 10, duration: null, rest: 60 },
  { label: '3×15', sets: 3, reps: 15, duration: null, rest: 45 },
  { label: '4×8', sets: 4, reps: 8, duration: null, rest: 90 },
  { label: '30s×3', sets: 3, reps: null, duration: 30, rest: 30 },
  { label: '45s×3', sets: 3, reps: null, duration: 45, rest: 30 },
];

// ============================================================
// TYPES
// ============================================================
type ExerciseSide = 'none' | 'left' | 'right' | 'both' | 'alternating';

interface ExerciseData {
  name: string;
  description: string;
  exerciseSide: ExerciseSide;
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
  // Pro Tuning fields
  tempo: string;        // np. "3010" (4 cyfry)
  weight: string;       // np. "20kg" lub "RPE 7"
  rangeOfMotion: string; // np. "Pełny zakres" lub "Do kąta 90°"
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
  onSuccess?: () => void;
}

const DEFAULT_DATA: ExerciseData = {
  name: '',
  description: '',
  exerciseSide: 'none',
  sets: 3,
  reps: 10,        // Domyślnie 10 powtórzeń (najczęstszy przypadek)
  duration: null,  // null = ćwiczenie powtórzeniowe (nie czasowe)
  restSets: 60,
  restReps: null,
  preparationTime: 5,
  executionTime: null,
  videoUrl: '',
  notes: '',
  mainTags: [],
  additionalTags: [],
  // Pro Tuning defaults
  tempo: '',
  weight: '',
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
                <img 
                  src={ex.imageUrl} 
                  alt={ex.name}
                  className="w-8 h-8 rounded object-cover shrink-0"
                />
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
      <div className="w-[420px] border-l border-border bg-[#09090b] p-6 flex flex-col items-center justify-center gap-4">
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
      <div className="w-[420px] border-l border-border bg-[#09090b] p-6 flex flex-col items-center justify-center gap-4">
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
  const hasAdvancedParams = suggestion.advancedParams && (
    suggestion.advancedParams.tempo ||
    suggestion.advancedParams.weight ||
    suggestion.advancedParams.rangeOfMotion
  );
  
  // Standard diff checks
  const hasDifferentSets = suggestion.sets !== currentData.sets;
  const hasDifferentReps = suggestion.reps !== currentData.reps;
  const hasDifferentDuration = suggestion.duration !== currentData.duration;
  const hasDifferentRest = suggestion.restSets !== currentData.restSets;
  const hasDifferentSide = suggestion.exerciseSide !== currentData.exerciseSide;
  const hasSuggestedTags = suggestion.suggestedTags && suggestion.suggestedTags.length > 0;

  // Find matching tags from available tags
  const matchedTags = availableTags.filter(tag => 
    suggestion.suggestedTags?.some(
      st => normalizeText(st).includes(normalizeText(tag.name)) || 
            normalizeText(tag.name).includes(normalizeText(st))
    )
  );

  // Count total suggestions
  const totalSuggestions = [
    hasNameCorrection,
    hasDescription,
    hasDifferentSets,
    hasDifferentReps,
    hasDifferentDuration,
    hasDifferentRest,
    hasDifferentSide,
    matchedTags.length > 0,
  ].filter(Boolean).length;

  return (
    <div className="w-[420px] border-l border-zinc-800 bg-[#09090b] flex flex-col" data-testid="ai-diff-drawer">
      {/* Header - Asystent Redakcyjny */}
      <div className="px-5 py-4 border-b border-zinc-800 bg-gradient-to-r from-secondary/5 to-transparent">
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
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-zinc-800" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-[10px] bg-secondary/20 text-secondary border-0">
            {Math.round(suggestion.confidence * 100)}% pewności
          </Badge>
          {totalSuggestions > 0 && (
            <Badge variant="outline" className="text-[10px] border-zinc-700 text-zinc-400">
              {totalSuggestions} {totalSuggestions === 1 ? 'sugestia' : totalSuggestions < 5 ? 'sugestie' : 'sugestii'}
            </Badge>
          )}
        </div>
      </div>

      {/* Content - Categorized sections */}
      <div className="flex-1 overflow-y-auto">
        
        {/* === SEKCJA 1: NAZEWNICTWO (🔤 Physio-Grammarly) === */}
        {hasNameCorrection && (
          <AISection 
            icon="🔤" 
            title="Nazewnictwo" 
            priority="high"
            description="Poprawa literówek i formatowanie"
          >
            <SuggestionCard
              label="Nazwa ćwiczenia"
              currentValue={currentData.name}
              suggestedValue={suggestion.correctedName!}
              reason={suggestion.nameCorrection?.reason || 'Popularna nazwa w bazie'}
              onAccept={() => onAcceptField('name', suggestion.correctedName)}
              priority="high"
            />
          </AISection>
        )}

        {/* === SEKCJA 2: PODPOWIEDZI (💡 Typowe wartości) === */}
        {hasHints && (
          <AISection 
            icon="💡" 
            title="Podpowiedzi" 
            priority="low"
            description="Typowe wartości z bazy danych"
          >
            {suggestion.warnings!.map((hint, idx) => (
              <div 
                key={idx}
                className={cn(
                  "p-3 rounded-lg border",
                  hint.severity === 'warning' 
                    ? "bg-secondary/5 border-secondary/20" 
                    : "bg-blue-500/5 border-blue-500/20"
                )}
              >
                <p className={cn(
                  "text-xs font-medium mb-1",
                  hint.severity === 'warning' ? "text-secondary" : "text-blue-400"
                )}>
                  {hint.message}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  💡 {hint.suggestion}
                </p>
              </div>
            ))}
          </AISection>
        )}

        {/* === SEKCJA 3: TREŚĆ (📝 Content) === */}
        {(hasDescription || (hasSuggestedTags && matchedTags.length > 0)) && (
          <AISection 
            icon="📝" 
            title="Treść" 
            priority="medium"
            description="Opis techniczny i kategoryzacja"
          >
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
            
            {hasSuggestedTags && matchedTags.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Tag className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[10px] font-medium text-muted-foreground uppercase">Sugerowane tagi</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {matchedTags.map(tag => (
                    <Badge
                      key={tag.id}
                      variant="secondary"
                      className="text-xs bg-primary/10 text-primary border-0 cursor-pointer hover:bg-primary/20 transition-colors"
                      style={{ borderLeftColor: tag.color, borderLeftWidth: 2 }}
                      onClick={() => {
                        const newTags = [...currentData.mainTags];
                        if (!newTags.includes(tag.id)) {
                          newTags.push(tag.id);
                          onAcceptField('mainTags', newTags);
                        }
                      }}
                    >
                      + {tag.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </AISection>
        )}

        {/* === SEKCJA 4: PARAMETRY (⚡ Parameters - tylko jeśli różne) === */}
        {(hasDifferentSets || hasDifferentReps || hasDifferentDuration || hasDifferentRest || hasDifferentSide) && (
          <AISection 
            icon="⚡" 
            title="Parametry" 
            priority="low"
            description="Optymalizacja pod cel treningowy"
          >
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
                reason={suggestion.reps <= 8 ? "Zakres siłowy (5-8 powt.)" : suggestion.reps <= 12 ? "Zakres hipertrofii (8-12 powt.)" : "Zakres wytrzymałościowy (12+ powt.)"}
                onAccept={() => onAcceptField('reps', suggestion.reps)}
                priority="low"
                inline
              />
            )}

            {hasDifferentDuration && suggestion.duration && (
              <SuggestionCard
                label="Czas powtórzenia"
                currentValue={`${currentData.duration || 0}s`}
                suggestedValue={`${suggestion.duration}s`}
                reason="Optymalny czas dla ćwiczenia izometrycznego"
                onAccept={() => onAcceptField('duration', suggestion.duration)}
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
                currentValue={EXERCISE_SIDES.find(s => s.value === currentData.exerciseSide)?.label || 'Bez podziału'}
                suggestedValue={EXERCISE_SIDES.find(s => s.value === suggestion.exerciseSide)?.label || 'Bez podziału'}
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
          <AISection 
            icon="🎛️" 
            title="Pro Tuning" 
            priority="low"
            description="Dodatkowe pola do uzupełnienia"
          >
            <div className="grid grid-cols-2 gap-2">
              {suggestion.advancedParams?.tempo && (
                <div className="p-2.5 rounded-lg bg-zinc-900/50 border border-zinc-800">
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
                <div className="p-2.5 rounded-lg bg-zinc-900/50 border border-zinc-800">
                  <p className="text-[9px] text-muted-foreground uppercase mb-1">Obciążenie</p>
                  <p className="text-sm font-medium text-foreground">{suggestion.advancedParams.weight}</p>
                  <button 
                    onClick={() => onAcceptField('weight', suggestion.advancedParams?.weight)}
                    className="text-[9px] text-secondary hover:text-secondary/80 mt-1"
                  >
                    ← Użyj
                  </button>
                </div>
              )}
              {suggestion.advancedParams?.rangeOfMotion && (
                <div className="p-2.5 rounded-lg bg-zinc-900/50 border border-zinc-800 col-span-2">
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
            </div>
          </AISection>
        )}

        {/* No suggestions - everything is optimal */}
        {totalSuggestions === 0 && !hasHints && !hasAdvancedParams && (
          <div className="text-center py-12 px-6">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Check className="h-7 w-7 text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">
              Parametry optymalne
            </p>
            <p className="text-xs text-muted-foreground">
              AI nie wykryło błędów ani obszarów do poprawy.
              <br />
              Twoje ćwiczenie jest gotowe!
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-zinc-800 bg-zinc-900/30">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="flex-1 border-zinc-700 hover:bg-zinc-800"
          >
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
    low: 'border-l-zinc-600',
    warning: 'border-l-warning',
  };

  return (
    <div className={cn("border-b border-zinc-800 border-l-2", priorityColors[priority])}>
      <div className="px-5 py-3 bg-zinc-900/30">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm">{icon}</span>
          <span className="text-xs font-semibold text-foreground uppercase tracking-wide">{title}</span>
        </div>
        <p className="text-[10px] text-muted-foreground">{description}</p>
      </div>
      <div className="px-5 py-4 space-y-3">
        {children}
      </div>
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
  priority 
}: SuggestionCardProps) {
  if (inline) {
    return (
      <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-colors">
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground min-w-[80px]">{label}</span>
          <span className="text-xs text-zinc-500 line-through">{currentValue}</span>
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
    <div className={cn(
      "rounded-lg border overflow-hidden",
      priority === 'high' ? "border-destructive/30 bg-destructive/5" : "border-zinc-800 bg-zinc-900/30"
    )}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800/50">
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
            <div className="p-2 rounded bg-zinc-800/30">
              <p className="text-[9px] text-muted-foreground mb-1 uppercase">Teraz</p>
              <p className="text-xs text-zinc-500 line-clamp-2">{currentValue}</p>
            </div>
            <div className="p-2 rounded bg-secondary/5 border border-secondary/20">
              <p className="text-[9px] text-secondary mb-1 uppercase">Sugestia AI</p>
              <p className="text-xs text-foreground line-clamp-4">{suggestedValue}</p>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-500 line-through">{currentValue}</span>
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
export function CreateExerciseWizard({
  open,
  onOpenChange,
  organizationId,
  onSuccess,
}: CreateExerciseWizardProps) {
  const [data, setData] = useState<ExerciseData>(DEFAULT_DATA);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
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

  // Similar exercises detection (Inline Library Guard)
  const similarExercises = useMemo((): ExistingExercise[] => {
    if (!data.name || data.name.length < 2) return [];
    
    const exercises = (exercisesData as { organizationExercises?: ExistingExercise[] })?.organizationExercises || [];
    const normalizedInput = normalizeText(data.name);
    
    return exercises
      .filter((ex) => {
        const normalizedName = normalizeText(ex.name);
        // Check if similar but not exact match
        return (
          normalizedName.includes(normalizedInput) || 
          normalizedInput.includes(normalizedName)
        ) && normalizedName !== normalizedInput;
      })
      .slice(0, 5);
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

  // Mutations
  const [createExercise] = useMutation<CreateExerciseMutationResult, CreateExerciseVariables>(
    CREATE_EXERCISE_MUTATION,
    {
      refetchQueries: [
        { query: GET_AVAILABLE_EXERCISES_QUERY, variables: { organizationId } },
      ],
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

  // Reset form
  const resetForm = useCallback(() => {
    setData(DEFAULT_DATA);
    setMediaFiles([]);
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

  // Apply preset (One-Tap Setup) - works with new unified presets
  const applyPreset = useCallback((preset: { sets: number; reps: number | null; duration: number | null; rest: number }) => {
    setData(prev => ({
      ...prev,
      sets: preset.sets,
      reps: preset.reps,
      duration: preset.duration,
      restSets: preset.rest,
    }));
    toast.success('Preset zastosowany');
  }, []);

  // Voice input hook
  const handleVoiceResult = useCallback((text: string) => {
    updateField('name', text);
    toast.success('Nazwa rozpoznana');
  }, [updateField]);

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
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles = Array.from(files).filter(file => {
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

    setMediaFiles(prev => [...prev, ...newFiles]);
  }, [mediaFiles.length]);

  // Handle AI image generation
  const handleGenerateImage = useCallback(async () => {
    if (!data.name.trim()) {
      toast.error('Wpisz nazwę ćwiczenia');
      return;
    }

    setIsGeneratingImage(true);
    try {
      // Determine type from data: if duration is set, it's time-based
      const inferredType = data.duration ? 'time' : 'reps';
      const result = await aiService.generateExerciseImage(
        data.name,
        data.description,
        inferredType,
        'illustration'
      );

      if (result?.file) {
        setMediaFiles(prev => [result.file!, ...prev]);
        toast.success('Obraz wygenerowany');
      } else {
        toast.error('Nie udało się wygenerować obrazu');
      }
    } catch {
      toast.error('Błąd generowania obrazu');
    } finally {
      setIsGeneratingImage(false);
    }
  }, [data.name, data.description, data.duration]);

  // Remove image
  const handleRemoveImage = useCallback((index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Handle use existing exercise (from duplicate detection)
  const handleUseExisting = useCallback((exercise: ExistingExercise) => {
    // Close modal and notify parent that user chose existing exercise
    toast.info(`Wybrano istniejące ćwiczenie: ${exercise.name}`);
    onOpenChange(false);
    // Note: Parent component should handle adding this exercise to the set
  }, [onOpenChange]);

  // Handle AI Enhancement
  const handleEnhanceWithAI = useCallback(async () => {
    if (!data.name.trim() || data.name.length < 2) {
      toast.error('Wpisz nazwę ćwiczenia (min. 2 znaki)');
      return;
    }

    setIsLoadingAI(true);
    setShowAIDiff(true);
    
    try {
      const tagNames = tags.map(t => t.name);
      const suggestion = await aiService.getExerciseSuggestion(data.name, tagNames);
      setAiSuggestion(suggestion);
    } catch (error) {
      console.error('AI enhancement error:', error);
      toast.error('Nie udało się uzyskać sugestii AI');
      setAiSuggestion(null);
    } finally {
      setIsLoadingAI(false);
    }
  }, [data.name, tags]);

  // Accept single AI field
  const handleAcceptAIField = useCallback(<K extends keyof ExerciseData>(field: K, value: unknown) => {
    setData(prev => ({ ...prev, [field]: value as ExerciseData[K] }));
    toast.success('Zaakceptowano sugestię');
  }, []);

  // Accept all AI suggestions
  const handleAcceptAllAI = useCallback(() => {
    if (!aiSuggestion) return;

    setData(prev => ({
      ...prev,
      description: aiSuggestion.description || prev.description,
      sets: aiSuggestion.sets,
      reps: aiSuggestion.reps,
      duration: aiSuggestion.duration,
      restSets: aiSuggestion.restSets,
      exerciseSide: aiSuggestion.exerciseSide as ExerciseSide,
    }));

    // Add suggested tags if they match available tags
    const matchedTagIds = tags
      .filter(tag => 
        aiSuggestion.suggestedTags?.some(
          st => normalizeText(st).includes(normalizeText(tag.name)) || 
                normalizeText(tag.name).includes(normalizeText(st))
        )
      )
      .map(t => t.id);

    if (matchedTagIds.length > 0) {
      setData(prev => ({
        ...prev,
        mainTags: [...new Set([...prev.mainTags, ...matchedTagIds])].slice(0, 3),
      }));
    }

    toast.success('Wszystkie sugestie zastosowane!');
    setShowAIDiff(false);
  }, [aiSuggestion, tags]);

  // Close AI Diff drawer
  const handleCloseAIDiff = useCallback(() => {
    setShowAIDiff(false);
    setAiSuggestion(null);
  }, []);

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

    // Implicit type detection: if duration is filled, it's time-based; otherwise reps-based
    const inferredType = data.duration ? 'time' : 'reps';

    try {
      const result = await createExercise({
        variables: {
          organizationId,
          scope: 'ORGANIZATION',
          name: data.name.trim(),
          description: data.description.trim(),
          type: inferredType,
          sets: data.sets,
          reps: data.reps,
          duration: data.duration,
          restSets: data.restSets,
          restReps: data.restReps,
          preparationTime: data.preparationTime,
          executionTime: data.executionTime,
          videoUrl: data.videoUrl || null,
          gifUrl: null,
          notes: data.notes || null,
          exerciseSide: data.exerciseSide === 'none' ? null : data.exerciseSide,
          isActive: true,
          mainTags: data.mainTags.length > 0 ? data.mainTags : null,
          additionalTags: data.additionalTags.length > 0 ? data.additionalTags : null,
        },
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
      }

      toast.success('Ćwiczenie utworzone!');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error creating exercise:', error);
      toast.error('Nie udało się utworzyć ćwiczenia');
    } finally {
      setIsSaving(false);
    }
  };

  // Get selected tag names for display
  const selectedTags = useMemo(() => {
    return tags.filter(t => data.mainTags.includes(t.id) || data.additionalTags.includes(t.id));
  }, [tags, data.mainTags, data.additionalTags]);

  return (
    <Dialog open={open} onOpenChange={() => handleCloseAttempt()}>
      <DialogContent
        className={cn(
          "max-h-[90vh] flex flex-col p-0 gap-0 bg-surface border-border transition-all duration-300",
          showAIDiff ? "max-w-5xl w-[95vw]" : "max-w-3xl w-[95vw]"
        )}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          handleCloseAttempt();
        }}
      >
        {/* ========== HEADER ========== */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20">
                <Dumbbell className="h-5 w-5 text-primary" />
              </div>
              <DialogTitle className="text-lg font-semibold text-foreground">
                Nowe ćwiczenie
              </DialogTitle>
            </div>
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
                    "h-7 px-2.5 text-[10px] gap-1.5",
                    "text-secondary hover:text-secondary hover:bg-secondary/10",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
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
                    "h-12 text-lg font-semibold bg-surface border-border text-foreground placeholder:text-muted-foreground/50",
                    "focus:border-primary/50 focus:ring-primary/20",
                    voiceState === 'listening' && "ring-2 ring-primary animate-pulse"
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
                      "absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-md",
                      "hover:bg-surface-light",
                      voiceState === 'listening' && "bg-destructive/20 text-destructive"
                    )}
                    data-testid="exercise-create-voice-btn"
                  >
                    <Mic className={cn("h-4 w-4", voiceState === 'listening' ? "text-destructive" : "text-muted-foreground")} />
                  </Button>
                )}
              </div>
              {voiceError && <p className="text-sm text-destructive mt-1">{voiceError}</p>}
              {data.name.length > 0 && data.name.length < 2 && (
                <p className="text-sm text-warning mt-1">Min. 2 znaki</p>
              )}

              {/* INLINE LIBRARY GUARD - Similar Exercises Alert */}
              <SimilarExercisesAlert 
                exercises={similarExercises} 
                onUseExisting={handleUseExisting}
              />

            {/* Tagi */}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {selectedTags.map(tag => (
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
                      updateField('mainTags', data.mainTags.filter(id => id !== tag.id));
                      updateField('additionalTags', data.additionalTags.filter(id => id !== tag.id));
                    }}
                  />
                </Badge>
              ))}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowTagPicker(!showTagPicker)}
                className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground hover:bg-surface-light"
                data-testid="exercise-create-add-tag-btn"
              >
                <Tag className="h-3 w-3 mr-1" />
                {selectedTags.length === 0 ? 'Dodaj tagi' : '+'}
              </Button>
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

          {/* SEKCJA 2: MEDIA - Wide Hero Dropzone */}
          <section className="mb-6" data-testid="exercise-create-media-gallery">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2 block">
              Media
            </label>
            
            {mediaFiles.length === 0 ? (
              /* STAN PUSTY: Hero Dropzone Banner */
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));
                  if (files.length > 0) {
                    handleFileSelect({ target: { files } } as unknown as React.ChangeEvent<HTMLInputElement>);
                  }
                }}
                className={cn(
                  "w-full h-40 rounded-xl border-2 border-dashed border-zinc-700",
                  "flex flex-col items-center justify-center gap-3 cursor-pointer",
                  "bg-zinc-900/30 hover:bg-zinc-900/50 hover:border-zinc-600 hover:border-primary/30",
                  "transition-all duration-300 group"
                )}
                tabIndex={2}
                data-testid="exercise-create-media-dropzone"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-zinc-800/50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                    <Upload className="h-6 w-6 text-zinc-500 group-hover:text-primary transition-colors" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm text-zinc-400 group-hover:text-zinc-300 transition-colors font-medium">
                      Przeciągnij zdjęcia lub wideo
                    </p>
                    <p className="text-xs text-zinc-600 group-hover:text-zinc-500 transition-colors">
                      Start / Koniec ruchu • maks. 5 plików
                    </p>
                  </div>
                </div>
                
                {/* Inline AI Generate hint */}
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-[10px] text-zinc-600">lub</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleGenerateImage();
                    }}
                    disabled={isGeneratingImage || !data.name.trim()}
                    className={cn(
                      "flex items-center gap-1.5 text-xs text-secondary/70 hover:text-secondary",
                      "disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    )}
                    data-testid="exercise-create-ai-image-btn"
                  >
                    {isGeneratingImage ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Wand2 className="h-3.5 w-3.5" />
                    )}
                    Wygeneruj z AI
                  </button>
                </div>
              </div>
            ) : (
              /* STAN Z PLIKAMI: Grid panoramicznych kafelków */
              <div className="grid grid-cols-3 gap-3">
                {/* Media thumbnails - panoramiczne (16:9) */}
                {mediaFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "relative aspect-video rounded-xl overflow-hidden border border-zinc-800",
                      "group animate-in fade-in zoom-in-95 duration-300"
                    )}
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Media ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {/* Overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    {/* Index badge */}
                    <span className="absolute bottom-2 left-2 text-[10px] font-medium text-white/80 bg-black/40 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                      {idx === 0 ? 'Start' : idx === 1 ? 'Koniec' : `#${idx + 1}`}
                    </span>
                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className={cn(
                        "absolute top-2 right-2 w-7 h-7 rounded-full",
                        "bg-black/60 backdrop-blur-sm flex items-center justify-center",
                        "opacity-0 group-hover:opacity-100 transition-all",
                        "hover:bg-destructive hover:scale-110"
                      )}
                      data-testid={`exercise-create-media-remove-${idx}`}
                    >
                      <X className="h-4 w-4 text-white" />
                    </button>
                  </div>
                ))}
                
                {/* Przycisk "Dodaj kolejny" - pasuje do gridu */}
                {mediaFiles.length < 5 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "aspect-video rounded-xl border-2 border-dashed border-zinc-700",
                      "flex flex-col items-center justify-center gap-2 cursor-pointer",
                      "bg-zinc-900/30 hover:bg-zinc-900/50 hover:border-zinc-600 hover:border-primary/30",
                      "transition-all duration-200 group"
                    )}
                    tabIndex={2}
                    data-testid="exercise-create-media-add-btn"
                  >
                    <Plus className="h-6 w-6 text-zinc-500 group-hover:text-primary transition-colors" />
                    <span className="text-xs text-zinc-500 group-hover:text-zinc-400">Dodaj</span>
                  </button>
                )}
                
                {/* AI Generate jako ostatni kafelek jeśli jest miejsce */}
                {mediaFiles.length < 4 && (
                  <button
                    type="button"
                    onClick={handleGenerateImage}
                    disabled={isGeneratingImage || !data.name.trim()}
                    className={cn(
                      "aspect-video rounded-xl border border-dashed border-zinc-700",
                      "flex flex-col items-center justify-center gap-2 cursor-pointer",
                      "bg-zinc-900/20 hover:bg-secondary/5 hover:border-secondary/40",
                      "transition-all duration-200 group",
                      "disabled:opacity-40 disabled:cursor-not-allowed"
                    )}
                    data-testid="exercise-create-ai-image-generate-btn"
                  >
                    {isGeneratingImage ? (
                      <Loader2 className="h-6 w-6 text-secondary animate-spin" />
                    ) : (
                      <Wand2 className="h-6 w-6 text-zinc-500 group-hover:text-secondary transition-colors" />
                    )}
                    <span className="text-xs text-zinc-500 group-hover:text-secondary">AI</span>
                  </button>
                )}
              </div>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
          </section>

          {/* SEKCJA 3: THE MATRIX - Parametry (4 kolumny) */}
          <section className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                Parametry
              </label>
              
              {/* Quick Presets */}
              <div className="flex gap-1.5">
                {QUICK_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className={cn(
                      "text-[10px] bg-zinc-900/50 border border-zinc-800 text-zinc-400",
                      "hover:text-foreground hover:border-primary/50 px-2 py-1 rounded",
                      "transition-colors flex items-center gap-1"
                    )}
                    data-testid={`exercise-preset-${idx}`}
                  >
                    {idx === 0 && <Zap className="w-3 h-3 text-warning" />}
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* THE MATRIX: 4 kolumny - Serie | Powt | Czas | Przerwa */}
            <div className="grid grid-cols-4 gap-3">
              <CleanNumberInput
                label="SERIE"
                value={data.sets}
                onChange={(v) => updateField('sets', v)}
                placeholder="3"
                tabIndex={3}
                testId="exercise-sets"
              />
              
              <CleanNumberInput
                label="POWT."
                value={data.reps}
                onChange={(v) => updateField('reps', v)}
                placeholder="10"
                dimmed={!!data.duration && !data.reps}
                tabIndex={4}
                testId="exercise-reps"
              />
              
              <CleanNumberInput
                label="CZAS POWT."
                value={data.duration}
                onChange={(v) => updateField('duration', v)}
                placeholder="—"
                suffix="s"
                dimmed={!!data.reps && !data.duration}
                tabIndex={5}
                testId="exercise-duration"
              />
              
              <CleanNumberInput
                label="PRZERWA"
                value={data.restSets}
                onChange={(v) => updateField('restSets', v)}
                placeholder="60"
                suffix="s"
                tabIndex={6}
                testId="exercise-rest"
              />
            </div>

            {/* Hint - Implicit Type */}
            <p className="text-[9px] text-zinc-600 mt-2 text-center">
              CZAS POWT. = czas wykonania jednego powtórzenia (dla ćwiczeń izometrycznych/czasowych)
            </p>
          </section>

          {/* SEKCJA 4: OPIS / INSTRUKCJA */}
          <section className="mb-6">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2 block">
              Instrukcja <span className="text-zinc-600 font-normal">(opcjonalnie)</span>
            </label>
            <Textarea
              value={data.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Opisz technikę wykonania..."
              className="w-full h-20 bg-zinc-900/50 border-zinc-800 text-sm text-foreground rounded-xl resize-none placeholder:text-zinc-600 focus:border-primary/50"
              tabIndex={7}
              data-testid="exercise-create-description-input"
            />
          </section>

          {/* SEKCJA 3: ZAAWANSOWANE */}
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className={cn(
                  "w-full flex items-center justify-between px-4 py-3 rounded-lg",
                  "border border-border bg-surface/50",
                  "text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-surface",
                  "transition-colors uppercase tracking-wider"
                )}
                data-testid="exercise-create-advanced-toggle"
              >
                <div className="flex items-center gap-2">
                  <Settings2 className="h-3.5 w-3.5" />
                  <span>Zaawansowane</span>
                  {(data.exerciseSide !== 'none' || data.restReps || data.executionTime || 
                    data.tempo || data.weight || data.rangeOfMotion) && (
                    <span className="px-1.5 py-0.5 text-[9px] rounded bg-primary/20 text-primary normal-case">
                      Zmienione
                    </span>
                  )}
                </div>
                <ChevronDown className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  showAdvanced && "rotate-180"
                )} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="rounded-lg border border-border bg-surface/50 p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Strona ciała */}
                  <div className="space-y-2">
                    <label htmlFor="side-select" className="flex items-center gap-2 text-[10px] font-semibold text-muted-foreground uppercase">
                      <ArrowLeftRight className="h-3 w-3" />
                      Strona ciała
                    </label>
                    <Select
                      value={data.exerciseSide}
                      onValueChange={(v) => updateField('exerciseSide', v as ExerciseSide)}
                    >
                      <SelectTrigger
                        id="side-select"
                        className="bg-surface border-border text-foreground text-sm"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EXERCISE_SIDES.map((side) => (
                          <SelectItem key={side.value} value={side.value}>
                            {side.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Przerwa między powtórzeniami */}
                  <div className="space-y-2">
                    <label htmlFor="rest-reps-input" className="flex items-center gap-2 text-[10px] font-semibold text-muted-foreground uppercase">
                      <Pause className="h-3 w-3" />
                      Przerwa między powt. (s)
                    </label>
                    <Input
                      type="number"
                      id="rest-reps-input"
                      value={data.restReps || ''}
                      onChange={(e) => updateField('restReps', e.target.value ? Number(e.target.value) : null)}
                      placeholder="Brak"
                      className="bg-surface border-border text-foreground placeholder:text-muted-foreground/50 text-sm"
                      min={0}
                      max={60}
                      data-testid="exercise-create-rest-reps-input"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Czas przygotowania */}
                  <div className="space-y-2">
                    <label htmlFor="prep-time-input" className="flex items-center gap-2 text-[10px] font-semibold text-muted-foreground uppercase">
                      <Timer className="h-3 w-3" />
                      Czas przygotowania (s)
                    </label>
                    <Input
                      type="number"
                      id="prep-time-input"
                      value={data.preparationTime || ''}
                      onChange={(e) => updateField('preparationTime', e.target.value ? Number(e.target.value) : null)}
                      placeholder="5"
                      className="bg-surface border-border text-foreground placeholder:text-muted-foreground/50 text-sm"
                      min={0}
                      max={60}
                      data-testid="exercise-create-prep-time-input"
                    />
                  </div>

                  {/* Czas wykonania powtórzenia */}
                  <div className="space-y-2">
                    <label htmlFor="exec-time-input" className="flex items-center gap-2 text-[10px] font-semibold text-muted-foreground uppercase">
                      <Clock className="h-3 w-3" />
                      Czas na powtórzenie (s)
                    </label>
                    <Input
                      type="number"
                      id="exec-time-input"
                      value={data.executionTime || ''}
                      onChange={(e) => updateField('executionTime', e.target.value ? Number(e.target.value) : null)}
                      placeholder="Bez limitu"
                      className="bg-surface border-border text-foreground placeholder:text-muted-foreground/50 text-sm"
                      min={0}
                      max={600}
                      data-testid="exercise-create-exec-time-input"
                    />
                  </div>
                </div>

                {/* PRO TUNING: Tempo, Obciążenie, ROM */}
                <div className="pt-2 border-t border-border/50">
                  <p className="text-[9px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-3">
                    Pro Tuning
                  </p>
                  <div className="grid grid-cols-3 gap-4">
                    {/* Tempo */}
                    <div className="space-y-2">
                      <label htmlFor="tempo-input" className="flex items-center gap-2 text-[10px] font-semibold text-muted-foreground uppercase">
                        <Activity className="h-3 w-3" />
                        Tempo
                      </label>
                      <Input
                        type="text"
                        id="tempo-input"
                        value={data.tempo}
                        onChange={(e) => {
                          // Only allow digits, max 4 characters
                          const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                          updateField('tempo', value);
                        }}
                        placeholder="3010"
                        className="bg-surface border-border text-foreground placeholder:text-muted-foreground/50 text-sm font-mono tracking-wider"
                        maxLength={4}
                        data-testid="exercise-create-tempo-input"
                      />
                      <p className="text-[9px] text-muted-foreground/60">
                        Ekscentryczna-Pauza-Koncentryczna-Pauza
                      </p>
                    </div>

                    {/* Obciążenie / Intensywność */}
                    <div className="space-y-2">
                      <label htmlFor="weight-input" className="flex items-center gap-2 text-[10px] font-semibold text-muted-foreground uppercase">
                        <Scale className="h-3 w-3" />
                        Obciążenie
                      </label>
                      <Input
                        type="text"
                        id="weight-input"
                        value={data.weight}
                        onChange={(e) => updateField('weight', e.target.value)}
                        placeholder="np. 20kg, RPE 7"
                        className="bg-surface border-border text-foreground placeholder:text-muted-foreground/50 text-sm"
                        data-testid="exercise-create-weight-input"
                      />
                      <p className="text-[9px] text-muted-foreground/60">
                        kg, kolor gumy, RPE 1-10
                      </p>
                    </div>

                    {/* Zakres ruchu (ROM) */}
                    <div className="space-y-2">
                      <label htmlFor="rom-input" className="flex items-center gap-2 text-[10px] font-semibold text-muted-foreground uppercase">
                        <Target className="h-3 w-3" />
                        Zakres ruchu
                      </label>
                      <Input
                        type="text"
                        id="rom-input"
                        value={data.rangeOfMotion}
                        onChange={(e) => updateField('rangeOfMotion', e.target.value)}
                        placeholder="np. Pełny zakres"
                        className="bg-surface border-border text-foreground placeholder:text-muted-foreground/50 text-sm"
                        data-testid="exercise-create-rom-input"
                      />
                      <p className="text-[9px] text-muted-foreground/60">
                        ROM, ograniczenia
                      </p>
                    </div>
                  </div>
                </div>

                {/* Notatki */}
                <div className="space-y-2">
                  <label htmlFor="notes-input" className="flex items-center gap-2 text-[10px] font-semibold text-muted-foreground uppercase">
                    <FileText className="h-3 w-3" />
                    Notatki wewnętrzne
                    <span className="text-muted-foreground/50 font-normal normal-case">(nie widoczne dla pacjenta)</span>
                  </label>
                  <Textarea
                    id="notes-input"
                    value={data.notes}
                    onChange={(e) => updateField('notes', e.target.value)}
                    placeholder="Uwagi, modyfikacje, przeciwwskazania..."
                    className="min-h-[60px] resize-none bg-surface border-border text-foreground placeholder:text-muted-foreground/50 text-sm"
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
              "px-8 bg-primary hover:bg-primary-dark text-primary-foreground font-semibold",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
            data-testid="exercise-create-save-btn"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4 mr-2" />
            )}
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
