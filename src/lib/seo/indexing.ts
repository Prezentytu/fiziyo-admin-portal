import type { MetadataRoute } from 'next';

/**
 * What search engines and AI crawlers may see of the portal.
 *
 * The panel is behind sign-in and holds clinic and patient data, so nothing of it
 * belongs in a search index or an AI answer. Only the production sign-in and
 * registration pages may be indexed, so "FiziYo logowanie" leads to the right
 * place. DEV and preview deployments are never indexed, not even those pages.
 */
export const PRODUCTION_HOST = 'portal.fiziyo.pl';
export const INDEXABLE_PATHS = ['/sign-in', '/register'] as const;

const NOINDEX = { key: 'X-Robots-Tag', value: 'noindex, nofollow' };

export const isProductionHost = (host: string | null | undefined): boolean =>
  (host ?? '').split(':')[0].toLowerCase() === PRODUCTION_HOST;

export const robotsFor = (host: string | null | undefined): MetadataRoute.Robots => {
  if (!isProductionHost(host)) {
    return { rules: { userAgent: '*', disallow: '/' } };
  }
  return {
    rules: { userAgent: '*', allow: [...INDEXABLE_PATHS], disallow: '/' },
  };
};

/** Header rules for next.config `headers()`. */
export const buildIndexingHeaders = () => {
  const indexable = INDEXABLE_PATHS.map((path) => path.slice(1)).join('|');
  return [
    {
      // Everything except the indexable pages and robots.txt itself, on every host.
      source: `/((?!(?:${indexable})(?:/|$)|robots\\.txt$).*)`,
      headers: [NOINDEX],
    },
    {
      // The indexable pages too, anywhere but production.
      source: `/:page(${indexable})/:rest*`,
      missing: [{ type: 'host' as const, value: PRODUCTION_HOST }],
      headers: [NOINDEX],
    },
  ];
};
