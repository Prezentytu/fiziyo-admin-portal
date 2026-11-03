import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';

import { isFeatureEnabled } from '@/lib/featureFlags';

export default function FinancesLayout({ children }: Readonly<{ children: ReactNode }>) {
  if (!isFeatureEnabled('FINANCES_MODULE')) {
    redirect('/');
  }

  return children;
}
