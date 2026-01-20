'use client';

import { Wand2, FileText, Image, Tag, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type GhostFieldType = 'description' | 'media' | 'tags' | 'custom';

interface GhostFieldProps {
  /** Type of field - determines icon and default text */
  type: GhostFieldType;
  /** Custom label (overrides default based on type) */
  label?: string;
  /** Custom description text */
  description?: string;
  /** Callback when user wants to add manually */
  onManualAdd?: () => void;
  /** Callback when user wants AI to generate */
  onAIGenerate?: () => void;
  /** Whether AI generation is in progress */
  isAILoading?: boolean;
  /** Whether AI generation is available */
  hasAI?: boolean;
  /** Additional class names */
  className?: string;
  /** Test ID for the component */
  testId?: string;
}

/**
 * Default configurations for each field type
 */
const FIELD_CONFIGS: Record<GhostFieldType, { icon: typeof FileText; label: string; aiLabel: string; description: string }> = {
  description: {
    icon: FileText,
    label: 'Dodaj opis',
    aiLabel: 'Wygeneruj opis z AI',
    description: 'Opisz technikę wykonania ćwiczenia',
  },
  media: {
    icon: Image,
    label: 'Dodaj zdjęcie',
    aiLabel: 'Wygeneruj obraz AI',
    description: 'Dodaj wizualizację ćwiczenia',
  },
  tags: {
    icon: Tag,
    label: 'Dodaj kategorie',
    aiLabel: 'Zasugeruj tagi AI',
    description: 'Przypisz ćwiczenie do kategorii',
  },
  custom: {
    icon: Plus,
    label: 'Dodaj',
    aiLabel: 'Wygeneruj z AI',
    description: '',
  },
};

/**
 * GhostField - Placeholder for empty fields with AI Trigger
 *
 * Features:
 * - Dashed border indicating empty/optional field
 * - AI magic wand icon for one-click generation
 * - Smooth hover animations
 * - Loading state during AI generation
 * - Amber color scheme (recommended, not critical)
 *
 * The key UX insight: clicking doesn't just open an empty field,
 * it offers AI assistance immediately - reducing friction and
 * creating a "dopamine hit" when fields auto-fill.
 */
export function GhostField({
  type,
  label,
  description,
  onManualAdd,
  onAIGenerate,
  isAILoading = false,
  hasAI = true,
  className,
  testId,
}: GhostFieldProps) {
  const config = FIELD_CONFIGS[type];
  const Icon = config.icon;

  const displayLabel = label || (hasAI && onAIGenerate ? config.aiLabel : config.label);
  const displayDescription = description || config.description;

  // Handle click - prefer AI if available, otherwise manual
  const handleClick = () => {
    if (isAILoading) return;

    if (hasAI && onAIGenerate) {
      onAIGenerate();
    } else if (onManualAdd) {
      onManualAdd();
    }
  };

  // Handle manual add (secondary action)
  const handleManualClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onManualAdd) {
      onManualAdd();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isAILoading}
      className={cn(
        'group relative w-full rounded-xl border-2 border-dashed p-4 text-left',
        'transition-all duration-300 ease-out',
        'border-amber-300/40 bg-amber-500/5',
        'hover:border-amber-400 hover:bg-amber-500/10',
        'hover:shadow-lg hover:shadow-amber-500/10',
        'focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:ring-offset-2 focus:ring-offset-background',
        'disabled:opacity-70 disabled:cursor-wait',
        className
      )}
      data-testid={testId || `ghost-field-${type}`}
    >
      <div className="flex items-center gap-3">
        {/* Icon container */}
        <div className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
          'bg-amber-500/10 transition-all duration-300',
          'group-hover:bg-amber-500/20 group-hover:scale-110'
        )}>
          {isAILoading ? (
            <Loader2 className="h-5 w-5 text-amber-500 animate-spin" />
          ) : hasAI && onAIGenerate ? (
            <Wand2 className="h-5 w-5 text-amber-500 transition-transform duration-300 group-hover:rotate-12" />
          ) : (
            <Icon className="h-5 w-5 text-amber-500" />
          )}
        </div>

        {/* Text content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-amber-600 group-hover:text-amber-500 transition-colors">
              {isAILoading ? 'Generowanie...' : displayLabel}
            </span>
            {hasAI && onAIGenerate && !isAILoading && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500/70">
                AI
              </span>
            )}
          </div>
          {displayDescription && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {displayDescription}
            </p>
          )}
        </div>

        {/* Manual add button (if AI is primary) */}
        {hasAI && onAIGenerate && onManualAdd && !isAILoading && (
          <button
            type="button"
            onClick={handleManualClick}
            className={cn(
              'shrink-0 px-2 py-1 rounded-md text-xs',
              'text-muted-foreground hover:text-foreground',
              'hover:bg-surface-light transition-colors',
              'opacity-0 group-hover:opacity-100'
            )}
            data-testid={testId ? `${testId}-manual-btn` : `ghost-field-${type}-manual-btn`}
          >
            Ręcznie
          </button>
        )}

        {/* Arrow indicator */}
        {!isAILoading && (
          <div className={cn(
            'shrink-0 text-amber-500/50 transition-all duration-300',
            'group-hover:text-amber-500 group-hover:translate-x-1'
          )}>
            <Plus className="h-4 w-4" />
          </div>
        )}
      </div>

      {/* Loading progress bar */}
      {isAILoading && (
        <div className="absolute bottom-0 left-0 right-0 h-1 overflow-hidden rounded-b-xl">
          <div className="h-full w-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 animate-shimmer" />
        </div>
      )}
    </button>
  );
}
