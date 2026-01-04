'use client';

import { useState } from 'react';
import { FileText, Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { ExtractedClinicalNote, ClinicalNoteDecision } from '@/types/import.types';

interface NoteReviewCardProps {
  note: ExtractedClinicalNote;
  decision: ClinicalNoteDecision;
  onDecisionChange: (decision: Partial<ClinicalNoteDecision>) => void;
  className?: string;
}

/**
 * Karta notatki klinicznej do review
 */
export function NoteReviewCard({
  note,
  decision,
  onDecisionChange,
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
        return 'bg-blue-500/20 text-blue-500';
      case 'examination':
        return 'bg-purple-500/20 text-purple-500';
      case 'diagnosis':
        return 'bg-orange-500/20 text-orange-500';
      case 'procedure':
        return 'bg-green-500/20 text-green-500';
      default:
        return 'bg-surface-light text-muted-foreground';
    }
  };

  // Pokaż preview treści
  const contentPreview =
    note.content.length > 150
      ? note.content.substring(0, 150) + '...'
      : note.content;

  return (
    <Card
      className={cn(
        'overflow-hidden transition-all duration-200',
        decision.action === 'skip' && 'opacity-50',
        decision.action === 'create' && 'border-primary/30 bg-primary/5',
        className
      )}
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
              getNoteTypeColor(note.noteType)
            )}
          >
            <FileText className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-foreground truncate">
                {note.title || getNoteTypeLabel(note.noteType)}
              </h3>
              <Badge
                variant="secondary"
                className={cn('shrink-0 text-xs border-0', getNoteTypeColor(note.noteType))}
              >
                {getNoteTypeLabel(note.noteType)}
              </Badge>
            </div>

            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
              {contentPreview}
            </p>

            {note.points && note.points.length > 0 && !isExpanded && (
              <p className="mt-1 text-xs text-muted-foreground">
                {note.points.length} punktów
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex shrink-0 gap-1">
            <Button
              variant={decision.action === 'create' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onDecisionChange({ action: 'create' })}
              className={cn(
                'h-8',
                decision.action === 'create' && 'bg-primary hover:bg-primary-dark'
              )}
              title="Utwórz notatkę"
            >
              <Check className="h-4 w-4" />
            </Button>

            <Button
              variant={decision.action === 'skip' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onDecisionChange({ action: 'skip' })}
              className={cn(
                'h-8',
                decision.action === 'skip' && 'bg-muted hover:bg-muted'
              )}
              title="Pomiń"
            >
              <X className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8"
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <div className="mt-4 space-y-3 border-t border-border/60 pt-4">
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Pełna treść:
              </p>
              <div className="rounded-lg bg-surface-light p-3">
                <p className="whitespace-pre-wrap text-sm text-foreground">
                  {decision.editedContent || note.content}
                </p>
              </div>
            </div>

            {note.points && note.points.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Punkty:
                </p>
                <ul className="space-y-1">
                  {note.points.map((point, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 text-sm text-foreground"
                    >
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
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
