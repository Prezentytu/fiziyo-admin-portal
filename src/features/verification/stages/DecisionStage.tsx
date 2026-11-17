import { Check } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { hasOnlySuggestions, type StageIssue, type VerificationStageKey } from '../utils/verificationStages';

export interface DecisionRow {
  key: Exclude<VerificationStageKey, 'decision'>;
  title: string;
  summary: string;
  changes: string[];
  issues: StageIssue[];
}

interface DecisionStageProps {
  rows: DecisionRow[];
  onGoToStage: (key: VerificationStageKey) => void;
  /** Accepts the suggestions of one stage without leaving the summary. */
  onAcceptSuggestions: (key: Exclude<VerificationStageKey, 'decision'>) => void;
}

export function DecisionStage({ rows, onGoToStage, onAcceptSuggestions }: DecisionStageProps) {
  return (
    <section
      className="rounded-card bg-grouped-tertiary px-4 py-1"
      aria-label="Podsumowanie weryfikacji"
      data-testid="verification-stage-decision"
    >
      {rows.map((row, index) => {
        const isOpen = row.issues.length > 0;
        const isSuggestion = hasOnlySuggestions(row.issues);
        return (
          <div
            key={row.key}
            className={cn('flex items-start gap-3 py-3', index > 0 && 'border-t-[0.5px] border-separator')}
            data-testid={`verification-decision-${row.key}-row`}
          >
            <span
              className={cn(
                'mt-0.5 grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full text-[12px] font-bold',
                !isOpen
                  ? 'bg-tint-fill text-on-tint'
                  : isSuggestion
                    ? 'bg-status-suggestion-muted text-status-suggestion'
                    : 'bg-status-warning-muted text-status-warning'
              )}
              aria-hidden="true"
            >
              {isOpen ? '!' : <Check className="h-3.5 w-3.5" strokeWidth={3} />}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="text-[15px] font-semibold text-foreground">
                {row.title}
                {isSuggestion && (
                  <span className="ml-2 text-[13px] font-medium text-status-suggestion">sugestie, nie błędy</span>
                )}
              </p>
              {isOpen ? (
                <ul
                  className={cn(
                    'flex flex-col gap-0.5 text-[13px]',
                    isSuggestion ? 'text-label-secondary' : 'text-status-warning'
                  )}
                >
                  {row.issues.map((issue) => (
                    <li key={issue.text}>{issue.text}</li>
                  ))}
                </ul>
              ) : (
                <>
                  <p className="text-[13px] text-label-secondary">{row.summary}</p>
                  {row.changes.length > 0 && (
                    <p className="text-[13px] text-foreground">
                      <span className="text-label-secondary">Twoja zmiana: </span>
                      {row.changes.join(', ')}
                    </p>
                  )}
                </>
              )}
            </div>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
              {isSuggestion && (
                <Button
                  type="button"
                  size="sm"
                  variant="tinted"
                  onClick={() => onAcceptSuggestions(row.key)}
                  data-testid={`verification-decision-${row.key}-accept-btn`}
                >
                  Akceptuj
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                variant="plain"
                onClick={() => onGoToStage(row.key)}
                data-testid={`verification-decision-${row.key}-go-btn`}
              >
                {isOpen && !isSuggestion ? 'Popraw' : 'Zmień'}
              </Button>
            </div>
          </div>
        );
      })}
    </section>
  );
}
