'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Lock } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { tabLinkVariants } from '@/components/ui/tabs';
import { isNavigationHrefActive } from '@/components/layout/navigationActive';
import { useVerificationPendingCounts, useVerificationScopes } from '@/features/verification/useVerificationScopes';

/** Switches between the verification queues the user can open; hidden when only one is available. */
export function VerificationScopeTabs() {
  const pathname = usePathname();
  const scopes = useVerificationScopes();
  const { counts } = useVerificationPendingCounts();

  if (scopes.length < 2) {
    return null;
  }

  const scopeHrefs = scopes.map((scope) => scope.href);

  return (
    <nav
      aria-label="Kolejki weryfikacji"
      data-testid="verification-scope-tabs"
      className="flex flex-wrap items-stretch gap-x-7 border-b border-border"
    >
      {scopes.map((scope, index) => {
        const isActive = isNavigationHrefActive(pathname, scope.href, scopeHrefs);
        const pending = counts[scope.key];
        const startsModeration = scope.group === 'moderation' && scopes[index - 1]?.group !== 'moderation';
        return (
          <Fragment key={scope.key}>
            {startsModeration && (
              <div
                className="flex items-center gap-3 text-[13px] text-muted-foreground"
                data-testid="verification-scope-tabs-moderation-label"
              >
                {index > 0 && <span aria-hidden className="h-5 w-px bg-border" />}
                <span className="inline-flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5" aria-hidden />
                  Moderacja FiziYo
                </span>
              </div>
            )}
            <Link
              href={scope.href}
              aria-current={isActive ? 'page' : undefined}
              data-testid={scope.testId}
              className={tabLinkVariants({ active: isActive, className: '-mb-px' })}
            >
              <span className="flex flex-col gap-0.5">
                <span className={isActive ? 'text-[17px] font-semibold leading-[22px]' : 'text-[17px] leading-[22px]'}>
                  {scope.label}
                </span>
                <span className="text-[13px] leading-[18px] text-muted-foreground">{scope.audience}</span>
              </span>
              {pending !== undefined && (
                <Badge
                  variant={scope.group === 'own' && pending > 0 ? 'warning' : 'secondary'}
                  className="tabular-nums"
                  data-testid={`${scope.testId}-count`}
                >
                  {pending}
                </Badge>
              )}
            </Link>
          </Fragment>
        );
      })}
    </nav>
  );
}
