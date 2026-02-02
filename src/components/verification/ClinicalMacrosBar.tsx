"use client";

import { useMemo, useState } from "react";
import {
  ArrowUp,
  Wind,
  Shield,
  Clock,
  Maximize2,
  User,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  getMacrosForTags,
  groupMacrosByCategory,
  getCategoryLabel,
  type ClinicalMacro,
  type MacroCategory,
} from "@/data/clinical-macros";

// Icon mapping
const CATEGORY_ICONS: Record<MacroCategory, React.ReactNode> = {
  posture: <User className="h-3 w-3" />,
  breathing: <Wind className="h-3 w-3" />,
  safety: <Shield className="h-3 w-3" />,
  tempo: <Clock className="h-3 w-3" />,
  range: <Maximize2 className="h-3 w-3" />,
};

interface ClinicalMacrosBarProps {
  /** Tagi ćwiczenia - determinują które makra są wyświetlane */
  exerciseTags: string[];
  /** Callback przy wstawieniu makra do opisu */
  onInsert: (text: string) => void;
  /** Czy komponent jest disabled */
  disabled?: boolean;
  /** Dodatkowe klasy CSS */
  className?: string;
  /** data-testid */
  "data-testid"?: string;
}

/**
 * ClinicalMacrosBar - Kontekstowe frazy medyczne
 *
 * Filozofia:
 * - Wyświetla profesjonalne frazy dopasowane do tagów ćwiczenia
 * - Kliknięcie = wstawienie frazy do opisu
 * - Standaryzacja opisów = profesjonalny wizerunek
 *
 * Layout:
 * - Compact: rząd chipów z najpopularniejszymi makrami
 * - Expanded: grupowanie po kategoriach
 */
export function ClinicalMacrosBar({
  exerciseTags,
  onInsert,
  disabled = false,
  className,
  "data-testid": testId,
}: ClinicalMacrosBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Get macros for current exercise tags
  const relevantMacros = useMemo(
    () => getMacrosForTags(exerciseTags),
    [exerciseTags]
  );

  // Group by category for expanded view
  const groupedMacros = useMemo(
    () => groupMacrosByCategory(relevantMacros),
    [relevantMacros]
  );

  // Top macros for compact view (max 6)
  const topMacros = useMemo(() => relevantMacros.slice(0, 6), [relevantMacros]);

  // Categories with macros (for expanded view)
  const categoriesWithMacros = useMemo(
    () =>
      (Object.entries(groupedMacros) as [MacroCategory, ClinicalMacro[]][])
        .filter(([, macros]) => macros.length > 0),
    [groupedMacros]
  );

  const handleInsert = (macro: ClinicalMacro) => {
    if (disabled) return;
    onInsert(macro.text);
  };

  if (relevantMacros.length === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <Collapsible
        open={isExpanded}
        onOpenChange={setIsExpanded}
        className={cn("space-y-2", className)}
        data-testid={testId}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span>Szybkie frazy</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {relevantMacros.length}
            </Badge>
          </div>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  Mniej
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  Więcej
                </>
              )}
            </Button>
          </CollapsibleTrigger>
        </div>

        {/* Compact view - top macros */}
        {!isExpanded && (
          <div className="flex flex-wrap gap-1.5">
            {topMacros.map((macro) => (
              <MacroChip
                key={macro.id}
                macro={macro}
                onClick={() => handleInsert(macro)}
                disabled={disabled}
              />
            ))}
            {relevantMacros.length > 6 && (
              <span className="text-xs text-muted-foreground self-center px-1">
                +{relevantMacros.length - 6} więcej
              </span>
            )}
          </div>
        )}

        {/* Expanded view - grouped by category */}
        <CollapsibleContent className="space-y-3">
          {categoriesWithMacros.map(([category, macros]) => (
            <div key={category} className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {CATEGORY_ICONS[category]}
                <span className="font-medium">{getCategoryLabel(category)}</span>
              </div>
              <div className="flex flex-wrap gap-1.5 pl-5">
                {macros.map((macro) => (
                  <MacroChip
                    key={macro.id}
                    macro={macro}
                    onClick={() => handleInsert(macro)}
                    disabled={disabled}
                    showCategory={false}
                  />
                ))}
              </div>
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>
    </TooltipProvider>
  );
}

// ============================================
// MacroChip - Individual macro button
// ============================================

interface MacroChipProps {
  macro: ClinicalMacro;
  onClick: () => void;
  disabled?: boolean;
  showCategory?: boolean;
}

function MacroChip({
  macro,
  onClick,
  disabled = false,
  showCategory = true,
}: MacroChipProps) {
  const categoryColors: Record<MacroCategory, string> = {
    posture: "bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border-blue-500/20",
    breathing: "bg-cyan-500/10 text-cyan-600 hover:bg-cyan-500/20 border-cyan-500/20",
    safety: "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-amber-500/20",
    tempo: "bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 border-purple-500/20",
    range: "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20",
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          disabled={disabled}
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
            "border transition-colors cursor-pointer",
            categoryColors[macro.category],
            disabled && "opacity-50 cursor-not-allowed"
          )}
          data-testid={`clinical-macro-${macro.id}`}
        >
          {showCategory && CATEGORY_ICONS[macro.category]}
          {macro.shortLabel}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <p className="text-xs">{macro.text}</p>
        <p className="text-[10px] text-muted-foreground mt-1">
          Kliknij aby dodać do opisu
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
