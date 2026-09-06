import type { Metadata } from 'next';
import { DashboardHomePage } from '@/features/dashboard/DashboardHomePage';

export const metadata: Metadata = { title: 'Pulpit' };

export default function Page() {
  return <DashboardHomePage />;
}
