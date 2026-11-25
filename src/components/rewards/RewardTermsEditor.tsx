'use client';

import { useMutation } from '@apollo/client/react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { UPDATE_REWARD_TERMS_MUTATION } from '@/graphql/mutations/organizationRewards.mutations';
import { GET_REWARD_CATALOG_QUERY } from '@/graphql/queries/organizationRewards.queries';
import type { CabinetReward, RewardTemplate } from '@/graphql/types';

export function RewardTermsEditor({ reward, template }: { reward: CabinetReward; template: RewardTemplate }) {
  const { register, control, handleSubmit } = useForm({
    defaultValues: {
      cost: reward.cost,
      frequency: reward.frequency,
      frequencyDays: reward.frequencyDays ?? 7,
      monthlyCap: reward.monthlyCap?.toString() ?? '',
    },
  });
  const [update, { loading }] = useMutation(UPDATE_REWARD_TERMS_MUTATION, {
    refetchQueries: [GET_REWARD_CATALOG_QUERY],
    awaitRefetchQueries: true,
    onError: (error) => toast.error(error.message),
    onCompleted: () => toast.success('Zapisano zasady odbioru'),
  });
  const frequency = useWatch({ control, name: 'frequency' });
  return (
    <details className="mt-3 border-t border-separator pt-3">
      <summary className="cursor-pointer text-sm font-semibold" data-testid={`rewards-edit-${reward.id}`}>
        Cena i zasady odbioru
      </summary>
      <form
        className="mt-3 grid gap-3 text-sm"
        onSubmit={handleSubmit((values) => {
          const result = z
            .object({
              cost: z.number().int().min(template.minCost).max(template.maxCost),
              frequency: z.enum(['ONCE_PER_PATIENT', 'EVERY_N_DAYS']),
              frequencyDays: z.number().int().min(1).max(365).nullable(),
              monthlyCap: z.number().int().min(1).max(1000).nullable(),
            })
            .safeParse({
              ...values,
              frequencyDays: values.frequency === 'EVERY_N_DAYS' ? values.frequencyDays : null,
              monthlyCap: values.monthlyCap === '' ? null : Number(values.monthlyCap),
            });
          if (!result.success) {
            toast.error('Sprawdź cenę, odstęp i limit.');
            return;
          }
          void update({ variables: { input: { id: reward.id, ...result.data } } });
        })}
      >
        <label>
          Cena w punktach ({template.minCost}–{template.maxCost})
          <Input
            type="number"
            required
            min={template.minCost}
            max={template.maxCost}
            data-testid={`rewards-cost-${reward.id}`}
            {...register('cost', { valueAsNumber: true })}
          />
        </label>
        <label>
          Częstość odbioru
          <select
            className="block w-full rounded-md border border-input bg-background p-2"
            data-testid={`rewards-frequency-${reward.id}`}
            {...register('frequency')}
          >
            <option value="ONCE_PER_PATIENT">Raz na pacjenta</option>
            <option value="EVERY_N_DAYS">Co określoną liczbę dni</option>
          </select>
        </label>
        {frequency === 'EVERY_N_DAYS' && (
          <label>
            Odstęp w dniach
            <Input
              type="number"
              min={1}
              max={365}
              required
              data-testid={`rewards-interval-${reward.id}`}
              {...register('frequencyDays', { valueAsNumber: true })}
            />
          </label>
        )}
        <label>
          Limit odbiorów w miesiącu
          <Input
            type="number"
            min={1}
            max={1000}
            placeholder="Bez limitu"
            data-testid={`rewards-monthly-cap-${reward.id}`}
            {...register('monthlyCap')}
          />
        </label>
        <Button type="submit" size="sm" disabled={loading} data-testid={`rewards-save-terms-${reward.id}`}>
          Zapisz zasady
        </Button>
      </form>
    </details>
  );
}
