import type { Metadata } from 'next';
import { Suspense } from 'react';
import { OrganizationVerificationPage } from '@/features/verification/OrganizationVerificationPage';

export const metadata: Metadata = { title: 'Weryfikacja organizacji' };

export default function Page() {
  return (
    <Suspense>
      <OrganizationVerificationPage />
    </Suspense>
  );
}
