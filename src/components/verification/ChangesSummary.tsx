"use client";

import { useMemo } from "react";
import {
  History,
  User,
  Calendar,
  ArrowRight,
  Tag,
  FileText,
  Settings,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// Types
export interface FieldChange {
  /** Nazwa pola */
  field: string;
  /** Poprzednia wartość */
  oldValue: unknown;
  /** Nowa wartość */
  newValue: unknown;
  /** Czas zmiany */
  timestamp: Date;
  /** Kto zmienił (opcjonalnie) */
  changedBy?: string;
  /** Czy zmiana przez AI */
  isAIAssisted?: boolean;
}

interface ChangesSummaryProps {
  /** Lista zmian */
  changes: FieldChange[];
  /** Maksymalna liczba widocznych zmian */
  maxVisible?: number;
  /** Czy pokazywać szczegóły */
  showDetails?: boolean;
  /** Dodatkowe klasy CSS */
  className?: string;
  /** data-testid */
  "data-testid"?: string;
}

// Field name translations
const FIELD_LABELS: Record<string, string> = {
  name: "Nazwa",
  description: "Opis",
  type: "Typ",
  exerciseSide: "Strona",
  sets: "Serie",
  reps: "Powtórzenia",
  duration: "Czas",
  restBetweenSets: "Przerwa",
  tempo: "Tempo",
  audioCue: "Podpowiedź głosowa",
  mainTags: "Tagi główne",
  additionalTags: "Tagi dodatkowe",
  videoUrl: "URL wideo",
  gifUrl: "URL GIF",
  images: "Zdjęcia",
  notes: "Notatki",
};

// Field icons
const FIELD_ICONS: Record<string, React.ReactNode> = {
  name: <FileText className="h-3 w-3" />,
  description: <FileText className="h-3 w-3" />,
  type: <Settings className="h-3 w-3" />,
  exerciseSide: <Settings className="h-3 w-3" />,
  sets: <Settings className="h-3 w-3" />,
  reps: <Settings className="h-3 w-3" />,
  duration: <Settings className="h-3 w-3" />,
  mainTags: <Tag className="h-3 w-3" />,
  additionalTags: <Tag className="h-3 w-3" />,
};

/**
 * ChangesSummary - Audit trail zmian ćwiczenia
 *
 * Wyświetla historię zmian dokonanych podczas weryfikacji:
 * - Co zostało zmienione
 * - Z jakiej wartości na jaką
 * - Kiedy i przez kogo
 * - Czy z pomocą AI
 */
export function ChangesSummary({
  changes,
  maxVisible = 10,
  showDetails = true,
  className,
  "data-testid": testId,
}: ChangesSummaryProps) {
  // Sort changes by timestamp (newest first)
  const sortedChanges = useMemo(
    () => [...changes].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
    [changes]
  );

  const visibleChanges = sortedChanges.slice(0, maxVisible);
  const hiddenCount = Math.max(0, sortedChanges.length - maxVisible);

  // Group changes by field for summary
  const changesByField = useMemo(() => {
    const grouped: Record<string, FieldChange[]> = {};
    for (const change of changes) {
      if (!grouped[change.field]) {
        grouped[change.field] = [];
      }
      grouped[change.field].push(change);
    }
    return grouped;
  }, [changes]);

  const changedFieldsCount = Object.keys(changesByField).length;
  const aiAssistedCount = changes.filter((c) => c.isAIAssisted).length;

  if (changes.length === 0) {
    return (
      <Card className={cn("border-border/60", className)} data-testid={testId}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
            <History className="h-4 w-4" />
            Historia zmian
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground italic">
            Brak zmian. Dane oryginalne.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border-border/60", className)} data-testid={testId}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span className="flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            Historia zmian
          </span>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px]">
              {changes.length} {changes.length === 1 ? "zmiana" : "zmian"}
            </Badge>
            {aiAssistedCount > 0 && (
              <Badge
                variant="outline"
                className="text-[10px] border-amber-500/40 text-amber-600"
              >
                <Sparkles className="h-3 w-3 mr-1" />
                {aiAssistedCount} AI
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary badges */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {Object.entries(changesByField).map(([field, fieldChanges]) => (
            <TooltipProvider key={field}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] cursor-help",
                      fieldChanges.some((c) => c.isAIAssisted)
                        ? "border-amber-500/40 text-amber-600"
                        : "border-primary/40 text-primary"
                    )}
                  >
                    {FIELD_ICONS[field] || <Settings className="h-3 w-3" />}
                    <span className="ml-1">
                      {FIELD_LABELS[field] || field}
                    </span>
                    {fieldChanges.length > 1 && (
                      <span className="ml-1 opacity-60">×{fieldChanges.length}</span>
                    )}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">
                    {fieldChanges.length} {fieldChanges.length === 1 ? "zmiana" : "zmiany"} w polu "{FIELD_LABELS[field] || field}"
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>

        {/* Detailed changes list */}
        {showDetails && (
          <ScrollArea className="max-h-[200px]">
            <div className="space-y-2">
              {visibleChanges.map((change, idx) => (
                <ChangeItem key={`${change.field}-${idx}`} change={change} />
              ))}
              {hiddenCount > 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  +{hiddenCount} więcej zmian
                </p>
              )}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Single change item
 */
function ChangeItem({ change }: { change: FieldChange }) {
  const formattedTime = change.timestamp.toLocaleTimeString("pl-PL", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return "—";
    if (Array.isArray(value)) {
      if (value.length === 0) return "—";
      return value.join(", ");
    }
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  };

  const oldFormatted = formatValue(change.oldValue);
  const newFormatted = formatValue(change.newValue);

  // Truncate long values
  const truncate = (str: string, max: number = 30) =>
    str.length > max ? `${str.slice(0, max)}...` : str;

  return (
    <div className="flex items-start gap-2 text-xs p-2 rounded-md bg-muted/30">
      {/* Icon */}
      <div className="mt-0.5">
        {change.isAIAssisted ? (
          <Sparkles className="h-3 w-3 text-amber-500" />
        ) : (
          FIELD_ICONS[change.field] || <Settings className="h-3 w-3 text-muted-foreground" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="font-medium">
            {FIELD_LABELS[change.field] || change.field}
          </span>
          {change.isAIAssisted && (
            <Badge
              variant="outline"
              className="text-[8px] px-1 py-0 border-amber-500/40 text-amber-600"
            >
              AI
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <span className="truncate max-w-[100px]" title={oldFormatted}>
            {truncate(oldFormatted)}
          </span>
          <ArrowRight className="h-3 w-3 shrink-0" />
          <span className="truncate max-w-[100px] text-foreground" title={newFormatted}>
            {truncate(newFormatted)}
          </span>
        </div>
      </div>

      {/* Time */}
      <div className="text-[10px] text-muted-foreground shrink-0">
        {formattedTime}
      </div>
    </div>
  );
}

/**
 * Compact version for inline display
 */
interface ChangesSummaryCompactProps {
  changes: FieldChange[];
  className?: string;
}

export function ChangesSummaryCompact({
  changes,
  className,
}: ChangesSummaryCompactProps) {
  if (changes.length === 0) return null;

  const aiCount = changes.filter((c) => c.isAIAssisted).length;

  return (
    <div className={cn("flex items-center gap-2 text-xs", className)}>
      <Badge variant="secondary" className="text-[10px]">
        {changes.length} {changes.length === 1 ? "zmiana" : "zmian"}
      </Badge>
      {aiCount > 0 && (
        <Badge
          variant="outline"
          className="text-[10px] border-amber-500/40 text-amber-600"
        >
          <Sparkles className="h-3 w-3 mr-1" />
          {aiCount} AI
        </Badge>
      )}
    </div>
  );
}

/**
 * Hook do śledzenia zmian
 */
export function useChangeTracking(initialValues: Record<string, unknown>) {
  const changesRef = { current: [] as FieldChange[] };
  const initialRef = { current: initialValues };

  const trackChange = (
    field: string,
    newValue: unknown,
    isAIAssisted = false
  ) => {
    const oldValue = initialRef.current[field];

    // Don't track if value hasn't changed
    if (JSON.stringify(oldValue) === JSON.stringify(newValue)) return;

    changesRef.current.push({
      field,
      oldValue,
      newValue,
      timestamp: new Date(),
      isAIAssisted,
    });

    // Update initial ref for next comparison
    initialRef.current[field] = newValue;
  };

  const getChanges = () => changesRef.current;
  const clearChanges = () => {
    changesRef.current = [];
  };

  return {
    trackChange,
    getChanges,
    clearChanges,
    hasChanges: changesRef.current.length > 0,
  };
}
