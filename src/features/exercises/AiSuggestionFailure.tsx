'use client';

import { AlertTriangle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { AiCreditsRequestControl } from '@/features/ai-credits/AiCreditsRequestControl';
import type { AiErrorMapping } from '@/utils/aiErrorMessages';

const UNKNOWN_FAILURE_MESSAGE = 'Nie udało się wygenerować sugestii. Spróbuj ponownie.';

interface AiSuggestionFailureProps {
  /** Rozpoznany powód z `/api/ai/*`; `null` = nieznany błąd, wtedy ponowienie ma sens. */
  readonly failure: AiErrorMapping | null;
  readonly onClose: () => void;
}

/** Pusty stan panelu „Ulepsz z AI”: mówi prawdziwy powód, a przy braku kredytów prowadzi do prośby o kredyty. */
export function AiSuggestionFailure({ failure, onClose }: AiSuggestionFailureProps) {
  return (
    <div
      className="w-[420px] border-l border-border bg-card p-6 flex flex-col items-center justify-center gap-4"
      data-testid="exercise-ai-suggestion-failure"
    >
      <AlertTriangle className="h-8 w-8 text-warning" />
      <p className="text-sm text-muted-foreground text-center" data-testid="exercise-ai-suggestion-failure-message">
        {failure?.message ?? UNKNOWN_FAILURE_MESSAGE}
      </p>
      {failure?.kind === 'insufficient_credits' && (
        <AiCreditsRequestControl showOwnerHint testIdPrefix="exercise-ai-suggestion-credits" className="text-center" />
      )}
      <Button variant="outline" size="sm" onClick={onClose} data-testid="exercise-ai-suggestion-failure-close">
        Zamknij
      </Button>
    </div>
  );
}
