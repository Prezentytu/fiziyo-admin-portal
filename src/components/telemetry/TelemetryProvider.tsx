'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { initTelemetry, trackPageView } from '@/lib/telemetry/client';

initTelemetry();

/** Sends one sanitized page view per route change; renders nothing. */
export function TelemetryPageViews() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname) {
      trackPageView(pathname);
    }
  }, [pathname]);

  return null;
}
