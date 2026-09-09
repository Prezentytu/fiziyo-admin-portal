import { NextRequest } from 'next/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@clerk/nextjs/server', async (importOriginal) => {
  const original = await importOriginal<typeof import('@clerk/nextjs/server')>();
  return { ...original, clerkMiddleware: (callback: unknown) => callback };
});

import proxy from '../../../proxy';

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
});