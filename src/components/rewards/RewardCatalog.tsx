'use client';

import { useMutation, useQuery } from '@apollo/client/react';
import { Award, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { SectionHeader } from '@/components/shared/page';
import { Button } from '@/components/ui/button';
import {
  CREATE_REWARD_MUTATION,
  ENABLE_REWARD_STARTER_PACK_MUTATION,
  SET_REWARD_STATUS_MUTATION,
} from '@/graphql/mutations/organizationRewards.mutations';
import { GET_REWARD_CATALOG_QUERY } from '@/graphql/queries/organizationRewards.queries';
import type { CabinetReward, RewardTemplate } from '@/graphql/types';
import { RewardTermsEditor } from './RewardTermsEditor';

const catalogMutationOptions = {
  refetchQueries: [GET_REWARD_CATALOG_QUERY],
  awaitRefetchQueries: true,
  onError: (error: Error) => toast.error(error.message),
};

export function RewardCatalog({ canManage }: { canManage: boolean }) {
  const { data, loading, error, refetch } = useQuery(GET_REWARD_CATALOG_QUERY, { fetchPolicy: 'network-only' });
  const [starterPack, starter] = useMutation(ENABLE_REWARD_STARTER_PACK_MUTATION, {
    ...catalogMutationOptions,
    onCompleted: () => toast.success('Zestaw startowy jest gotowy'),
  });
  const [create, creating] = useMutation(CREATE_REWARD_MUTATION, catalogMutationOptions);
  const [setStatus, updating] = useMutation(SET_REWARD_STATUS_MUTATION, catalogMutationOptions);
  if (error)
    return (
      <div role="alert">
        Nie udało się pobrać nagród.{' '}
        <Button variant="plain" onClick={() => void refetch()} data-testid="rewards-retry-catalog">
          Spróbuj ponownie
        </Button>
      </div>
    );
  if (!data) return <p role="status">Wczytywanie nagród…</p>;
  const busy = loading || starter.loading || creating.loading || updating.loading;
  const cards: { reward?: CabinetReward; template?: RewardTemplate }[] = data.organizationRewards.map((reward) => ({
    reward,
    template: data.organizationRewardTemplates.find((template) => template.id === reward.templateId),
  }));
  if (canManage)
    cards.push(
      ...data.organizationRewardTemplates
        .filter((template) => !data.organizationRewards.some((reward) => reward.templateId === template.id))
        .map((template) => ({ template }))
    );
  return (
    <section className="space-y-3">
      <SectionHeader
        title="Nagrody gabinetu"
        action={
          canManage &&
          data.organizationRewardTemplates.some((template) => template.usable) && (
            <Button size="sm" disabled={busy} data-testid="rewards-starter-pack" onClick={() => void starterPack()}>
              {data.organizationRewards.length ? 'Uzupełnij zestaw startowy' : 'Dodaj zestaw startowy'}
            </Button>
          )
        }
      />
      {canManage && data.organizationRewards.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Wybierz nagrody pojedynczo lub dodaj zestaw startowy z odznaką, trzema kopertami i wskazówką.
        </p>
      )}
      {cards.length === 0 && <p className="text-sm text-muted-foreground">Gabinet nie wybrał jeszcze nagród.</p>}
      <div className="grid gap-3 md:grid-cols-2">
        {cards.map(({ reward, template }) => {
          const kind = reward?.kind ?? template?.kind;
          const id = reward?.id ?? template!.id;
          const Icon = kind === 'BADGE' ? Award : Mail;
          const active = reward?.status === 'ACTIVE';
          return (
            <article key={id} data-testid={`rewards-card-${id}`} className="rounded-card bg-surface-card p-5">
              <div className="flex items-start justify-between gap-2">
                <Icon aria-hidden size={21} className="text-tint" />
                <span className="text-sm text-muted-foreground">
                  {active
                    ? 'Aktywna'
                    : reward?.status === 'PAUSED'
                      ? 'Wstrzymana'
                      : reward
                        ? 'Szkic'
                        : template?.usable
                          ? 'Do wyboru'
                          : 'Podgląd'}
                </span>
              </div>
              <h3 className="mt-3 font-semibold">{reward?.title ?? template?.patientTitle}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {reward?.portalDescription ?? template?.portalDescription}
              </p>
              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="text-sm font-medium">
                  {kind === 'BADGE' ? 'Przyznaje fizjoterapeuta' : `${reward?.cost ?? template?.defaultCost} pkt`}
                </span>
                {canManage && (active || template?.usable) && (
                  <Button
                    size="sm"
                    variant={active ? 'outline' : 'tinted'}
                    disabled={busy}
                    data-testid={`rewards-toggle-${id}`}
                    onClick={() =>
                      reward
                        ? void setStatus({ variables: { id: reward.id, status: active ? 'PAUSED' : 'ACTIVE' } })
                        : void create({ variables: { input: { templateId: template!.id, activate: true } } })
                    }
                  >
                    {active ? 'Wstrzymaj' : 'Włącz nagrodę'}
                  </Button>
                )}
              </div>
              {canManage && reward?.kind === 'ENVELOPE' && template?.usable && (
                <RewardTermsEditor reward={reward} template={template} />
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
