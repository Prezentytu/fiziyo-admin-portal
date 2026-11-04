'use client';

import { useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { initTelemetry, setTelemetryUser, trackPageView } from '@/lib/telemetry/client';

initTelemetry();

/**
 * Sends one sanitized page view per route change and unbinds the person on any sign-out path,
 * not only the one in `useAppSignOut`. Renders nothing.
 */
export function TelemetryPageViews() {
  const pathname = usePathname();
  const { isSignedIn } = useAuth();

  useEffect(() => {
    if (isSignedIn === false) {
      setTelemetryUser(null);
    }
  }, [isSignedIn]);

  useEffect(() => {
    if (pathname) {
      trackPageView(pathname);
    }
  }, [pathname]);

  return null;
}
