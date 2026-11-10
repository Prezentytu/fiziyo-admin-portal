import { Sparkles } from 'lucide-react';

import type { StageIssue } from '@/features/verification/utils/verificationStages';

interface ContentGapsNoticeProps {
  gaps: StageIssue[];
  /** Włącza edycję; bez niej (ćwiczenie zablokowane) braki zostają samym tekstem. */
  onFix?: () => void;
}

export function ContentGapsNotice({ gaps, onFix }: ContentGapsNoticeProps) {
  if (gaps.length === 0) return null;

  return (
    <div className="rounded-2xl border border-status-info/20 bg-status-info-muted p-4">
      <div className="flex items-start gap-3">
        <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-status-info" />
        <div>
          <p className="text-sm font-semibold text-foreground">To ćwiczenie może być jeszcze lepsze</p>
          <ul
            className="list-disc space-y-0.5 pl-5 text-sm text-muted-foreground"
            data-testid="exercise-detail-content-gaps"
          >
            {gaps.map((gap, index) => (
              <li key={gap.text}>
                {onFix ? (
                  <button
                    type="button"
                    data-testid={`exercise-detail-content-gap-${index}`}
                    onClick={onFix}
                    className="cursor-pointer text-left underline decoration-dotted underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                  >
                    {gap.text}
                  </button>
                ) : (
                  gap.text
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
