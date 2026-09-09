type HeaderRule = { source: string; headers: { key: string; value: string }[] };

export function buildReleaseHeaders(env: Record<string, string | undefined>): HeaderRule[] {
  const sha = env.VERCEL_GIT_COMMIT_SHA;
  const deploymentId = env.VERCEL_DEPLOYMENT_ID;
  if (!sha && !deploymentId) return [];

  if (
    !sha || !/^[0-9a-f]{40}$/.test(sha) ||
    !deploymentId || !/^dpl_[A-Za-z0-9]{8,80}$/.test(deploymentId) ||
    env.VERCEL_GIT_REPO_OWNER !== 'Prezentytu' ||
    env.VERCEL_GIT_REPO_SLUG !== 'fiziyo-admin-portal'
  ) {
    throw new Error('Invalid admin build identity');
  }

  let apiOrigin: string;
  try {
    const apiUrl = new URL(env.NEXT_PUBLIC_API_URL ?? '');
    if (apiUrl.username || apiUrl.password || apiUrl.search || apiUrl.hash) throw new Error();
    apiOrigin = apiUrl.origin;
  } catch {
    throw new Error('Invalid admin API build target');
  }
  if (!['https://fizjo-app-api.azurewebsites.net', 'https://fiziyo-prod.azurewebsites.net'].includes(apiOrigin)) {
    throw new Error('Admin API build target is not allowlisted');
  }

  return [{
    source: '/sign-in/:path*',
    headers: [
      { key: 'x-fiziyo-release-schema', value: '1' },
      { key: 'x-fiziyo-admin-sha', value: sha },
      { key: 'x-fiziyo-deployment-id', value: deploymentId },
      { key: 'x-fiziyo-api-origin', value: apiOrigin },
      { key: 'Cache-Control', value: 'private, no-store' },
    ],
  }];
}