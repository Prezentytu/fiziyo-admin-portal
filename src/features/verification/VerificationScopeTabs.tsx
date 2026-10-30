'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { segmentedSegmentVariants, segmentedTrackVariants } from '@/components/ui/segmented-control';
import { isNavigationHrefActive } from '@/components/layout/navigationActive';
import { useVerificationScopes } from '@/features/verification/useVerificationScopes';

/** Switches between the verification queues the user can open; hidden when only one is available. */
export function VerificationScopeTabs() {
  const pathname = usePathname();
  const scopes = useVerificationScopes();

  if (scopes.length < 2) {
    return null;
  }

  const scopeHrefs = scopes.map((scope) => scope.href);

  return (
    <nav
      aria-label="Kolejki weryfikacji"
      data-testid="verification-scope-tabs"
      className={segmentedTrackVariants({ className: 'self-start' })}
    >
      {scopes.map((scope) => {
        const isActive = isNavigationHrefActive(pathname, scope.href, scopeHrefs);
        return (
          <Link
            key={scope.key}
            href={scope.href}
            aria-current={isActive ? 'page' : undefined}
            data-testid={scope.testId}
            className={segmentedSegmentVariants({ active: isActive, className: 'inline-flex items-center' })}
          >
            {scope.label}
          </Link>
        );
      })}
    </nav>
  );
}
