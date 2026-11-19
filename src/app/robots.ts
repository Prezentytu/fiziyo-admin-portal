import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { robotsFor } from '@/lib/seo/indexing';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const requestHeaders = await headers();
  return robotsFor(requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host'));
}
