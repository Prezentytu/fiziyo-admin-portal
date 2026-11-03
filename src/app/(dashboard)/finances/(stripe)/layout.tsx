import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';

import { isFeatureEnabled } from '@/lib/featureFlags';

/** Clinic earnings and payouts run on Stripe Connect; without it the clinic only sees what it owes FiziYo. */
export default function StripeFinancesLayout({ children }: Readonly<{ children: ReactNode }>) {
  if (!isFeatureEnabled('STRIPE_CONNECT_ROLLOUT')) {
    redirect('/finances');
  }

  return children;
}
