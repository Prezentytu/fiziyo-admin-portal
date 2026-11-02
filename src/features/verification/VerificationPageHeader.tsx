'use client';

import type { ReactNode } from 'react';

import { VerificationScopeTabs } from '@/features/verification/VerificationScopeTabs';

interface VerificationPageHeaderProps {
  actions?: ReactNode;
}

/** One title for every verification queue; the tabs say which queue is open. */
export function VerificationPageHeader({ actions }: VerificationPageHeaderProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-[34px] font-bold leading-[41px] tracking-tight text-foreground">Weryfikacja</h1>
        {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
      </div>
      <VerificationScopeTabs />
    </div>
  );
}
