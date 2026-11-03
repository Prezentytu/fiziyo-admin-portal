'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

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
      {scopes.map((scope) => {
        const isActive = isNavigationHrefActive(pathname, scope.href, scopeHrefs);
        const pending = counts[scope.key];
        return (
          <Link
            key={scope.key}
            href={scope.href}
            title={scope.audience}
            aria-current={isActive ? 'page' : undefined}
            data-testid={scope.testId}
            className={tabLinkVariants({ active: isActive, className: '-mb-px' })}
          >
            <span className={isActive ? 'text-[17px] font-semibold leading-[22px]' : 'text-[17px] leading-[22px]'}>
              {scope.label}
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
        );
      })}
    </nav>
  );
}
