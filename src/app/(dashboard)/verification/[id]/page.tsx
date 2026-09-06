import type { Metadata } from 'next';
import { Suspense } from 'react';
import { VerificationDetailPage } from '@/features/verification/VerificationDetailPage';

export const metadata: Metadata = { title: 'Weryfikacja' };

export default function Page(props: { params: Promise<{ id: string }> }) {
  return (
    <Suspense>
      <VerificationDetailPage {...props} />
    </Suspense>
  );
}
