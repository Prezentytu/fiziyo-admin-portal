"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  FileText,
  Sparkles,
  Loader2,
  Pencil,
  Check,
  X,
  RotateCcw,
  Copy,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface InlineDescriptionProps {
  /** ID ćwiczenia (dla AI cache) */
  exerciseId: string;
  /** Nazwa ćwiczenia (dla kontekstu AI) */
  exerciseName: string;
  /** Aktualny opis */
  value: string;
  /** Callback przy zmianie opisu */
  onCommit: (value: string) => Promise<void>;
  /** Etykieta */
  label?: string;
  /** Placeholder */
  placeholder?: string;
  /** Minimalna liczba znaków */
  minLength?: number;
  /** Maksymalna liczba znaków */
  maxLength?: number;
  /** Liczba wierszy textarea */
  rows?: number;
  /** Czy wyłączony */
  disabled?: boolean;
  /** Dodatkowe klasy CSS */
  className?: string;
  /** data-testid */
  "data-testid"?: string;
}

type DescriptionStatus = "idle" | "hover" | "editing" | "saving" | "error" | "success";
type AIStatus = "idle" | "loading" | "loaded" | "error";

/**
 * InlineDescription - Opis z ON-DEMAND AI Rephrase
 *
 * Zasada: Koszt AI generowany TYLKO gdy użytkownik kliknie "Popraw styl (AI)"
 *
 * Flow:
 * 1. Użytkownik widzi opis jako tekst
 * 2. Kliknięcie = tryb edycji (textarea)
 * 3. Może kliknąć "Popraw styl (AI)" - wtedy dopiero generowany jest koszt
 * 4. AI sugestia wyświetlana obok/pod oryginalnym tekstem
 * 5. Użytkownik może zaakceptować lub odrzucić sugestię
 */
export function InlineDescription({
  exerciseId,
  exerciseName,
  value,
  onCommit,
  label = "Opis dla pacjenta",
  placeholder = "Wpisz opis ćwiczenia zrozumiały dla pacjenta...",
  minLength = 50,
  maxLength = 2000,
  rows = 4,
  disabled = false,
  className,
  "data-testid": testId,
}: InlineDescriptionProps) {
  const [status, setStatus] = useState<DescriptionStatus>("idle");
  const [editValue, setEditValue] = useState(value);
  const [originalValue, setOriginalValue] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // AI state
  const [aiStatus, setAiStatus] = useState<AIStatus>("idle");
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [aiChanges, setAiChanges] = useState<string[]>([]);

  // Sync with external value
  useEffect(() => {
    if (status === "idle") {
      setEditValue(value);
      setOriginalValue(value);
    }
  }, [value, status]);

  const handleStartEdit = useCallback(() => {
    if (disabled) return;
    setStatus("editing");
    setEditValue(value);
    setOriginalValue(value);
    setTimeout(() => textareaRef.current?.focus(), 0);
  }, [disabled, value]);

  const handleCommit = useCallback(async () => {
    if (editValue === originalValue) {
      setStatus("idle");
      return;
    }

    setStatus("saving");

    try {
      await onCommit(editValue);
      setStatus("success");
      setOriginalValue(editValue);
      setTimeout(() => setStatus("idle"), 500);
    } catch (error) {
      console.error("InlineDescription commit error:", error);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 2000);
    }
  }, [editValue, originalValue, onCommit]);

  const handleCancel = useCallback(() => {
    setEditValue(originalValue);
    setAiSuggestion(null);
    setAiChanges([]);
    setAiStatus("idle");
    setStatus("idle");
  }, [originalValue]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Ctrl+Enter = zapisz
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleCommit();
      }
      // Escape = anuluj
      if (e.key === "Escape") {
        e.preventDefault();
        handleCancel();
      }
    },
    [handleCommit, handleCancel]
  );

  // ON-DEMAND: Koszt generowany TYLKO gdy user kliknie przycisk
  const handleRequestAIRephrase = useCallback(async () => {
    if (!editValue.trim()) {
      toast.error("Wpisz opis przed użyciem AI");
      return;
    }

    setAiStatus("loading");

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/ai/verification/rephrase/${exerciseId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            exerciseName,
            currentDescription: editValue,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Nie udało się przepisać opisu");
      }

      const data = await response.json();
      setAiSuggestion(data.rewrittenDescription);
      setAiChanges(data.changes || []);
      setAiStatus("loaded");
    } catch (error) {
      console.error("AI rephrase error:", error);
      setAiStatus("error");
      toast.error("Nie udało się przepisać opisu przez AI");
      setTimeout(() => setAiStatus("idle"), 3000);
    }
  }, [exerciseId, exerciseName, editValue]);

  // Akceptuj sugestię AI
  const handleAcceptAISuggestion = useCallback(() => {
    if (aiSuggestion) {
      setEditValue(aiSuggestion);
      setAiSuggestion(null);
      setAiChanges([]);
      setAiStatus("idle");
      toast.success("Zaakceptowano sugestię AI");
    }
  }, [aiSuggestion]);

  // Odrzuć sugestię AI
  const handleRejectAISuggestion = useCallback(() => {
    setAiSuggestion(null);
    setAiChanges([]);
    setAiStatus("idle");
  }, []);

  // Kopiuj do schowka
  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Skopiowano do schowka");
    } catch {
      toast.error("Nie udało się skopiować");
    }
  }, []);

  // Walidacja długości
  const charCount = editValue.length;
  const isValid = charCount >= minLength && charCount <= maxLength;
  const isTooShort = charCount < minLength && charCount > 0;
  const isTooLong = charCount > maxLength;

  // Editing mode
  if (status === "editing" || status === "saving") {
    return (
      <Card className={cn("border-border/60", className)} data-testid={testId}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {label}
            </span>
            <div className="flex items-center gap-2">
              {/* Przycisk AI - KOSZT tylko gdy kliknięty */}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
                onClick={handleRequestAIRephrase}
                disabled={disabled || aiStatus === "loading" || !editValue.trim()}
                data-testid={`${testId}-ai-btn`}
              >
                {aiStatus === "loading" ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Przetwarzam...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-1" />
                    Popraw styl (AI)
                  </>
                )}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Textarea */}
          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              rows={rows}
              disabled={status === "saving"}
              className={cn(
                "resize-none transition-all",
                status === "saving" && "opacity-70",
                isTooShort && "border-amber-500/50",
                isTooLong && "border-destructive/50"
              )}
              data-testid={`${testId}-textarea`}
            />
            {status === "saving" && (
              <div className="absolute right-3 top-3">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              </div>
            )}
          </div>

          {/* Character count & validation */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              {isTooShort && (
                <span className="text-amber-600">
                  Min. {minLength} znaków (brakuje {minLength - charCount})
                </span>
              )}
              {isTooLong && (
                <span className="text-destructive">
                  Max. {maxLength} znaków (za dużo o {charCount - maxLength})
                </span>
              )}
              {isValid && charCount > 0 && (
                <span className="text-emerald-600 flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  Odpowiednia długość
                </span>
              )}
            </div>
            <span className={cn(
              "text-muted-foreground",
              isTooShort && "text-amber-600",
              isTooLong && "text-destructive"
            )}>
              {charCount}/{maxLength}
            </span>
          </div>

          {/* AI Suggestion panel */}
          {aiSuggestion && (
            <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-amber-600">
                  <Sparkles className="h-4 w-4" />
                  Sugestia AI
                </Label>
                <div className="flex gap-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleCopy(aiSuggestion)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Kopiuj</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>

              <p className="text-sm text-foreground whitespace-pre-wrap">
                {aiSuggestion}
              </p>

              {aiChanges.length > 0 && (
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Wprowadzone zmiany:</span>
                  <ul className="text-xs text-muted-foreground list-disc list-inside">
                    {aiChanges.map((change, idx) => (
                      <li key={idx}>{change}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  onClick={handleAcceptAISuggestion}
                  className="bg-amber-600 hover:bg-amber-700"
                  data-testid={`${testId}-ai-accept-btn`}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Użyj tej wersji
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRejectAISuggestion}
                  data-testid={`${testId}-ai-reject-btn`}
                >
                  <X className="h-4 w-4 mr-1" />
                  Zostaw oryginał
                </Button>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-border/40">
            <span className="text-xs text-muted-foreground">
              <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Ctrl</kbd>
              +
              <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Enter</kbd>
              {" "}aby zapisać,{" "}
              <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Esc</kbd>
              {" "}aby anulować
            </span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                disabled={status === "saving"}
              >
                Anuluj
              </Button>
              <Button
                size="sm"
                onClick={handleCommit}
                disabled={status === "saving" || !isValid}
                data-testid={`${testId}-save-btn`}
              >
                {status === "saving" ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-1" />
                )}
                Zapisz
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Read mode
  return (
    <Card
      className={cn(
        "border-border/60 cursor-pointer transition-all group",
        status === "hover" && "border-primary/40 shadow-md",
        status === "success" && "border-emerald-500/50",
        status === "error" && "border-destructive/50",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      onClick={handleStartEdit}
      onMouseEnter={() => !disabled && setStatus("hover")}
      onMouseLeave={() => status === "hover" && setStatus("idle")}
      data-testid={testId}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center justify-between">
          <span className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {label}
          </span>
          <Pencil
            className={cn(
              "h-4 w-4 text-muted-foreground transition-opacity",
              status === "hover" ? "opacity-100" : "opacity-0"
            )}
          />
        </CardTitle>
      </CardHeader>
      <CardContent>
        {value ? (
          <p className="text-sm text-foreground whitespace-pre-wrap line-clamp-6">
            {value}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            {placeholder}
          </p>
        )}

        {/* Validation badge */}
        {value && (
          <div className="mt-3 flex items-center gap-2">
            {value.length < minLength ? (
              <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-600">
                Zbyt krótki ({value.length}/{minLength} min)
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-600">
                <Check className="h-3 w-3 mr-1" />
                {value.length} znaków
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
