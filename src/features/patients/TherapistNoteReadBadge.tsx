import { CheckCheck, Clock } from 'lucide-react';
import { formatDateWithTime } from '@/lib/therapyStatus';
import type { TherapistNoteReadState } from './utils/therapistNoteReadStatus';

interface TherapistNoteReadBadgeProps {
  readonly state: TherapistNoteReadState | null;
  readonly testId: string;
}

/** „Pacjent przeczytał” albo „Pacjent jeszcze nie przeczytał” przy uwadze fizjoterapeuty (S-01 R3). */
export function TherapistNoteReadBadge({ state, testId }: TherapistNoteReadBadgeProps) {
  if (!state) return null;
  if (state.kind === 'read') {
    return (
      <p className="flex items-center gap-1 text-xs text-muted-foreground" data-testid={testId} data-state="read">
        <CheckCheck className="h-3.5 w-3.5 text-primary" aria-hidden />
        Pacjent przeczytał · {formatDateWithTime(state.seenAt)}
      </p>
    );
  }
  return (
    <p className="flex items-center gap-1 text-xs text-muted-foreground" data-testid={testId} data-state="unread">
      <Clock className="h-3.5 w-3.5" aria-hidden />
      Pacjent jeszcze nie przeczytał
    </p>
  );
}
