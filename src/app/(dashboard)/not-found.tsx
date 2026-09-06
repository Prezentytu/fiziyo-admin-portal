import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PageShell } from '@/components/shared/page/PageShell';
import { PageHeader } from '@/components/shared/page/PageHeader';

export default function DashboardNotFound() {
  return (
    <PageShell>
      <PageHeader title="Nie znaleziono strony" description="Ten adres nie istnieje albo został przeniesiony." />
      <Button asChild data-testid="dashboard-not-found-home-btn">
        <Link href="/">Wróć do panelu</Link>
      </Button>
    </PageShell>
  );
}
