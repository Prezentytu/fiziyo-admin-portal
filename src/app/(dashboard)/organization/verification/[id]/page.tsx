import type { Metadata } from 'next';
import { Suspense } from 'react';
import { OrganizationVerificationDetailPage } from '@/features/verification/OrganizationVerificationDetailPage';

export const metadata: Metadata = { title: 'Weryfikacja organizacji' };

export default function Page(props: { params: Promise<{ id: string }> }) {
  return (
    <Suspense>
      <OrganizationVerificationDetailPage {...props} />
    </Suspense>
  );
}
