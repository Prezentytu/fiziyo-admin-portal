import type { Metadata } from 'next';
import { OrganizationPage } from '@/components/organization/OrganizationPage';

export const metadata: Metadata = { title: 'Organizacja' };

export default function Page() {
  return <OrganizationPage />;
}
