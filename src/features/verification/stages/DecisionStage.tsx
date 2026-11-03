import { Check } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { StageIssue, VerificationStageKey } from '../utils/verificationStages';

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
}

export function DecisionStage({ rows, onGoToStage }: DecisionStageProps) {
  return (
    <section
      className="rounded-card bg-grouped-tertiary px-4 py-1"
      aria-label="Podsumowanie weryfikacji"
      data-testid="verification-stage-decision"
    >
      {rows.map((row, index) => {
        const isOpen = row.issues.length > 0;
        return (
          <div
            key={row.key}
            className={cn('flex items-start gap-3 py-3', index > 0 && 'border-t-[0.5px] border-separator')}
            data-testid={`verification-decision-${row.key}-row`}
          >
            <span
              className={cn(
                'mt-0.5 grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full text-[12px] font-bold',
                isOpen ? 'bg-status-warning-muted text-status-warning' : 'bg-tint-fill text-on-tint'
              )}
              aria-hidden="true"
            >
              {isOpen ? '!' : <Check className="h-3.5 w-3.5" strokeWidth={3} />}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="text-[15px] font-semibold text-foreground">{row.title}</p>
              {isOpen ? (
                <ul className="flex flex-col gap-0.5 text-[13px] text-status-warning">
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
            <Button
              type="button"
              size="sm"
              variant="plain"
              onClick={() => onGoToStage(row.key)}
              data-testid={`verification-decision-${row.key}-go-btn`}
            >
              {isOpen ? 'Popraw' : 'Zmień'}
            </Button>
          </div>
        );
      })}
    </section>
  );
}
