'use client';

import { Suspense } from 'react';

import { SupportInboxPage } from '@/features/support/SupportInboxPage';

export default function SupportPage() {
  return (
    <Suspense fallback={null}>
      <SupportInboxPage />
    </Suspense>
  );
}
