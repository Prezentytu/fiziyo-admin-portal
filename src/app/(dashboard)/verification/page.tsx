import type { Metadata } from 'next';
import { Suspense } from 'react';
import { VerificationPage } from '@/features/verification/VerificationPage';

export const metadata: Metadata = { title: 'Centrum Weryfikacji' };

export default function Page() {
  return (
    <Suspense>
      <VerificationPage />
    </Suspense>
  );
}
