'use client';

import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { AlertTriangle, ArrowRight, User, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { TAKE_OVER_PATIENT_MUTATION } from '@/graphql/mutations/therapists.mutations';
import { GET_ORGANIZATION_PATIENTS_QUERY } from '@/graphql/queries/therapists.queries';
import type { TakeOverPatientResponse } from '@/types/apollo';

interface TherapistInfo {
  id: string;
  fullname?: string;
  email?: string;
  image?: string;
}

interface PatientInfo {
  id: string;
  fullname?: string;
  email?: string;
  image?: string;
}

interface TakeOverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: PatientInfo | null;
  previousTherapist?: TherapistInfo | null;
  organizationId: string;
  onSuccess?: () => void;
}

export function TakeOverDialog({
  open,
  onOpenChange,
  patient,
  previousTherapist,
  organizationId,
  onSuccess,
}: TakeOverDialogProps) {
  const [isConfirming, setIsConfirming] = useState(false);

  const [takeOver, { loading }] = useMutation(TAKE_OVER_PATIENT_MUTATION, {
    refetchQueries: [
      { query: GET_ORGANIZATION_PATIENTS_QUERY, variables: { organizationId, filter: 'all' } },
    ],
  });

  const handleTakeOver = async (confirmed: boolean = false) => {
    if (!patient) return;

    try {
      const { data } = await takeOver({
        variables: {
          patientId: patient.id,
          organizationId,
          confirmed,
        },
      });

      const result = (data as TakeOverPatientResponse)?.takeOverPatient;

      if (result?.requiresConfirmation && !confirmed) {
        // Needs confirmation - show alert
        setIsConfirming(true);
        return;
      }

      if (result?.success) {
        toast.success(result.message || 'Przejęto opiekę nad pacjentem');
        onOpenChange(false);
        setIsConfirming(false);
        onSuccess?.();
      } else {
        toast.error(result?.message || 'Nie udało się przejąć pacjenta');
      }
    } catch (error) {
      console.error('TakeOver error:', error);
      toast.error('Wystąpił błąd podczas przejmowania pacjenta');
    }
  };

  const patientName = patient?.fullname || patient?.email || 'Pacjent';
  const therapistName = previousTherapist?.fullname || previousTherapist?.email || 'poprzedniego fizjoterapeuty';

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

  // Initial takeover dialog (for unassigned patients or first attempt)
  if (!isConfirming) {
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent data-testid="patient-takeover-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Przejmij opiekę
            </AlertDialogTitle>
            <AlertDialogDescription>
              Czy chcesz przejąć opiekę nad pacjentem <strong>{patientName}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          {patient && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-surface border border-border/60">
              <Avatar className="h-10 w-10">
                <AvatarImage src={patient.image} alt={patientName} />
                <AvatarFallback className="bg-primary/20 text-primary">
                  {getInitials(patientName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <span className="font-medium text-foreground block">{patientName}</span>
                {patient.email && (
                  <span className="text-xs text-muted-foreground block">{patient.email}</span>
                )}
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <Button
              onClick={() => handleTakeOver(false)}
              disabled={loading}
              data-testid="patient-takeover-confirm-btn"
            >
              {loading ? 'Przejmowanie...' : 'Przejmij opiekę'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  // Confirmation dialog (when patient has existing therapist)
  return (
    <AlertDialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setIsConfirming(false); }}>
      <AlertDialogContent data-testid="patient-takeover-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-warning">
            <AlertTriangle className="h-5 w-5" />
            Uwaga - Pacjent ma już fizjoterapeutę
          </AlertDialogTitle>
          <AlertDialogDescription>
            Pacjent <strong>{patientName}</strong> jest obecnie pod opieką{' '}
            <strong>{therapistName}</strong>.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Transfer visualization */}
        <div className="flex items-center justify-center gap-4 p-4 rounded-lg bg-surface border border-border/60">
          {previousTherapist && (
            <div className="flex flex-col items-center gap-1">
              <Avatar className="h-12 w-12 ring-2 ring-destructive/30">
                <AvatarImage src={previousTherapist.image} alt={therapistName} />
                <AvatarFallback className="bg-muted text-muted-foreground">
                  {getInitials(therapistName)}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground truncate max-w-[80px]">
                {therapistName}
              </span>
            </div>
          )}

          <ArrowRight className="h-6 w-6 text-muted-foreground" />

          <div className="flex flex-col items-center gap-1">
            <Avatar className="h-12 w-12 ring-2 ring-primary/50">
              <AvatarFallback className="bg-primary text-primary-foreground">
                <User className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-primary font-medium">Ty</span>
          </div>
        </div>

        <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
          <span className="text-sm text-warning-foreground">
            Po przejęciu opieki, poprzedni fizjoterapeuta straci dostęp do tego pacjenta.
          </span>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setIsConfirming(false)}>Anuluj</AlertDialogCancel>
          <Button
            variant="default"
            onClick={() => handleTakeOver(true)}
            disabled={loading}
            data-testid="patient-takeover-confirm-btn"
          >
            {loading ? 'Przejmowanie...' : 'Tak, przejmij opiekę'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
