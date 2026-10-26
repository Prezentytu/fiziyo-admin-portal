import { Check } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { VerificationStageKey } from '../utils/verificationStages';

export type StageNavState = 'current' | 'done' | 'problem' | 'todo';

export interface StageNavItem {
  key: VerificationStageKey;
  title: string;
  sub: string;
  state: StageNavState;
  /** Warning sub-line also for the current stage when it has open issues. */
  hasIssues: boolean;
}

interface VerificationStageNavProps {
  items: StageNavItem[];
  onSelect: (key: VerificationStageKey) => void;
}

function StageDot({ index, state }: Readonly<{ index: number; state: StageNavState }>) {
  if (state === 'done') {
    return (
      <span className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full bg-tint-fill text-on-tint">
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </span>
    );
  }
  return (
    <span
      className={cn(
        'grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full text-[12px] font-bold',
        state === 'current' && 'bg-foreground text-card',
        state === 'problem' && 'bg-status-warning-muted text-status-warning',
        state === 'todo' && 'bg-fill-tertiary text-label-secondary'
      )}
    >
      {state === 'problem' ? '!' : index + 1}
    </span>
  );
}

export function VerificationStageNav({ items, onSelect }: VerificationStageNavProps) {
  return (
    <nav
      aria-label="Etapy weryfikacji"
      className="sticky top-0 z-20 -mx-4 border-b-[0.5px] border-separator bg-card px-4 pb-3 pt-2 sm:-mx-8 sm:px-8 xl:-mx-11 xl:px-11"
      data-testid="verification-stage-nav"
    >
      <ol className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-5">
        {items.map((item, index) => (
          <li key={item.key} className="min-w-0">
            <button
              type="button"
              aria-current={item.state === 'current' ? 'step' : undefined}
              onClick={() => onSelect(item.key)}
              className={cn(
                'flex w-full min-w-0 items-center gap-2.5 rounded-[14px] px-2.5 py-2 text-left transition-colors',
                item.state === 'current' ? 'bg-grouped-tertiary' : 'hover:bg-fill-quaternary'
              )}
              data-testid={`verification-stage-${item.key}-btn`}
            >
              <StageDot index={index} state={item.state} />
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-[14px] font-semibold leading-[18px] text-foreground">{item.title}</span>
                <span
                  className={cn(
                    'truncate text-[12px] leading-4',
                    item.hasIssues && item.state !== 'todo'
                      ? 'font-semibold text-status-warning'
                      : 'text-label-secondary'
                  )}
                >
                  {item.sub}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
