import { describe, expect, it } from 'vitest';
import { buildReleaseHeaders } from './build-identity';

const identity = {
  VERCEL_GIT_COMMIT_SHA: 'a'.repeat(40),
  VERCEL_DEPLOYMENT_ID: 'dpl_abcdefgh12345678',
  VERCEL_GIT_REPO_OWNER: 'Prezentytu',
  VERCEL_GIT_REPO_SLUG: 'fiziyo-admin-portal',
  NEXT_PUBLIC_API_URL: 'https://fizjo-app-api.azurewebsites.net',
};

describe('admin build identity', () => {
  it('publishes only build-bound allowlisted metadata on the existing public sign-in route', () => {
    expect(buildReleaseHeaders({ ...identity, SECRET: 'not-public' })).toEqual([{
      source: '/sign-in/:path*', headers: [
        { key: 'x-fiziyo-release-schema', value: '1' },
        { key: 'x-fiziyo-admin-sha', value: identity.VERCEL_GIT_COMMIT_SHA },
        { key: 'x-fiziyo-deployment-id', value: identity.VERCEL_DEPLOYMENT_ID },
        { key: 'x-fiziyo-api-origin', value: identity.NEXT_PUBLIC_API_URL },
        { key: 'Cache-Control', value: 'private, no-store' },
      ],
    }]);
  });
  it('does not invent identity for a local build', () => expect(buildReleaseHeaders({})).toEqual([]));
  it.each([
    { VERCEL_GIT_COMMIT_SHA: '' }, { VERCEL_GIT_COMMIT_SHA: 'main' },
    { VERCEL_DEPLOYMENT_ID: '' }, { VERCEL_DEPLOYMENT_ID: 'dpl_value\r\ninjected: yes' },
    { VERCEL_GIT_REPO_OWNER: 'other' }, { VERCEL_GIT_REPO_SLUG: 'other' },
    { NEXT_PUBLIC_API_URL: '' }, { NEXT_PUBLIC_API_URL: 'https://attacker.example' },
    { NEXT_PUBLIC_API_URL: 'https://secret@fizjo-app-api.azurewebsites.net' },
  ])('rejects incomplete or untrusted build inputs %j', (overrides) => {
    expect(() => buildReleaseHeaders({ ...identity, ...overrides })).toThrow();
  });
});