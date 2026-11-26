'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Users } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useMeFeature } from '@/hooks/useMeFeature';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import { GET_EXERCISE_SET_STARTER_QUERY } from '@/graphql/queries/exerciseSets.queries';
import { SET_STARTER_EXERCISE_SET_MUTATION } from '@/graphql/mutations/starterSets.mutations';
import {
  STARTER_SET_FEATURE_FLAG,
  starterSetErrorMessage,
  starterSetToastMessage,
  type StarterSetToggleResult,
} from '../utils/starterSet';

interface StarterSetToggleProps {
  readonly exerciseSetId: string;
}

interface StarterQueryData {
  exerciseSetById: { id: string; isStarterSet: boolean } | null;
}

interface StarterMutationData {
  setStarterExerciseSet: StarterSetToggleResult;
}

/**
 * SPEC-064 (fizjo-app): przełącznik „Dla wszystkich pacjentów” na karcie szablonu. Każdy pacjent gabinetu, także
 * nowy, dostaje zestaw automatycznie, a zmiany w szablonie trafiają do wszystkich. Widoczny tylko przy fladze konta
 * `starterSet`; zmienia owner albo admin (backend sprawdza to sam).
 */
export function StarterSetToggle({ exerciseSetId }: StarterSetToggleProps) {
  const featureEnabled = useMeFeature(STARTER_SET_FEATURE_FLAG);
  const { canManageOrganization } = useRoleAccess();
  const [pending, setPending] = useState<boolean | null>(null);

  const { data } = useQuery<StarterQueryData>(GET_EXERCISE_SET_STARTER_QUERY, {
    variables: { exerciseSetId },
    skip: !featureEnabled,
    errorPolicy: 'all',
  });
  const [setStarter, { loading }] = useMutation<StarterMutationData>(SET_STARTER_EXERCISE_SET_MUTATION, {
    // Karta zestawu przelicza też kafelek „pacjentów” (activeAssignmentCount).
    refetchQueries: [{ query: GET_EXERCISE_SET_STARTER_QUERY, variables: { exerciseSetId } }, 'GetExerciseSetWithAssignments'],
    awaitRefetchQueries: true,
  });

  const isStarterSet = data?.exerciseSetById?.isStarterSet;
  if (!featureEnabled || isStarterSet === undefined) return null;

  const confirm = () => {
    if (pending === null) return;
    setStarter({ variables: { exerciseSetId, enabled: pending } })
      .then(({ data: result }) => {
        if (result) toast.success(starterSetToastMessage(result.setStarterExerciseSet));
      })
      .catch((error: unknown) => {
        console.error('Błąd zmiany zestawu na start:', error);
        toast.error(starterSetErrorMessage(error));
      });
  };

  return (
    <div
      className="flex items-center gap-3.5 rounded-[18px] bg-grouped-tertiary px-[18px] py-3.5"
      data-testid="set-detail-starter"
    >
      <Users className="h-5 w-5 shrink-0 text-label-secondary" aria-hidden="true" />
      <label htmlFor="set-detail-starter-switch" className="flex flex-1 flex-col">
        <span className="text-[15px] font-semibold text-foreground">Dla wszystkich pacjentów</span>
        <span className="text-[13px] text-label-secondary">
          {canManageOrganization
            ? 'Każdy pacjent gabinetu, także nowy, dostaje ten zestaw automatycznie. Zmiany w zestawie trafiają do wszystkich.'
            : 'Zmienia to właściciel albo administrator gabinetu.'}
        </span>
      </label>
      <Switch
        id="set-detail-starter-switch"
        checked={isStarterSet}
        disabled={!canManageOrganization || loading}
        onCheckedChange={setPending}
        data-testid="set-detail-starter-switch"
      />
      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => !open && setPending(null)}
        title={pending ? 'Przypisać zestaw wszystkim pacjentom?' : 'Wyłączyć zestaw dla wszystkich?'}
        description={
          pending
            ? 'Zestaw trafi teraz do każdego pacjenta gabinetu z harmonogramem szablonu, a nowi pacjenci dostaną go po dołączeniu. Pacjenci, którzy mają go już przypisany ręcznie, nie dostaną drugiej kopii.'
            : 'Automatyczne przypisania tego zestawu zakończą się, a historia ćwiczeń zostanie. Przypisania zrobione ręcznie zostają bez zmian.'
        }
        confirmText={pending ? 'Przypisz wszystkim' : 'Wyłącz'}
        onConfirm={confirm}
      />
    </div>
  );
}
