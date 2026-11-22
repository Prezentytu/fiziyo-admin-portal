import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server';
import { NextRequest } from 'next/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@clerk/nextjs/server', async (importOriginal) => {
  const original = await importOriginal<typeof import('@clerk/nextjs/server')>();
  return { ...original, clerkMiddleware: (callback: unknown) => callback };
});

import proxy, { config } from '../../../proxy';

const policy = proxy as unknown as (
  auth: { protect: () => Promise<void> },
  request: NextRequest,
) => Promise<void>;

describe('proxy policy with real Clerk route matcher', () => {
  it.each(['/login', '/sign-in', '/sign-up', '/privacy', '/support'])(
    'preserves public route %s', async (route) => {
      const protect = vi.fn(async () => undefined);
      await policy({ protect }, new NextRequest(`https://portal.fiziyo.pl${route}`));
      expect(protect).not.toHaveBeenCalled();
    },
  );
  it.each(['/patients', '/organization', '/api/exercise-reports', '/api/pdf/image-proxy', '/patients?next=/login'])(
    'requires authentication for %s', async (route) => {
      const protect = vi.fn(async () => undefined);
      await policy({ protect }, new NextRequest(`https://portal.fiziyo.pl${route}`));
      expect(protect).toHaveBeenCalledOnce();
    },
  );
  it('does not swallow authentication denial', async () => {
    const protect = vi.fn(async () => { throw new Error('Denied'); });
    await expect(policy({ protect }, new NextRequest('https://portal.fiziyo.pl/patients'))).rejects.toThrow('Denied');
  });

  // The dot before the extension must be literal; otherwise a path ending in "ico" or "zip" skips Clerk.
  it.each(['/patients', '/patients/abcico', '/exercises/plan-css', '/settings/zip', '/organizationpng', '/api/feedback'])(
    'runs proxy for app route %s', (url) => {
      expect(unstable_doesMiddlewareMatch({ config, url })).toBe(true);
    },
  );
  it.each(['/favicon.ico', '/_next/static/chunk.js', '/fonts/inter.woff2'])(
    'skips static asset %s', (url) => {
      expect(unstable_doesMiddlewareMatch({ config, url })).toBe(false);
    },
  );
});
