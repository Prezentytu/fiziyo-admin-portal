'use client';

import { PageHeader, PageSheet } from '@/components/shared/page';
import { Button } from '@/components/ui/button';
import { RewardCatalog } from '@/components/rewards/RewardCatalog';
import { RewardSettingsPanel } from '@/components/rewards/RewardSettingsPanel';
import { RewardQueue } from '@/components/rewards/RewardEnvelopes';
import { useRewardAccess } from '@/components/rewards/useRewardAccess';

export default function RewardsPage() {
  const { organizationId, settings, loading, error, refetch } = useRewardAccess();
  return (
    <PageSheet data-testid="rewards-page">
      <PageHeader title="Nagrody" subtitle="Punkty zdrowia i nagrody w Twoim gabinecie" />
      {loading ? (
        <p role="status">Wczytywanie ustawień…</p>
      ) : error ? (
        <p role="alert">
          Nie udało się pobrać ustawień nagród.
          <Button variant="plain" data-testid="rewards-retry-settings" onClick={() => void refetch()}>
            Spróbuj ponownie
          </Button>
        </p>
      ) : settings && organizationId ? (
        <div className="grid gap-7" key={organizationId}>
          <RewardSettingsPanel settings={settings} />
          <RewardQueue organizationId={organizationId} />
          <RewardCatalog canManage={settings.canManage} />
        </div>
      ) : (
        <p>Nagrody są niedostępne w tym gabinecie.</p>
      )}
    </PageSheet>
  );
}
