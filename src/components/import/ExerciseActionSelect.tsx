'use client';

import { Link2, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { MatchSuggestion, ExerciseDecision } from '@/types/import.types';

type ActionValue = 'create' | 'skip' | `reuse:${string}`;

interface ExerciseActionSelectProps {
  /** Current decision for this exercise */
  decision: ExerciseDecision;
  /** Available match suggestions (for reuse options) */
  matchSuggestions?: MatchSuggestion[];
  /** Callback when action changes */
  onActionChange: (action: 'create' | 'reuse' | 'skip', reuseExerciseId?: string) => void;
  /** Whether the select is disabled */
  disabled?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Universal action selector for import exercises
 * Replaces 3 buttons with a clean dropdown:
 * - "Połącz z: [Nazwa]" (if matches available)
 * - "Utwórz jako nowe"
 * - "Nie importuj"
 */
export function ExerciseActionSelect({
  decision,
  matchSuggestions = [],
  onActionChange,
  disabled = false,
  className,
}: ExerciseActionSelectProps) {
  const hasMatches = matchSuggestions.length > 0;

  // Determine current value for Select
  const getCurrentValue = (): ActionValue => {
    if (decision.action === 'skip') return 'skip';
    if (decision.action === 'create') return 'create';
    if (decision.action === 'reuse' && decision.reuseExerciseId) {
      return `reuse:${decision.reuseExerciseId}`;
    }
    return 'create';
  };

  // Handle value change from Select
  const handleValueChange = (value: ActionValue) => {
    if (value === 'create') {
      onActionChange('create');
    } else if (value === 'skip') {
      onActionChange('skip');
    } else if (value.startsWith('reuse:')) {
      const exerciseId = value.replace('reuse:', '');
      onActionChange('reuse', exerciseId);
    }
  };

  // Get display text for current selection
  const getDisplayText = () => {
    if (decision.action === 'skip') return 'Nie importuj';
    if (decision.action === 'create') return 'Utwórz jako nowe';
    if (decision.action === 'reuse' && decision.reuseExerciseId) {
      const match = matchSuggestions.find(
        (m) => m.existingExerciseId === decision.reuseExerciseId
      );
      return match ? `Połącz z: ${match.existingExerciseName}` : 'Użyj z bazy';
    }
    return 'Wybierz akcję';
  };

  // Get icon for current selection
  const getIcon = () => {
    if (decision.action === 'skip') return <X className="h-4 w-4 text-muted-foreground" />;
    if (decision.action === 'create') return <Plus className="h-4 w-4 text-primary" />;
    if (decision.action === 'reuse') return <Link2 className="h-4 w-4 text-blue-500" />;
    return null;
  };

  return (
    <Select
      value={getCurrentValue()}
      onValueChange={handleValueChange}
      disabled={disabled}
    >
      <SelectTrigger
        className={cn(
          'h-9 w-full min-w-[200px]',
          decision.action === 'reuse' && 'border-blue-500/50 bg-blue-500/5',
          decision.action === 'create' && 'border-primary/50 bg-primary/5',
          decision.action === 'skip' && 'border-border bg-muted/50 text-muted-foreground',
          className
        )}
        data-testid="import-action-select-trigger"
      >
        <div className="flex items-center gap-2">
          {getIcon()}
          <SelectValue placeholder="Wybierz akcję">{getDisplayText()}</SelectValue>
        </div>
      </SelectTrigger>
      <SelectContent>
        {/* Reuse options - show matches first */}
        {hasMatches && (
          <>
            {matchSuggestions.map((match) => (
              <SelectItem
                key={match.existingExerciseId}
                value={`reuse:${match.existingExerciseId}`}
                className="cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-blue-500 shrink-0" />
                  <span className="truncate">Połącz z: {match.existingExerciseName}</span>
                </div>
              </SelectItem>
            ))}
          </>
        )}

        {/* Create as new */}
        <SelectItem value="create" className="cursor-pointer">
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary shrink-0" />
            <span>Utwórz jako nowe</span>
          </div>
        </SelectItem>

        {/* Skip / Don't import */}
        <SelectItem value="skip" className="cursor-pointer">
          <div className="flex items-center gap-2">
            <X className="h-4 w-4 text-muted-foreground shrink-0" />
            <span>Nie importuj</span>
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
