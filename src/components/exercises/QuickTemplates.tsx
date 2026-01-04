'use client';

import { useState } from 'react';
import { Zap, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { QUICK_TEMPLATES } from '@/services/aiService';
import type { VoiceParseResponse } from '@/types/ai.types';

interface QuickTemplatesProps {
  onSelect: (template: typeof QUICK_TEMPLATES[0]) => Promise<void>;
  className?: string;
  maxVisible?: number;
}

/**
 * Komponent szybkich szablonów do generowania ćwiczeń przez AI
 */
export function QuickTemplates({
  onSelect,
  className,
  maxVisible = 6,
}: QuickTemplatesProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const visibleTemplates = showAll ? QUICK_TEMPLATES : QUICK_TEMPLATES.slice(0, maxVisible);
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
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Zap className="h-4 w-4 text-warning" />
        <span>Szybkie szablony – AI wygeneruje ćwiczenie</span>
      </div>

      <div className="flex flex-wrap gap-2 animate-stagger">
        {visibleTemplates.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => handleClick(template)}
            disabled={activeId !== null}
            className={cn(
              "group flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200",
              activeId === template.id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-surface hover:border-primary/50 hover:bg-surface-light",
              activeId !== null && activeId !== template.id && "opacity-50",
              "disabled:cursor-not-allowed"
            )}
          >
            <span className="text-lg">{template.icon}</span>
            <span className="text-sm font-medium">{template.label}</span>
            {activeId === template.id ? (
              <Loader2 className="h-3 w-3 animate-spin ml-1" />
            ) : (
              <ArrowRight className="h-3 w-3 opacity-0 -translate-x-1 group-hover:opacity-50 group-hover:translate-x-0 transition-all" />
            )}
          </button>
        ))}
      </div>

      {hasMore && !showAll && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowAll(true)}
          className="text-xs text-muted-foreground"
        >
          Pokaż więcej ({QUICK_TEMPLATES.length - maxVisible})
        </Button>
      )}
    </div>
  );
}

export { QUICK_TEMPLATES };
export type { VoiceParseResponse as ParsedExerciseFromAI };
