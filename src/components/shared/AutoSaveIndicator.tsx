'use client';

import { Check, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface AutoSaveIndicatorProps {
  status: SaveStatus;
  lastSavedAt?: Date | null;
  className?: string;
}

export function AutoSaveIndicator({
  status,
  lastSavedAt,
  className,
}: AutoSaveIndicatorProps) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pl-PL', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div
      className={cn(
        'flex items-center gap-2 text-xs transition-opacity',
        className
      )}
    >
      {status === 'idle' && lastSavedAt && (
        <>
          <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
          <span className="text-muted-foreground">
            Zapisano o {formatTime(lastSavedAt)}
          </span>
        </>
      )}

      {status === 'saving' && (
        <>
          <Loader2 className="h-3 w-3 animate-spin text-primary" />
          <span className="text-muted-foreground">Zapisywanie...</span>
        </>
      )}

      {status === 'saved' && (
        <>
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <span className="text-primary flex items-center gap-1">
            <Check className="h-3 w-3" />
            Zapisano
          </span>
        </>
      )}

      {status === 'error' && (
        <>
          <AlertCircle className="h-3 w-3 text-destructive" />
          <span className="text-destructive">Błąd zapisu</span>
        </>
      )}
    </div>
  );
}









