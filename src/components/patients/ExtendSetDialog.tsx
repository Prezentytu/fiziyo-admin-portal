'use client';

import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { CalendarPlus, Loader2, Edit3, Clock } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { pl } from 'date-fns/locale';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { ASSIGN_EXERCISE_SET_TO_PATIENT_MUTATION } from '@/graphql/mutations/exercises.mutations';
import { GET_PATIENT_ASSIGNMENTS_BY_USER_QUERY } from '@/graphql/queries/patientAssignments.queries';
import { GET_CURRENT_BILLING_STATUS_QUERY } from '@/graphql/queries/billing.queries';

interface ExtendSetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Dane przypisania do przedłużenia */
  assignment: {
    id: string;
    exerciseSetId: string;
    exerciseSetName: string;
    startDate: string;
    endDate: string;
    frequency?: {
      timesPerDay?: string;
      timesPerWeek?: string;
      breakBetweenSets?: string;
      monday?: boolean;
      tuesday?: boolean;
      wednesday?: boolean;
      thursday?: boolean;
      friday?: boolean;
      saturday?: boolean;
      sunday?: boolean;
    };
  };
  /** Dane pacjenta */
  patient: {
    id: string;
    name: string;
  };
  /** ID organizacji (do odświeżenia billing status) */
  organizationId: string;
  /** Callback do otworzenia wizarda ze zmianami */
  onEditWithWizard?: () => void;
  /** Callback po udanym przedłużeniu */
  onSuccess?: () => void;
}

const DURATION_OPTIONS = [
  { value: '7', label: '1 tydzień' },
  { value: '14', label: '2 tygodnie' },
  { value: '21', label: '3 tygodnie' },
  { value: '30', label: '1 miesiąc' },
  { value: '60', label: '2 miesiące' },
  { value: '90', label: '3 miesiące' },
];

export function ExtendSetDialog({
  open,
  onOpenChange,
  assignment,
  patient,
  organizationId,
  onEditWithWizard,
  onSuccess,
}: ExtendSetDialogProps) {
  const [durationDays, setDurationDays] = useState('30');

  const [assignSet, { loading }] = useMutation(ASSIGN_EXERCISE_SET_TO_PATIENT_MUTATION, {
    refetchQueries: [
      // Billing status (aktywni pacjenci premium) - odświeża badge na dashboardzie
      { query: GET_CURRENT_BILLING_STATUS_QUERY, variables: { organizationId } },
      {
        query: GET_PATIENT_ASSIGNMENTS_BY_USER_QUERY,
        variables: { userId: patient.id },
      },
    ],
  });

  // Oblicz nowe daty
  const currentEndDate = new Date(assignment.endDate);
  const isExpired = currentEndDate < new Date();
  const newStartDate = isExpired ? new Date() : currentEndDate;
  const newEndDate = addDays(newStartDate, parseInt(durationDays));

  const handleExtend = async () => {
    try {
      // Zachowaj obecną częstotliwość lub użyj domyślnej
      const frequency = assignment.frequency || {
        timesPerDay: '1',
        timesPerWeek: '7',
        breakBetweenSets: '30',
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: true,
        sunday: true,
      };

      await assignSet({
        variables: {
          exerciseSetId: assignment.exerciseSetId,
          patientId: patient.id,
          startDate: newStartDate.toISOString(),
          endDate: newEndDate.toISOString(),
          frequency: {
            timesPerDay: frequency.timesPerDay || '1',
            timesPerWeek: frequency.timesPerWeek || '7',
            breakBetweenSets: frequency.breakBetweenSets || '30',
            monday: frequency.monday ?? true,
            tuesday: frequency.tuesday ?? true,
            wednesday: frequency.wednesday ?? true,
            thursday: frequency.thursday ?? true,
            friday: frequency.friday ?? true,
            saturday: frequency.saturday ?? true,
            sunday: frequency.sunday ?? true,
          },
        },
      });

      toast.success(
        `Zestaw "${assignment.exerciseSetName}" przedłużony do ${format(newEndDate, 'd MMMM yyyy', { locale: pl })}`,
        {
          description: 'Pacjent otrzyma powiadomienie o nowym zestawie',
        }
      );

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Błąd przedłużania zestawu:', error);
      toast.error('Nie udało się przedłużyć zestawu');
    }
  };

  const handleEditWithWizard = () => {
    onOpenChange(false);
    onEditWithWizard?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="extend-set-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5 text-primary" />
            Przedłuż zestaw
          </DialogTitle>
          <DialogDescription>
            Przedłuż zestaw &quot;{assignment.exerciseSetName}&quot; dla pacjenta {patient.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current status */}
          <div className="rounded-lg border border-border bg-surface p-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Obecny termin:</span>
              <span className={isExpired ? 'text-destructive font-medium' : 'text-foreground'}>
                {format(currentEndDate, 'd MMM yyyy', { locale: pl })}
                {isExpired && ' (wygasł)'}
              </span>
            </div>
          </div>

          {/* Duration selector */}
          <div className="space-y-2">
            <Label>Na jak długo przedłużyć?</Label>
            <Select value={durationDays} onValueChange={setDurationDays}>
              <SelectTrigger data-testid="extend-set-duration-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* New dates preview */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Clock className="h-4 w-4" />
              Nowy harmonogram
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Od:</span>{' '}
                <span className="font-medium">
                  {format(newStartDate, 'd MMM yyyy', { locale: pl })}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Do:</span>{' '}
                <span className="font-medium">
                  {format(newEndDate, 'd MMM yyyy', { locale: pl })}
                </span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {onEditWithWizard && (
            <Button
              variant="outline"
              onClick={handleEditWithWizard}
              className="w-full sm:w-auto"
              data-testid="extend-set-edit-btn"
            >
              <Edit3 className="h-4 w-4 mr-2" />
              Przedłuż ze zmianami
            </Button>
          )}
          <Button
            onClick={handleExtend}
            disabled={loading}
            className="w-full sm:w-auto"
            data-testid="extend-set-confirm-btn"
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Przedłuż zestaw
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
