'use client';

import { use } from 'react';

import { SupportThreadPage } from '@/features/support/SupportThreadPage';

export default function SupportThreadRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <SupportThreadPage threadId={decodeURIComponent(id)} />;
}
