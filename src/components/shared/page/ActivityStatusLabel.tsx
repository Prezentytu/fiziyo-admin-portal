import { cn } from '@/lib/utils';
import type { PatientActivityTone } from '@/features/patients/utils/patientActivityStatus';

const TONE_TEXT: Record<PatientActivityTone, string> = {
  success: 'text-status-success',
  warning: 'text-status-warning',
  danger: 'text-status-danger',
  none: 'text-label-secondary',
};

interface ActivityStatusLabelProps {
  readonly tone: PatientActivityTone;
  readonly label: string;
  readonly className?: string;
}

/** Dot + text status. Color is never the only signal: the label always states the status. */
export function ActivityStatusLabel({ tone, label, className }: ActivityStatusLabelProps) {
  return (
    <span className={cn('inline-flex items-center gap-2 whitespace-nowrap text-[14px] font-semibold', TONE_TEXT[tone], className)}>
      <span
        aria-hidden="true"
        className={cn(
          'h-2 w-2 shrink-0 rounded-full',
          tone === 'none' ? 'shadow-[inset_0_0_0_1.5px_currentColor]' : 'bg-current',
          tone === 'danger' && 'outline-3 outline-status-danger-muted'
        )}
      />
      {label}
    </span>
  );
}
