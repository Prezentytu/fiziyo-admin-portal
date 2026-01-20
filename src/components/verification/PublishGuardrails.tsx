"use client";

import { useMemo } from "react";
import {
  Shield,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  FileText,
  Tag,
  Image as ImageIcon,
  Video,
  Settings,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { AdminExercise } from "@/graphql/types/adminExercise.types";

// Validation rule types
export interface ValidationRule {
  id: string;
  label: string;
  description: string;
  severity: "error" | "warning" | "info";
  category: "content" | "media" | "tags" | "parameters";
  check: (exercise: AdminExercise) => boolean;
  autoDetect?: boolean;
}

// Validation result
export interface ValidationResult {
  rule: ValidationRule;
  passed: boolean;
}

interface PublishGuardrailsProps {
  /** Ćwiczenie do walidacji */
  exercise: AdminExercise;
  /** Aktualne wartości (mogą być zmodyfikowane) */
  currentValues?: {
    name?: string;
    description?: string;
    mainTags?: string[];
    additionalTags?: string[];
    sets?: number | null;
    reps?: number | null;
    duration?: number | null;
  };
  /** Callback gdy walidacja się zmieni */
  onValidationChange?: (isValid: boolean, results: ValidationResult[]) => void;
  /** Dodatkowe klasy CSS */
  className?: string;
  /** data-testid */
  "data-testid"?: string;
}

// Default validation rules
const DEFAULT_RULES: ValidationRule[] = [
  // Content rules
  {
    id: "name-required",
    label: "Nazwa ćwiczenia",
    description: "Ćwiczenie musi mieć nazwę",
    severity: "error",
    category: "content",
    check: (e) => !!(e.name && e.name.trim().length > 0),
    autoDetect: true,
  },
  {
    id: "patient-description-required",
    label: "Opis dla pacjenta",
    description: "Opis dla pacjenta musi mieć min. 50 znaków",
    severity: "error",
    category: "content",
    check: (e) => {
      const desc = e.patientDescription || e.description;
      return !!(desc && desc.length >= 50);
    },
    autoDetect: true,
  },
  {
    id: "description-quality",
    label: "Jakość opisu",
    description: "Opis powinien mieć min. 100 znaków dla lepszego zrozumienia",
    severity: "warning",
    category: "content",
    check: (e) => {
      const desc = e.patientDescription || e.description;
      return !!(desc && desc.length >= 100);
    },
    autoDetect: true,
  },
  {
    id: "clinical-description",
    label: "Opis kliniczny",
    description: "Zalecany opis kliniczny dla profesjonalistów (min. 20 znaków)",
    severity: "info",
    category: "content",
    check: (e) => !!(e.clinicalDescription && e.clinicalDescription.length >= 20),
    autoDetect: true,
  },

  // Media rules
  {
    id: "has-media",
    label: "Media wizualne",
    description: "Ćwiczenie musi mieć zdjęcie, GIF lub wideo",
    severity: "error",
    category: "media",
    check: (e) =>
      !!(e.videoUrl || e.gifUrl || e.imageUrl || (e.images && e.images.length > 0)),
    autoDetect: true,
  },
  {
    id: "has-video-or-gif",
    label: "Animacja lub wideo",
    description: "Zalecane jest dodanie GIF lub wideo pokazującego ruch",
    severity: "warning",
    category: "media",
    check: (e) => !!(e.videoUrl || e.gifUrl),
    autoDetect: true,
  },

  // Tags rules
  {
    id: "has-main-tags",
    label: "Tagi główne",
    description: "Ćwiczenie musi mieć min. 1 tag główny",
    severity: "error",
    category: "tags",
    check: (e) => !!(e.mainTags && e.mainTags.length > 0),
    autoDetect: true,
  },
  {
    id: "has-multiple-tags",
    label: "Kompletne tagowanie",
    description: "Zalecane min. 3 tagi dla lepszego wyszukiwania",
    severity: "warning",
    category: "tags",
    check: (e) => {
      const totalTags =
        (e.mainTags?.length || 0) + (e.additionalTags?.length || 0);
      return totalTags >= 3;
    },
    autoDetect: true,
  },

  // Parameters rules
  {
    id: "has-type",
    label: "Typ ćwiczenia",
    description: "Ćwiczenie musi mieć określony typ (powtórzenia/czas/izometryczne)",
    severity: "error",
    category: "parameters",
    check: (e) => !!(e.type && e.type !== ""),
    autoDetect: true,
  },
  {
    id: "has-difficulty-level",
    label: "Poziom trudności",
    description: "Ćwiczenie musi mieć określony poziom trudności",
    severity: "error",
    category: "parameters",
    check: (e) => !!(e.difficultyLevel && e.difficultyLevel !== ""),
    autoDetect: true,
  },
  {
    id: "has-parameters",
    label: "Parametry domyślne",
    description: "Ćwiczenie powinno mieć serie, powtórzenia lub czas",
    severity: "warning",
    category: "parameters",
    check: (e) => !!(e.defaultSets || e.defaultReps || e.defaultDuration),
    autoDetect: true,
  },
  {
    id: "has-tempo",
    label: "Tempo ćwiczenia",
    description: "Zalecane jest określenie tempa (np. 2-0-2)",
    severity: "info",
    category: "parameters",
    check: (e) => !!(e.tempo && e.tempo.trim() !== ""),
    autoDetect: true,
  },
  {
    id: "has-rest-times",
    label: "Czasy przerw",
    description: "Zalecane określenie przerw między seriami",
    severity: "info",
    category: "parameters",
    check: (e) => !!(e.defaultRestBetweenSets && e.defaultRestBetweenSets > 0),
    autoDetect: true,
  },
];

/**
 * PublishGuardrails - Walidacja przed publikacją
 *
 * Sprawdza czy ćwiczenie spełnia wszystkie wymagania:
 * - Błędy (error): Blokują publikację
 * - Ostrzeżenia (warning): Pozwalają publikować, ale sugerują poprawki
 * - Info: Tylko informacje
 */
export function PublishGuardrails({
  exercise,
  currentValues,
  onValidationChange,
  className,
  "data-testid": testId,
}: PublishGuardrailsProps) {
  // Merge current values with exercise data
  const mergedExercise = useMemo(
    () => ({
      ...exercise,
      ...currentValues,
    }),
    [exercise, currentValues]
  );

  // Run all validations
  const validationResults = useMemo(() => {
    const results: ValidationResult[] = DEFAULT_RULES.map((rule) => ({
      rule,
      passed: rule.check(mergedExercise as AdminExercise),
    }));

    // Notify parent
    const hasErrors = results.some(
      (r) => !r.passed && r.rule.severity === "error"
    );
    onValidationChange?.(!hasErrors, results);

    return results;
  }, [mergedExercise, onValidationChange]);

  // Group by category
  const groupedResults = useMemo(() => {
    const groups: Record<string, ValidationResult[]> = {
      content: [],
      media: [],
      tags: [],
      parameters: [],
    };

    for (const result of validationResults) {
      groups[result.rule.category].push(result);
    }

    return groups;
  }, [validationResults]);

  // Calculate stats
  const stats = useMemo(() => {
    const errors = validationResults.filter(
      (r) => !r.passed && r.rule.severity === "error"
    ).length;
    const warnings = validationResults.filter(
      (r) => !r.passed && r.rule.severity === "warning"
    ).length;
    const passed = validationResults.filter((r) => r.passed).length;
    const total = validationResults.length;
    const score = Math.round((passed / total) * 100);

    return { errors, warnings, passed, total, score };
  }, [validationResults]);

  const canPublish = stats.errors === 0;

  // Category icons
  const categoryIcons: Record<string, React.ReactNode> = {
    content: <FileText className="h-4 w-4" />,
    media: <ImageIcon className="h-4 w-4" />,
    tags: <Tag className="h-4 w-4" />,
    parameters: <Settings className="h-4 w-4" />,
  };

  const categoryLabels: Record<string, string> = {
    content: "Treść",
    media: "Media",
    tags: "Tagi",
    parameters: "Parametry",
  };

  return (
    <Card className={cn("border-border/60", className)} data-testid={testId}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Shield
              className={cn(
                "h-4 w-4",
                canPublish ? "text-emerald-500" : "text-destructive"
              )}
            />
            Gotowość do publikacji
          </span>
          <div className="flex items-center gap-2">
            {stats.errors > 0 && (
              <Badge variant="destructive" className="text-[10px]">
                {stats.errors} {stats.errors === 1 ? "błąd" : "błędów"}
              </Badge>
            )}
            {stats.warnings > 0 && (
              <Badge
                variant="outline"
                className="text-[10px] border-amber-500/40 text-amber-600"
              >
                {stats.warnings} {stats.warnings === 1 ? "ostrzeżenie" : "ostrzeżeń"}
              </Badge>
            )}
            {canPublish && stats.warnings === 0 && (
              <Badge
                variant="outline"
                className="text-[10px] border-emerald-500/40 text-emerald-600"
              >
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Gotowe
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {stats.passed}/{stats.total} wymagań spełnionych
            </span>
            <span
              className={cn(
                "font-medium",
                stats.score === 100
                  ? "text-emerald-500"
                  : stats.score >= 70
                  ? "text-amber-500"
                  : "text-destructive"
              )}
            >
              {stats.score}%
            </span>
          </div>
          <Progress
            value={stats.score}
            className={cn(
              "h-2",
              stats.score === 100
                ? "[&>div]:bg-emerald-500"
                : stats.score >= 70
                ? "[&>div]:bg-amber-500"
                : "[&>div]:bg-destructive"
            )}
          />
        </div>

        {/* Validation results by category */}
        <div className="space-y-3">
          {Object.entries(groupedResults).map(([category, results]) => {
            const categoryErrors = results.filter(
              (r) => !r.passed && r.rule.severity === "error"
            ).length;
            const categoryWarnings = results.filter(
              (r) => !r.passed && r.rule.severity === "warning"
            ).length;
            const allPassed = categoryErrors === 0 && categoryWarnings === 0;

            return (
              <div key={category} className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs">
                  <span
                    className={cn(
                      allPassed ? "text-emerald-500" : "text-muted-foreground"
                    )}
                  >
                    {categoryIcons[category]}
                  </span>
                  <span className="font-medium">
                    {categoryLabels[category]}
                  </span>
                  {allPassed && (
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  )}
                </div>
                <div className="pl-6 space-y-1">
                  {results.map((result) => (
                    <ValidationItem key={result.rule.id} result={result} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary message */}
        {canPublish ? (
          <div className="flex items-center gap-2 p-2 rounded-md bg-emerald-500/10 text-emerald-600 text-xs">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>
              {stats.warnings > 0
                ? "Ćwiczenie może zostać opublikowane, ale rozważ poprawienie ostrzeżeń."
                : "Ćwiczenie spełnia wszystkie wymagania i jest gotowe do publikacji."}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 p-2 rounded-md bg-destructive/10 text-destructive text-xs">
            <XCircle className="h-4 w-4 shrink-0" />
            <span>
              Ćwiczenie nie może zostać opublikowane. Popraw błędy oznaczone na czerwono.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Single validation item
 */
function ValidationItem({ result }: { result: ValidationResult }) {
  const { rule, passed } = result;

  const icon = passed ? (
    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
  ) : rule.severity === "error" ? (
    <XCircle className="h-3 w-3 text-destructive" />
  ) : rule.severity === "warning" ? (
    <AlertTriangle className="h-3 w-3 text-amber-500" />
  ) : (
    <Info className="h-3 w-3 text-blue-500" />
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "flex items-center gap-2 text-xs py-0.5 cursor-help",
              passed
                ? "text-muted-foreground"
                : rule.severity === "error"
                ? "text-destructive"
                : rule.severity === "warning"
                ? "text-amber-600"
                : "text-blue-600"
            )}
          >
            {icon}
            <span className={cn(passed && "line-through opacity-60")}>
              {rule.label}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs max-w-[200px]">{rule.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Hook do walidacji ćwiczenia
 */
export function useExerciseValidation(
  exercise: AdminExercise | null,
  currentValues?: Record<string, unknown>
) {
  return useMemo(() => {
    if (!exercise) {
      return {
        isValid: false,
        canPublish: false,
        errors: [],
        warnings: [],
        score: 0,
      };
    }

    const merged = { ...exercise, ...currentValues } as AdminExercise;

    const results = DEFAULT_RULES.map((rule) => ({
      rule,
      passed: rule.check(merged),
    }));

    const errors = results.filter(
      (r) => !r.passed && r.rule.severity === "error"
    );
    const warnings = results.filter(
      (r) => !r.passed && r.rule.severity === "warning"
    );
    const passed = results.filter((r) => r.passed).length;
    const score = Math.round((passed / results.length) * 100);

    return {
      isValid: errors.length === 0,
      canPublish: errors.length === 0,
      errors: errors.map((e) => e.rule),
      warnings: warnings.map((w) => w.rule),
      score,
      results,
    };
  }, [exercise, currentValues]);
}
