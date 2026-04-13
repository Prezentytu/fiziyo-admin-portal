'use client';

import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { ClerkProvider } from '@clerk/nextjs';

interface ClerkProviderWithRedirectsProps {
  children: ReactNode;
  productionAppUrl: string;
  developmentAppUrl: string;
  allowPreviewRedirects: boolean;
}

export function ClerkProviderWithRedirects({
  children,
  productionAppUrl,
  developmentAppUrl,
  allowPreviewRedirects,
}: Readonly<ClerkProviderWithRedirectsProps>) {
  const allowedRedirectOrigins = useMemo<(string | RegExp)[]>(() => {
    const origins: (string | RegExp)[] = [productionAppUrl, developmentAppUrl];

    if (allowPreviewRedirects) {
      origins.push(/^https:\/\/.*\.vercel\.app$/);
    }

    return origins;
  }, [allowPreviewRedirects, developmentAppUrl, productionAppUrl]);

  return <ClerkProvider allowedRedirectOrigins={allowedRedirectOrigins}>{children}</ClerkProvider>;
}
