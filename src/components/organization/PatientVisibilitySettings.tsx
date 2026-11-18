'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Users } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { evictPatientLists } from '@/features/patients/utils/patientCareAccess';
import { SET_THERAPISTS_SEE_ALL_PATIENTS_MUTATION } from '@/graphql/mutations/organizations.mutations';
import { GET_ORGANIZATION_PATIENT_VISIBILITY_QUERY } from '@/graphql/queries/organizations.queries';
import type {
  OrganizationPatientVisibilityQueryData,
  SetTherapistsSeeAllPatientsMutationData,
  SetTherapistsSeeAllPatientsVariables,
} from '@/graphql/types';

interface PatientVisibilitySettingsProps {
  organizationId: string;
  canEdit?: boolean;
}

const SWITCH_ID = 'org-patient-visibility-switch';

/**
 * Reads the setting with its own small query: on a backend without the field only this card is missing,
 * the rest of the organization settings (shared fragment) keeps working.
 */
export function PatientVisibilitySettings({ organizationId, canEdit = false }: PatientVisibilitySettingsProps) {
  const { data } = useQuery<OrganizationPatientVisibilityQueryData>(GET_ORGANIZATION_PATIENT_VISIBILITY_QUERY, {
    variables: { id: organizationId },
    errorPolicy: 'all',
  });
  const therapistsSeeAllPatients = data?.organizationById?.therapistsSeeAllPatients;
  // Value the server confirmed, shown until the organization query catches up with it.
  const [confirmed, setConfirmed] = useState<{ over: boolean; value: boolean } | null>(null);
  const enabled = confirmed && confirmed.over === therapistsSeeAllPatients ? confirmed.value : therapistsSeeAllPatients;

  const [setVisibility, { loading }] = useMutation<
    SetTherapistsSeeAllPatientsMutationData,
    SetTherapistsSeeAllPatientsVariables
  >(SET_THERAPISTS_SEE_ALL_PATIENTS_MUTATION, {
    update: (cache, { data }) => {
      if (data?.setTherapistsSeeAllPatients) evictPatientLists(cache);
    },
  });

  const handleChange = async (next: boolean) => {
    if (!canEdit || loading || typeof therapistsSeeAllPatients !== 'boolean') return;
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
    } catch (error) {
      console.error('Błąd podczas zapisywania widoczności pacjentów:', error);
      toast.error('Nie udało się zapisać ustawienia. Widoczność pacjentów nie zmieniła się.');
    }
  };

  // Unknown (still loading, or the API does not have the field yet): no card, never a switch showing „off”.
  if (typeof enabled !== 'boolean') return null;

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
