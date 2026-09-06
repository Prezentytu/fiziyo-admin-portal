import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CrossOrgVerificationDetailPage } from '@/features/verification/CrossOrgVerificationDetailPage';

export const metadata: Metadata = { title: 'Weryfikacja Organizacji' };

export default function Page(props: { params: Promise<{ id: string }> }) {
  return (
    <Suspense>
      <CrossOrgVerificationDetailPage {...props} />
    </Suspense>
  );
}
