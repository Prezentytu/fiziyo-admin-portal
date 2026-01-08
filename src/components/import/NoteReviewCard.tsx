'use client';

import { useState } from 'react';
import { FileText, Check, X, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { ExtractedClinicalNote, ClinicalNoteDecision } from '@/types/import.types';

interface NoteReviewCardProps {
  note: ExtractedClinicalNote;
  decision: ClinicalNoteDecision;
  onDecisionChange: (decision: Partial<ClinicalNoteDecision>) => void;
  /** Gdy true - notatka nie może być importowana (brak pacjenta) */
  disabled?: boolean;
  className?: string;
}

/**
 * Karta notatki do review - uproszczona
 * Przyciski z tekstem dla lepszej czytelności
 */
export function NoteReviewCard({
  note,
  decision,
  onDecisionChange,
  disabled = false,
  className,
}: NoteReviewCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getNoteTypeLabel = (type: string) => {
    switch (type) {
      case 'interview':
        return 'Wywiad';
      case 'examination':
        return 'Badanie';
      case 'diagnosis':
        return 'Diagnoza';
      case 'procedure':
        return 'Procedura';
      default:
        return 'Notatka';
    }
  };

  const getNoteTypeColor = (type: string) => {
    switch (type) {
      case 'interview':
        return 'bg-blue-500/20 text-blue-600';
      case 'examination':
        return 'bg-purple-500/20 text-purple-600';
      case 'diagnosis':
        return 'bg-orange-500/20 text-orange-600';
      case 'procedure':
        return 'bg-green-500/20 text-green-600';
      default:
        return 'bg-surface-light text-muted-foreground';
    }
  };

  // Pokaż preview treści
  const contentPreview =
    note.content.length > 200
      ? note.content.substring(0, 200) + '...'
      : note.content;

  // Gdy disabled, traktuj jako "skip"
  const effectiveAction = disabled ? 'skip' : decision.action;

  return (
    <Card
      className={cn(
        'overflow-hidden transition-colors duration-200',
        effectiveAction === 'skip' && 'opacity-60',
        effectiveAction === 'create' && 'border-primary/40 bg-primary/5',
        disabled && 'border-warning/40 bg-warning/5',
        className
      )}
    >
      <CardContent className="p-5">
        {/* Disabled warning */}
        {disabled && (
          <div className="mb-4 flex items-center gap-3 rounded-lg bg-warning/10 px-4 py-3">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
            <span className="text-sm text-warning font-medium">
              Wybierz pacjenta powyżej, aby móc zaimportować tę notatkę
            </span>
          </div>
        )}

        {/* Header */}
        <div className="flex items-start gap-4">
          <div
            className={cn(
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
              disabled ? 'bg-warning/20' : getNoteTypeColor(note.noteType)
            )}
          >
            <FileText className={cn('h-6 w-6', disabled ? 'text-warning' : '')} />
          </div>

          <div className="min-w-0 flex-1">
            {/* Tytuł i typ */}
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-semibold text-foreground">
                {note.title || getNoteTypeLabel(note.noteType)}
              </h3>
              <Badge
                variant="secondary"
                className={cn('text-xs border-0', getNoteTypeColor(note.noteType))}
              >
                {getNoteTypeLabel(note.noteType)}
              </Badge>
            </div>

            {/* Preview treści */}
            <p className="mt-2 text-sm text-muted-foreground line-clamp-3">
              {contentPreview}
            </p>

            {/* Info o punktach */}
            {note.points && note.points.length > 0 && !isExpanded && (
              <p className="mt-2 text-sm text-muted-foreground">
                Zawiera {note.points.length} punktów
              </p>
            )}
          </div>

          {/* Przycisk rozwijania */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsExpanded(!isExpanded)}
            className="shrink-0 h-10 w-10"
          >
            {isExpanded ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Przyciski akcji - czytelne etykiety dla fizjoterapeutów */}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant={effectiveAction === 'create' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onDecisionChange({ action: 'create' })}
            disabled={disabled}
            className={cn(
              'gap-2 h-9 px-4',
              effectiveAction === 'create' && 'bg-primary hover:bg-primary-dark'
            )}
            data-testid={`import-note-card-${note.tempId}-create-btn`}
          >
            <Check className="h-4 w-4" />
            Zapisz tę notatkę
          </Button>

          <Button
            variant={effectiveAction === 'skip' ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => onDecisionChange({ action: 'skip' })}
            disabled={disabled}
            className={cn(
              'gap-2 h-9 px-4',
              effectiveAction === 'skip' && !disabled && 'bg-muted text-muted-foreground'
            )}
            data-testid={`import-note-card-${note.tempId}-skip-btn`}
          >
            <X className="h-4 w-4" />
            Nie importuj
          </Button>
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <div className="mt-4 space-y-4 border-t border-border/60 pt-4">
            <div>
              <p className="text-sm font-medium text-foreground mb-2">
                Pełna treść:
              </p>
              <div className="rounded-lg bg-surface-light p-4">
                <p className="whitespace-pre-wrap text-sm text-foreground">
                  {decision.editedContent || note.content}
                </p>
              </div>
            </div>

            {note.points && note.points.length > 0 && (
              <div>
                <p className="text-sm font-medium text-foreground mb-2">
                  Punkty:
                </p>
                <ul className="space-y-2">
                  {note.points.map((point, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-3 text-sm text-foreground"
                    >
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
