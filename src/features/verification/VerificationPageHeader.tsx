'use client';

import type { ReactNode } from 'react';

import { VerificationScopeTabs } from '@/features/verification/VerificationScopeTabs';
import { useVerificationScopes } from '@/features/verification/useVerificationScopes';
import type { VerificationScopeKey } from '@/features/verification/utils/verificationScopes';

interface VerificationPageHeaderProps {
  scopeKey: VerificationScopeKey;
  actions?: ReactNode;
}

/** One title for every verification queue; the description and tabs say which queue is open. */
export function VerificationPageHeader({ scopeKey, actions }: VerificationPageHeaderProps) {
  const scope = useVerificationScopes().find((candidate) => candidate.key === scopeKey);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-[34px] font-bold leading-[41px] tracking-tight text-foreground">Weryfikacja</h1>
          {scope && <p className="max-w-2xl text-muted-foreground">{scope.description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
      </div>
      <VerificationScopeTabs />
    </div>
  );
}
