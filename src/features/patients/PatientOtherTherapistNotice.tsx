import type { ReactNode } from 'react';
import { UserLock } from 'lucide-react';

import { cn } from '@/lib/utils';
import { PATIENT_UNDER_OTHER_THERAPIST_MESSAGE } from '@/features/patients/utils/patientCareAccess';

interface PatientOtherTherapistNoticeProps {
  readonly message?: string | null;
  readonly testId: string;
  readonly className?: string;
  readonly children?: ReactNode;
}

/** The patient is in the clinic under another therapist: says so and who can change it, with no patient data. */
export function PatientOtherTherapistNotice({ message, testId, className, children }: PatientOtherTherapistNoticeProps) {
  return (
    <div
      role="status"
      data-testid={testId}
      className={cn('flex items-start gap-3 rounded-xl border border-border bg-surface p-4', className)}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-status-warning-muted">
        <UserLock className="h-4 w-4 text-status-warning" aria-hidden="true" />
      </span>
      <div className="min-w-0 space-y-3">
        <p className="text-[15px] leading-6 text-foreground">{message || PATIENT_UNDER_OTHER_THERAPIST_MESSAGE}</p>
        {children}
      </div>
    </div>
  );
}
