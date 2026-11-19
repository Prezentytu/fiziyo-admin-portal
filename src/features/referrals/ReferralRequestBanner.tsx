'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useQuery } from '@apollo/client/react';
import { UserCheck, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useMeFeature } from '@/hooks/useMeFeature';
import { GET_MY_REFERRAL_REQUESTS_QUERY } from '@/graphql/queries/referrals.queries';
import type { GetMyReferralRequestsResponse, ReferralRequest } from '@/graphql/types';
import {
  markReferralBannerSeen,
  REFERRALS_FEATURE_FLAG,
  REFERRALS_SETTINGS_HREF,
  referralRequestForBanner,
} from './utils/referrals';

/** Jednorazowy pasek po zalogowaniu, gdy inny fizjo prosi o potwierdzenie polecenia (SPEC-054 §2). */
export function ReferralRequestBanner() {
  const enabled = useMeFeature(REFERRALS_FEATURE_FLAG);
  if (!enabled) return null;
  return <ReferralRequestBannerInner />;
}

function ReferralRequestBannerInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data } = useQuery<GetMyReferralRequestsResponse>(GET_MY_REFERRAL_REQUESTS_QUERY, {
    fetchPolicy: 'cache-first',
    errorPolicy: 'all',
  });
  const [request, setRequest] = useState<ReferralRequest | null>(null);
  const settingsTab = searchParams.get('tab');

  // Pick once per load and mark it seen right away: the banner is one-off even if it is not closed.
  useEffect(() => {
    if (request) return;
    const next = referralRequestForBanner(data?.myReferralRequests, { pathname, settingsTab });
    if (next) {
      markReferralBannerSeen(next.id);
      setRequest(next);
    }
  }, [data, pathname, settingsTab, request]);

  const stillWaiting = request && data?.myReferralRequests.some((item) => item.id === request.id);
  if (!request || !stillWaiting || (pathname === '/settings' && settingsTab === 'referrals')) {
    return null;
  }

  return (
    <div
      role="status"
      className="mb-4 flex shrink-0 flex-wrap items-center gap-3 rounded-card border border-tint/30 bg-tint-muted px-4 py-3 sm:flex-nowrap"
      data-testid="referral-request-banner"
    >
      <UserCheck className="h-5 w-5 shrink-0 text-tint" aria-hidden="true" />
      <p className="min-w-0 flex-1 truncate text-[15px] font-semibold text-foreground">
        {request.referrerName} prosi o potwierdzenie polecenia FiziYo
      </p>
      <div className="flex shrink-0 items-center gap-1">
        <Button asChild size="sm" data-testid="referral-request-banner-open">
          <Link href={REFERRALS_SETTINGS_HREF}>Zobacz prośbę</Link>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Zamknij"
          onClick={() => setRequest(null)}
          data-testid="referral-request-banner-close"
        >
          <X aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
