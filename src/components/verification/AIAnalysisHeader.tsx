"use client";

import { useState, useCallback } from "react";
import {
  Sparkles,
  Loader2,
  X,
  Undo2,
  CheckCircle2,
  AlertCircle,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { aiService } from "@/services/aiService";
import type { AdminExercise } from "@/graphql/types/adminExercise.types";
import type { AIVideoAnalysisResponse } from "@/types/ai.types";

// ============================================
// TYPES
// ============================================

type AIAnalysisStatus = "idle" | "loading" | "complete" | "error";

interface AIAnalysisHeaderProps {
  /** Ćwiczenie do analizy */
  exercise: AdminExercise;
  /** Callback przy wypełnieniu pól przez AI */
  onAIAnalysisComplete: (result: AIVideoAnalysisResponse) => void;
  /** Callback przy cofnięciu zmian AI */
  onAIAnalysisUndo: () => void;
  /** Czy analiza może być wykonana (np. czy są dane do analizy) */
  canAnalyze?: boolean;
  /** Liczba pól wypełnionych przez AI */
  aiFieldsCount?: number;
  /** Czy wyłączony */
  disabled?: boolean;
  /** Czy ukryć header (po zamknięciu) */
  hidden?: boolean;
  /** Callback przy ukryciu */
  onHide?: () => void;
  /** Dodatkowe klasy CSS */
  className?: string;
  /** data-testid */
  "data-testid"?: string;
}

/**
 * Mockowa funkcja analizy AI - używa istniejącego getExerciseSuggestion
 * Docelowo będzie używać endpointu do analizy wideo
 */
async function mockAIVideoAnalysis(
  exercise: AdminExercise
): Promise<AIVideoAnalysisResponse> {
  // Użyj istniejącego serwisu AI jako fallback
  const suggestion = await aiService.getExerciseSuggestion(
    exercise.name,
    exercise.mainTags || []
  );

  if (!suggestion) {
    throw new Error("Nie udało się uzyskać sugestii AI");
  }

  // Mapuj odpowiedź na AIVideoAnalysisResponse
  const updatedFields: string[] = [];
  
  const response: AIVideoAnalysisResponse = {
    tempo: "2-0-2", // Domyślne tempo
    executionTime: suggestion.type === "time" ? 30 : 3,
    clinicalDescription: null, // Na razie brak - wymaga endpointu
    patientDescription: suggestion.description,
    audioCue: null,
    suggestedTags: suggestion.suggestedTags,
    difficultyLevel: "MEDIUM",
    restBetweenSets: suggestion.restSets || 60,
    restBetweenReps: 0,
    preparationTime: 5,
    sets: suggestion.sets,
    reps: suggestion.reps,
    duration: suggestion.duration,
    type: suggestion.type,
    side: suggestion.exerciseSide,
    confidence: suggestion.confidence,
    updatedFields: [],
  };

  // Określ które pola zostały wypełnione
  if (response.tempo && !exercise.tempo) updatedFields.push("tempo");
  if (response.patientDescription && !exercise.patientDescription) updatedFields.push("patientDescription");
  if (response.sets && !exercise.defaultSets) updatedFields.push("defaultSets");
  if (response.reps && !exercise.defaultReps) updatedFields.push("defaultReps");
  if (response.duration && !exercise.defaultDuration) updatedFields.push("defaultDuration");
  if (response.restBetweenSets && !exercise.defaultRestBetweenSets) updatedFields.push("defaultRestBetweenSets");
  if (response.preparationTime && !exercise.preparationTime) updatedFields.push("preparationTime");
  if (response.executionTime && !exercise.defaultExecutionTime) updatedFields.push("defaultExecutionTime");
  if (response.difficultyLevel && !exercise.difficultyLevel) updatedFields.push("difficultyLevel");

  response.updatedFields = updatedFields;

  return response;
}

/**
 * AIAnalysisHeader - Sticky header z przyciskiem AI Auto-Analysis
 *
 * Stany:
 * - idle: "Uruchom AI Auto-Analysis"
 * - loading: "Analizuję biomechanikę..." z animacją
 * - complete: "Zaktualizowano X pól" + przycisk "Cofnij"
 * - error: "Błąd analizy" z retry
 *
 * Filozofia "Gatekeeper Protocol":
 * - AI uruchamiane tylko na życzenie eksperta (oszczędność)
 * - Ekspert najpierw ocenia czy wideo jest warte analizy
 */
export function AIAnalysisHeader({
  exercise,
  onAIAnalysisComplete,
  onAIAnalysisUndo,
  canAnalyze = true,
  aiFieldsCount = 0,
  disabled = false,
  hidden = false,
  onHide,
  className,
  "data-testid": testId,
}: AIAnalysisHeaderProps) {
  const [status, setStatus] = useState<AIAnalysisStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<AIVideoAnalysisResponse | null>(null);

  const handleAnalyze = useCallback(async () => {
    if (disabled || !canAnalyze) return;

    setStatus("loading");
    setErrorMessage(null);

    try {
      // Symulacja opóźnienia dla lepszego UX
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const result = await mockAIVideoAnalysis(exercise);
      setLastResult(result);
      setStatus("complete");

      onAIAnalysisComplete(result);

      toast.success(`AI wypełniło ${result.updatedFields.length} pól`, {
        description: "Sprawdź fioletowe pola i zatwierdź lub edytuj",
      });

      // Auto-hide po 10 sekundach
      setTimeout(() => {
        if (status === "complete") {
          setStatus("idle");
        }
      }, 10000);
    } catch (error) {
      console.error("AI Analysis error:", error);
      setErrorMessage(error instanceof Error ? error.message : "Nieznany błąd");
      setStatus("error");

      toast.error("Błąd analizy AI", {
        description: "Spróbuj ponownie lub wypełnij pola ręcznie",
      });
    }
  }, [disabled, canAnalyze, exercise, onAIAnalysisComplete, status]);

  const handleUndo = useCallback(() => {
    onAIAnalysisUndo();
    setStatus("idle");
    setLastResult(null);
    toast.info("Cofnięto zmiany AI");
  }, [onAIAnalysisUndo]);

  const handleRetry = useCallback(() => {
    setStatus("idle");
    setErrorMessage(null);
    handleAnalyze();
  }, [handleAnalyze]);

  if (hidden) return null;

  return (
    <div
      className={cn(
        "flex items-center justify-between p-3 rounded-lg border transition-all",
        status === "idle" && "bg-purple-500/5 border-purple-500/20",
        status === "loading" && "bg-purple-500/10 border-purple-500/30 animate-pulse",
        status === "complete" && "bg-emerald-500/5 border-emerald-500/20",
        status === "error" && "bg-destructive/5 border-destructive/20",
        className
      )}
      data-testid={testId}
    >
      {/* Left side - Icon & Message */}
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex items-center justify-center w-8 h-8 rounded-lg",
            status === "idle" && "bg-purple-500/20",
            status === "loading" && "bg-purple-500/30",
            status === "complete" && "bg-emerald-500/20",
            status === "error" && "bg-destructive/20"
          )}
        >
          {status === "idle" && <Sparkles className="h-4 w-4 text-purple-400" />}
          {status === "loading" && <Loader2 className="h-4 w-4 text-purple-400 animate-spin" />}
          {status === "complete" && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
          {status === "error" && <AlertCircle className="h-4 w-4 text-destructive" />}
        </div>

        <div className="flex flex-col">
          {status === "idle" && (
            <>
              <span className="text-sm font-medium text-foreground">
                Brakujące dane?
              </span>
              <span className="text-xs text-muted-foreground">
                AI może wypełnić parametry na podstawie nazwy ćwiczenia
              </span>
            </>
          )}

          {status === "loading" && (
            <>
              <span className="text-sm font-medium text-purple-400">
                Analizuję biomechanikę...
              </span>
              <span className="text-xs text-muted-foreground">
                To może zająć kilka sekund
              </span>
            </>
          )}

          {status === "complete" && lastResult && (
            <>
              <span className="text-sm font-medium text-emerald-500">
                Zaktualizowano {lastResult.updatedFields.length} pól
              </span>
              <span className="text-xs text-muted-foreground">
                Fioletowe pola zostały wypełnione przez AI
              </span>
            </>
          )}

          {status === "error" && (
            <>
              <span className="text-sm font-medium text-destructive">
                Błąd analizy
              </span>
              <span className="text-xs text-muted-foreground">
                {errorMessage || "Spróbuj ponownie"}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Right side - Actions */}
      <div className="flex items-center gap-2">
        {/* AI Fields counter (when complete) */}
        {status === "complete" && aiFieldsCount > 0 && (
          <Badge
            variant="outline"
            className="text-[10px] bg-purple-500/10 text-purple-400 border-purple-500/30"
          >
            <Zap className="h-3 w-3 mr-1" />
            {aiFieldsCount} AI
          </Badge>
        )}

        {/* Main action button */}
        {status === "idle" && (
          <Button
            onClick={handleAnalyze}
            disabled={disabled || !canAnalyze}
            className="bg-purple-600 hover:bg-purple-500 text-white gap-2"
            size="sm"
            data-testid="ai-analysis-trigger-btn"
          >
            <Sparkles className="h-4 w-4" />
            Uruchom AI Auto-Analysis
          </Button>
        )}

        {status === "loading" && (
          <Button
            disabled
            variant="outline"
            size="sm"
            className="border-purple-500/30 text-purple-400"
          >
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Analizuję...
          </Button>
        )}

        {status === "complete" && (
          <Button
            onClick={handleUndo}
            variant="outline"
            size="sm"
            className="gap-2"
            data-testid="ai-analysis-undo-btn"
          >
            <Undo2 className="h-4 w-4" />
            Cofnij zmiany
          </Button>
        )}

        {status === "error" && (
          <Button
            onClick={handleRetry}
            variant="outline"
            size="sm"
            className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10"
            data-testid="ai-analysis-retry-btn"
          >
            <Sparkles className="h-4 w-4" />
            Spróbuj ponownie
          </Button>
        )}

        {/* Close button */}
        {(status === "idle" || status === "complete") && onHide && (
          <Button
            onClick={onHide}
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            data-testid="ai-analysis-hide-btn"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
