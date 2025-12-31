'use client';

import { useState, useMemo, useCallback } from 'react';
import { useMutation } from '@apollo/client/react';
import { Check, Loader2, Search, UserCheck, Users } from 'lucide-react';
import { toast } from 'sonner';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ASSIGN_PATIENTS_TO_CLINIC_MUTATION,
  ASSIGN_THERAPISTS_TO_CLINIC_MUTATION,
} from '@/graphql/mutations/clinics.mutations';
import { GET_ORGANIZATION_CLINICS_QUERY } from '@/graphql/queries/clinics.queries';
import { matchesSearchQuery } from '@/utils/textUtils';
import { cn } from '@/lib/utils';
import type { Clinic } from './ClinicExpandableCard';

interface Person {
  id: string;
  fullname?: string;
  email?: string;
  image?: string;
}

interface AssignToClinicDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clinic: Clinic | null;
  organizationId: string;
  therapists: Person[];
  patients: Person[];
  assignedTherapistIds?: string[];
  assignedPatientIds?: string[];
  onSuccess?: () => void;
}

export function AssignToClinicDialog({
  open,
  onOpenChange,
  clinic,
  organizationId,
  therapists,
  patients,
  assignedTherapistIds = [],
  assignedPatientIds = [],
  onSuccess,
}: AssignToClinicDialogProps) {
  const [activeTab, setActiveTab] = useState<'therapists' | 'patients'>('therapists');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTherapistIds, setSelectedTherapistIds] = useState<string[]>([]);
  const [selectedPatientIds, setSelectedPatientIds] = useState<string[]>([]);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const hasChanges = selectedTherapistIds.length > 0 || selectedPatientIds.length > 0;

  const handleCloseAttempt = useCallback(() => {
    if (hasChanges) {
      setShowCloseConfirm(true);
    } else {
      onOpenChange(false);
    }
  }, [hasChanges, onOpenChange]);

  const handleConfirmClose = useCallback(() => {
    setShowCloseConfirm(false);
    setSelectedTherapistIds([]);
    setSelectedPatientIds([]);
    setSearchQuery('');
    setActiveTab('therapists');
    onOpenChange(false);
  }, [onOpenChange]);

  // Reset state when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setSelectedTherapistIds([]);
      setSelectedPatientIds([]);
      setSearchQuery('');
      setActiveTab('therapists');
      setShowCloseConfirm(false);
      onOpenChange(newOpen);
    } else {
      handleCloseAttempt();
    }
  };

  const [assignTherapists, { loading: assigningTherapists }] = useMutation(ASSIGN_THERAPISTS_TO_CLINIC_MUTATION, {
    refetchQueries: [{ query: GET_ORGANIZATION_CLINICS_QUERY, variables: { organizationId } }],
  });

  const [assignPatients, { loading: assigningPatients }] = useMutation(ASSIGN_PATIENTS_TO_CLINIC_MUTATION, {
    refetchQueries: [{ query: GET_ORGANIZATION_CLINICS_QUERY, variables: { organizationId } }],
  });

  const isLoading = assigningTherapists || assigningPatients;

  // Filter therapists
  const filteredTherapists = useMemo(() => {
    if (!searchQuery) return therapists;
    return therapists.filter(
      (t) => matchesSearchQuery(t.fullname, searchQuery) || matchesSearchQuery(t.email, searchQuery)
    );
  }, [therapists, searchQuery]);

  // Filter patients
  const filteredPatients = useMemo(() => {
    if (!searchQuery) return patients;
    return patients.filter(
      (p) => matchesSearchQuery(p.fullname, searchQuery) || matchesSearchQuery(p.email, searchQuery)
    );
  }, [patients, searchQuery]);

  const toggleTherapist = (id: string) => {
    setSelectedTherapistIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const togglePatient = (id: string) => {
    setSelectedPatientIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleAssign = async () => {
    if (!clinic) return;

    try {
      // Assign therapists if any selected
      if (selectedTherapistIds.length > 0) {
        await assignTherapists({
          variables: {
            clinicId: clinic.id,
            therapistIds: selectedTherapistIds,
          },
        });
      }

      // Assign patients if any selected
      if (selectedPatientIds.length > 0) {
        await assignPatients({
          variables: {
            clinicId: clinic.id,
            patientIds: selectedPatientIds,
          },
        });
      }

      const totalAssigned = selectedTherapistIds.length + selectedPatientIds.length;
      toast.success(`Przypisano ${totalAssigned} osób do gabinetu`);
      handleOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Błąd podczas przypisywania:', error);
      toast.error('Nie udało się przypisać osób do gabinetu');
    }
  };

  const totalSelected = selectedTherapistIds.length + selectedPatientIds.length;

  const renderPersonList = (
    people: Person[],
    selectedIds: string[],
    assignedIds: string[],
    onToggle: (id: string) => void
  ) => {
    if (people.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Users className="h-12 w-12 mb-3 opacity-50" />
          <p>Brak osób do wyświetlenia</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {people.map((person) => {
          const isSelected = selectedIds.includes(person.id);
          const isAlreadyAssigned = assignedIds.includes(person.id);
          const displayName = person.fullname || person.email || 'Nieznany';
          const initials = displayName.slice(0, 2).toUpperCase();

          return (
            <div
              key={person.id}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg border border-transparent transition-all cursor-pointer',
                isAlreadyAssigned
                  ? 'bg-surface opacity-60 cursor-not-allowed'
                  : isSelected
                  ? 'bg-primary/10 border-primary/30'
                  : 'bg-surface hover:bg-surface-light'
              )}
              onClick={() => !isAlreadyAssigned && onToggle(person.id)}
            >
              <Checkbox
                checked={isSelected || isAlreadyAssigned}
                disabled={isAlreadyAssigned}
                onCheckedChange={() => onToggle(person.id)}
                onClick={(e) => e.stopPropagation()}
              />
              <Avatar className="h-10 w-10">
                <AvatarImage src={person.image} />
                <AvatarFallback className="text-sm">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{displayName}</p>
                {person.email && person.fullname && (
                  <p className="text-sm text-muted-foreground truncate">{person.email}</p>
                )}
              </div>
              {isAlreadyAssigned && (
                <Badge variant="secondary" className="shrink-0 gap-1">
                  <UserCheck className="h-3 w-3" />
                  Przypisany
                </Badge>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-lg"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          handleCloseAttempt();
        }}
      >
        <DialogHeader>
          <DialogTitle>Przypisz osoby do gabinetu</DialogTitle>
          <DialogDescription>
            {clinic?.name
              ? `Wybierz terapeutów i pacjentów do przypisania do gabinetu "${clinic.name}"`
              : 'Wybierz osoby do przypisania'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Szukaj po imieniu lub emailu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <TabsList className="w-full">
              <TabsTrigger value="therapists" className="flex-1 gap-2">
                <Users className="h-4 w-4" />
                Terapeuci
                {selectedTherapistIds.length > 0 && (
                  <Badge variant="default" className="ml-1">
                    {selectedTherapistIds.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="patients" className="flex-1 gap-2">
                <UserCheck className="h-4 w-4" />
                Pacjenci
                {selectedPatientIds.length > 0 && (
                  <Badge variant="default" className="ml-1">
                    {selectedPatientIds.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="therapists" className="mt-4">
              <ScrollArea className="h-[300px] pr-4">
                {renderPersonList(filteredTherapists, selectedTherapistIds, assignedTherapistIds, toggleTherapist)}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="patients" className="mt-4">
              <ScrollArea className="h-[300px] pr-4">
                {renderPersonList(filteredPatients, selectedPatientIds, assignedPatientIds, togglePatient)}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleCloseAttempt}>
            Anuluj
          </Button>
          <Button onClick={handleAssign} disabled={isLoading || totalSelected === 0} className="gap-2">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Przypisz {totalSelected > 0 ? `(${totalSelected})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>

      <ConfirmDialog
        open={showCloseConfirm}
        onOpenChange={setShowCloseConfirm}
        title="Porzucić zmiany?"
        description="Masz niezapisane zmiany. Czy na pewno chcesz zamknąć bez zapisywania?"
        confirmText="Tak, zamknij"
        cancelText="Kontynuuj edycję"
        variant="destructive"
        onConfirm={handleConfirmClose}
      />
    </Dialog>
  );
}

