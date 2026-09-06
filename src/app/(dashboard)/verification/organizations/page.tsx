import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CrossOrgVerificationPage } from '@/features/verification/CrossOrgVerificationPage';

export const metadata: Metadata = { title: 'Weryfikacja Organizacji' };

export default function Page() {
  return (
    <Suspense>
      <CrossOrgVerificationPage />
    </Suspense>
  );
}
