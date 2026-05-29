'use client';

import { Logo } from '@/components/shared/Logo';

interface BlockedLayoutProps {
  children: React.ReactNode;
}

export default function BlockedLayout({ children }: BlockedLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-6 py-8">
        <div className="mb-8">
          <Logo variant="default" size="lg" />
        </div>
        <div className="flex flex-1 items-center justify-center">{children}</div>
      </div>
    </div>
  );
}
