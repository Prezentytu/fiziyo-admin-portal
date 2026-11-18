'use client';

import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Users } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { evictPatientLists } from '@/features/patients/utils/patientCareAccess';
import { SET_THERAPISTS_SEE_ALL_PATIENTS_MUTATION } from '@/graphql/mutations/organizations.mutations';
import type { SetTherapistsSeeAllPatientsMutationData, SetTherapistsSeeAllPatientsVariables } from '@/graphql/types';

interface PatientVisibilitySettingsProps {
  organizationId: string;
  therapistsSeeAllPatients?: boolean;
  canEdit?: boolean;
  onSuccess?: () => void;
}

const SWITCH_ID = 'org-patient-visibility-switch';

export function PatientVisibilitySettings({
  organizationId,
  therapistsSeeAllPatients = false,
  canEdit = false,
  onSuccess,
}: PatientVisibilitySettingsProps) {
  // Value the server confirmed, shown until the organization query catches up with it.
  const [confirmed, setConfirmed] = useState<{ over: boolean; value: boolean } | null>(null);
  const enabled = confirmed?.over === therapistsSeeAllPatients ? confirmed.value : therapistsSeeAllPatients;

  const [setVisibility, { loading }] = useMutation<
    SetTherapistsSeeAllPatientsMutationData,
    SetTherapistsSeeAllPatientsVariables
  >(SET_THERAPISTS_SEE_ALL_PATIENTS_MUTATION, {
    update: (cache, { data }) => {
      if (data?.setTherapistsSeeAllPatients) evictPatientLists(cache);
    },
  });

  const handleChange = async (next: boolean) => {
    if (!canEdit || loading) return;
    try {
      const result = await setVisibility({ variables: { organizationId, enabled: next } });
      const saved = result.data?.setTherapistsSeeAllPatients;
      // Saved only when the server answers with the value; a response without `data` is not a save.
      if (saved?.therapistsSeeAllPatients !== next) throw result.error ?? new Error('Brak potwierdzenia zapisu');
      setConfirmed({ over: therapistsSeeAllPatients, value: next });
      toast.success(
        next
          ? 'Fizjoterapeuci widzą teraz wszystkich pacjentów gabinetu'
          : 'Fizjoterapeuci widzą teraz tylko pacjentów pod swoją opieką'
      );
      onSuccess?.();
    } catch (error) {
      console.error('Błąd podczas zapisywania widoczności pacjentów:', error);
      toast.error('Nie udało się zapisać ustawienia. Widoczność pacjentów nie zmieniła się.');
    }
  };

  return (
    <Card data-testid="org-patient-visibility-card">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Users className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div>
            <CardTitle className="text-lg font-semibold tracking-tight">Widoczność pacjentów</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Kto w gabinecie widzi pacjentów, ich plany i wykonania
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <Label htmlFor={SWITCH_ID} className="text-[15px] font-medium text-foreground">
              Fizjoterapeuci widzą wszystkich pacjentów gabinetu
            </Label>
            <p
              id={`${SWITCH_ID}-description`}
              className="text-sm leading-relaxed text-muted-foreground"
              data-testid="org-patient-visibility-description"
            >
              {enabled
                ? 'Każdy fizjoterapeuta i personel widzi listę, plany i wykonania wszystkich pacjentów i może przypisać ich sobie.'
                : 'Fizjoterapeuci i personel widzą tylko pacjentów pod swoją opieką. Pacjentów przypisuje właściciel albo administrator.'}{' '}
              Właściciel i administrator zawsze widzą wszystkich.
            </p>
          </div>
          <Switch
            id={SWITCH_ID}
            checked={enabled}
            disabled={!canEdit || loading}
            aria-busy={loading}
            aria-describedby={`${SWITCH_ID}-description`}
            onCheckedChange={(checked) => void handleChange(checked)}
            data-testid={SWITCH_ID}
          />
        </div>
        {!canEdit && (
          <p className="text-xs text-muted-foreground" data-testid="org-patient-visibility-readonly-note">
            To ustawienie zmienia właściciel albo administrator gabinetu.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
