'use client';

import { useMutation, useQuery } from '@apollo/client/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { SectionHeader } from '@/components/shared/page';
import { GET_PATIENT_REWARDS_QUERY } from '@/graphql/queries/organizationRewards.queries';
import { AWARD_RECOGNITION_BADGE_MUTATION } from '@/graphql/mutations/organizationRewards.mutations';
import { badgeLabel, rewardDate } from './utils/rewardOptions';
import { useRewardAccess } from './useRewardAccess';
import { EnvelopeCard } from './RewardEnvelopes';

function PatientRewards({ patientId, organizationId }: { patientId: string; organizationId: string }) {
  const { data, error, refetch } = useQuery(GET_PATIENT_REWARDS_QUERY, {
    variables: { patientId },
    fetchPolicy: 'network-only',
  });
  const [award, { loading }] = useMutation(AWARD_RECOGNITION_BADGE_MUTATION, {
    refetchQueries: [GET_PATIENT_REWARDS_QUERY],
    awaitRefetchQueries: true,
    onError: (error) => {
      toast.error(error.message);
      void refetch();
    },
    onCompleted: () => toast.success('Przyznano odznakę'),
  });
  if (error)
    return (
      <p role="alert">
        Nie udało się pobrać nagród pacjenta.{' '}
        <Button variant="plain" data-testid="rewards-retry-patient" onClick={() => void refetch()}>
          Ponów
        </Button>
      </p>
    );
  const rewards = data?.patientOrganizationRewards;
  if (!rewards || (!rewards.rewardsEnabled && !rewards.envelopes.length && !rewards.badges.length)) return null;
  return (
    <section className="space-y-3 border-t border-separator pt-5" data-testid="patient-rewards-panel">
      <SectionHeader title="Nagrody gabinetu" />
      <p>{rewards.balance} pkt do wykorzystania w gabinecie</p>
      {rewards.enabledBadges.length > 0 && (
        <fieldset className="flex flex-wrap gap-2">
          <legend className="mb-2 text-sm">Przyznaj odznakę · {rewards.badgePoints} pkt</legend>
          {rewards.enabledBadges.map((badgeKey) => (
            <Button
              key={badgeKey}
              variant="tinted"
              size="sm"
              disabled={loading || !rewards.canAwardBadge}
              onClick={() => void award({ variables: { patientId, badgeKey } })}
              data-testid={`rewards-award-${badgeKey}`}
            >
              {badgeLabel(badgeKey)}
            </Button>
          ))}
        </fieldset>
      )}
      {rewards.nextBadgeAt && (
        <p className="text-sm text-muted-foreground">Następna odznaka od {rewardDate(rewards.nextBadgeAt)}.</p>
      )}
      {rewards.badges.length > 0 && (
        <ul className="space-y-1 text-sm">
          {rewards.badges.map((badge) => (
            <li key={badge.id}>
              <strong>{badgeLabel(badge.badgeKey)}</strong> · {badge.awardedByName} · {rewardDate(badge.awardedAt)} ·{' '}
              {badge.points} pkt
            </li>
          ))}
        </ul>
      )}
      {rewards.envelopes.map((envelope) => (
        <EnvelopeCard key={envelope.id} envelope={envelope} organizationId={organizationId} />
      ))}
    </section>
  );
}

export function PatientRewardPanel({ patientId }: { patientId: string }) {
  const { settings, organizationId } = useRewardAccess();
  return settings && organizationId ? (
    <PatientRewards key={`${organizationId}/${patientId}`} patientId={patientId} organizationId={organizationId} />
  ) : null;
}
