'use client';

import { useMutation } from '@apollo/client/react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { UPDATE_REWARD_SETTINGS_MUTATION } from '@/graphql/mutations/organizationRewards.mutations';
import { GET_REWARD_SETTINGS_QUERY } from '@/graphql/queries/organizationRewards.queries';
import type { RewardSettings } from '@/graphql/types';
import { badgeLabel } from './utils/rewardOptions';

export function RewardSettingsPanel({ settings }: { settings: RewardSettings }) {
  const [update, { loading }] = useMutation(UPDATE_REWARD_SETTINGS_MUTATION, {
    refetchQueries: [GET_REWARD_SETTINGS_QUERY],
    awaitRefetchQueries: true,
    onError: (error) => toast.error(error.message),
    onCompleted: () => toast.success('Zapisano ustawienia nagród'),
  });
  const { register, handleSubmit } = useForm({
    defaultValues: { recognitionPoints: settings.recognitionPoints, enabledBadges: settings.enabledBadges },
  });
  return (
    <section className="space-y-3 rounded-card bg-surface-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold" id="reward-switch-label">
            Nagrody dla pacjentów
          </h2>
          <p className="text-sm text-muted-foreground">
            {settings.pausedByFiziyo
              ? 'FiziYo wstrzymało nagrody w tym gabinecie.'
              : settings.rewardsEnabled
                ? 'Pacjenci mogą odbierać aktywne nagrody.'
                : 'Odbieranie nagród jest wyłączone.'}
          </p>
        </div>
        {settings.canManage && (
          <Switch
            checked={settings.rewardsEnabled}
            disabled={loading || settings.pausedByFiziyo}
            aria-labelledby="reward-switch-label"
            data-testid="rewards-enabled-switch"
            onCheckedChange={(rewardsEnabled) => void update({ variables: { input: { rewardsEnabled } } })}
          />
        )}
      </div>
      {settings.canManage && (
        <details className="border-t border-separator pt-3">
          <summary className="cursor-pointer text-sm font-semibold" data-testid="rewards-badge-settings">
            Ustawienia odznak
          </summary>
          <form
            className="mt-4 space-y-4"
            onSubmit={handleSubmit((values) => {
              const result = z
                .object({
                  recognitionPoints: z.number().int().min(0).max(settings.badgePointsMax),
                  enabledBadges: z
                    .array(z.string())
                    .refine((badges) => badges.every((badge) => settings.availableBadges.includes(badge))),
                })
                .safeParse(values);
              if (!result.success) {
                toast.error('Sprawdź punkty i wybrane odznaki.');
                return;
              }
              void update({ variables: { input: result.data } });
            })}
          >
            <label className="block text-sm">
              Punkty za odznakę (0–{settings.badgePointsMax})
              <Input
                className="mt-1 max-w-32"
                type="number"
                min={0}
                max={settings.badgePointsMax}
                required
                data-testid="rewards-badge-points"
                {...register('recognitionPoints', { valueAsNumber: true })}
              />
            </label>
            <fieldset className="flex flex-wrap gap-3">
              <legend className="mb-2 text-sm">Dostępne odznaki</legend>
              {settings.availableBadges.map((key) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    value={key}
                    data-testid={`rewards-badge-setting-${key}`}
                    {...register('enabledBadges')}
                  />
                  {badgeLabel(key)}
                </label>
              ))}
            </fieldset>
            <Button type="submit" size="sm" disabled={loading} data-testid="rewards-save-badge-settings">
              Zapisz ustawienia odznak
            </Button>
          </form>
        </details>
      )}
    </section>
  );
}
