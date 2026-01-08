'use client';

import { useState, useMemo } from 'react';
import { Sparkles, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { QUICK_TEMPLATES } from '@/services/aiService';
import type { VoiceParseResponse } from '@/types/ai.types';

interface QuickTemplatesProps {
  onSelect: (template: typeof QUICK_TEMPLATES[0]) => Promise<void>;
  className?: string;
  maxVisible?: number;
  defaultExpanded?: boolean;
}

// Grupowanie ćwiczeń wg kategorii dla lepszej organizacji
const TEMPLATE_GROUPS = [
  { id: 'core', label: 'Core & Stabilizacja', ids: ['plank', 'bird-dog', 'dead-bug', 'cat-cow'] },
  { id: 'hips', label: 'Biodra & Pośladki', ids: ['glute-bridge', 'clamshell', 'hip-thrust', 'side-lying-leg-raise'] },
  { id: 'legs', label: 'Nogi & Kolana', ids: ['squat', 'lunge', 'wall-sit', 'step-up'] },
  { id: 'back', label: 'Plecy & Kręgosłup', ids: ['superman', 'child-pose', 'back-extension'] },
  { id: 'shoulders', label: 'Barki & Ramiona', ids: ['shoulder-external-rotation', 'wall-angels', 'band-pull-apart'] },
  { id: 'stretch', label: 'Rozciąganie', ids: ['hip-flexor-stretch', 'hamstring-stretch', 'piriformis-stretch', 'chest-stretch'] },
];

/**
 * Komponent szybkich szablonów do generowania ćwiczeń przez AI
 * Rozwinięty grid z najpopularniejszymi ćwiczeniami fizjoterapeutycznymi
 */
export function QuickTemplates({
  onSelect,
  className,
  maxVisible = 12,
  defaultExpanded = true,
}: QuickTemplatesProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(defaultExpanded);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  // Grupowane szablony
  const groupedTemplates = useMemo(() => {
    return TEMPLATE_GROUPS.map(group => ({
      ...group,
      templates: group.ids
        .map(id => QUICK_TEMPLATES.find(t => t.id === id))
        .filter((t): t is typeof QUICK_TEMPLATES[0] => t !== undefined)
    }));
  }, []);

  // Flat list dla widoku kompaktowego
  const visibleTemplates = showAll
    ? QUICK_TEMPLATES
    : QUICK_TEMPLATES.slice(0, maxVisible);

  const hasMore = QUICK_TEMPLATES.length > maxVisible;

  const handleClick = async (template: typeof QUICK_TEMPLATES[0]) => {
    setActiveId(template.id);
    try {
      await onSelect(template);
    } finally {
      setActiveId(null);
    }
  };

  return (
    <div className={cn("space-y-4", className)} data-testid="exercise-quick-templates">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4 text-primary" />
          <span>Szybkie szablony – AI wygeneruje ćwiczenie</span>
        </div>
        {hasMore && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowAll(!showAll)}
            className="text-xs gap-1 h-7"
            data-testid="exercise-quick-templates-toggle-btn"
          >
            {showAll ? (
              <>
                <ChevronUp className="h-3 w-3" />
                Zwiń
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" />
                Pokaż wszystkie ({QUICK_TEMPLATES.length})
              </>
            )}
          </Button>
        )}
      </div>

      {/* Grupowany widok (gdy rozwinięte) */}
      {showAll ? (
        <div className="space-y-4">
          {groupedTemplates.map((group) => (
            <div key={group.id} className="space-y-2">
              {/* Nagłówek grupy */}
              <button
                type="button"
                onClick={() => setActiveGroup(activeGroup === group.id ? null : group.id)}
                className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <span className="text-primary">{group.label}</span>
                <span className="text-muted-foreground/50">({group.templates.length})</span>
              </button>

              {/* Grid ćwiczeń */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {group.templates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => handleClick(template)}
                    disabled={activeId !== null}
                    data-testid={`exercise-quick-template-${template.id}-btn`}
                    className={cn(
                      "group flex items-center gap-2 px-3 py-2.5 rounded-lg border text-left transition-all duration-200",
                      activeId === template.id
                        ? "border-primary bg-primary/10 text-primary shadow-sm shadow-primary/20"
                        : "border-border/60 bg-surface hover:border-primary/40 hover:bg-surface-light hover:shadow-sm",
                      activeId !== null && activeId !== template.id && "opacity-40",
                      "disabled:cursor-not-allowed"
                    )}
                  >
                    <span className="text-base shrink-0">{template.icon}</span>
                    <span className="text-sm font-medium truncate flex-1">{template.label}</span>
                    {activeId === template.id && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Kompaktowy grid (gdy zwinięte) */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {visibleTemplates.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => handleClick(template)}
              disabled={activeId !== null}
              data-testid={`exercise-quick-template-${template.id}-btn`}
              className={cn(
                "group flex items-center gap-2 px-3 py-2.5 rounded-lg border text-left transition-all duration-200",
                activeId === template.id
                  ? "border-primary bg-primary/10 text-primary shadow-sm shadow-primary/20"
                  : "border-border/60 bg-surface hover:border-primary/40 hover:bg-surface-light hover:shadow-sm",
                activeId !== null && activeId !== template.id && "opacity-40",
                "disabled:cursor-not-allowed"
              )}
            >
              <span className="text-base shrink-0">{template.icon}</span>
              <span className="text-sm font-medium truncate flex-1">{template.label}</span>
              {activeId === template.id && (
                <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0 text-primary" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export { QUICK_TEMPLATES };
export type { VoiceParseResponse as ParsedExerciseFromAI };
