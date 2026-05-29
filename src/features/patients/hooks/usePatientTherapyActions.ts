'use client';

import { useCallback } from 'react';
import { toast } from 'sonner';

import type { PatientAssignment } from '@/features/patients/PatientAssignmentCard';
import { resolveAssignmentDisplayStatus } from '@/features/patients/utils/assignmentDisplayStatus';

interface UsePatientTherapyActionsInput {
  patientPhone?: string | null;
  assignments: PatientAssignment[];
  premiumValidUntil?: string | null;
  onEditPlan: (assignment: PatientAssignment) => void;
  onOpenAssign: () => void;
}

interface PatientTherapyActions {
  handleCall: () => void;
  handleEditPlan: () => void;
  handleSendMessage: () => void;
  handleSendPraise: () => void;
}

function toTimestamp(value?: string | null): number {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function pickPrimaryAssignment(assignments: PatientAssignment[], premiumValidUntil?: string | null): PatientAssignment | null {
  const activeAssignments = assignments.filter((assignment) => {
    if (!assignment.exerciseSetId || !assignment.exerciseSet?.id) {
      return false;
    }

    return (
      resolveAssignmentDisplayStatus({
        status: assignment.status,
        endDate: assignment.endDate,
        premiumValidUntil,
      }).primary.kind === 'active'
    );
  });

  if (activeAssignments.length === 0) {
    return null;
  }

  return [...activeAssignments].sort((left, right) => {
    const completionDiff = (left.completionCount ?? 0) - (right.completionCount ?? 0);
    if (completionDiff !== 0) {
      return completionDiff;
    }

    return toTimestamp(left.lastCompletedAt) - toTimestamp(right.lastCompletedAt);
  })[0];
}

export function usePatientTherapyActions({
  patientPhone,
  assignments,
  premiumValidUntil,
  onEditPlan,
  onOpenAssign,
}: UsePatientTherapyActionsInput): PatientTherapyActions {
  const normalizedPhone = patientPhone?.replace(/\s+/g, '') ?? '';

  const showMessagePlaceholder = useCallback(() => {
    toast.info('Wiadomości do pacjenta będą wkrótce dostępne w panelu.');
  }, []);

  const handleCall = useCallback(() => {
    if (!normalizedPhone) {
      toast.info('Brak numeru telefonu w profilu pacjenta.');
      return;
    }

    window.location.href = `tel:${normalizedPhone}`;
  }, [normalizedPhone]);

  const handleEditPlan = useCallback(() => {
    const assignmentToEdit = pickPrimaryAssignment(assignments, premiumValidUntil);

    if (!assignmentToEdit) {
      toast.info('Brak aktywnego planu do edycji. Najpierw przypisz zestaw ćwiczeń.');
      onOpenAssign();
      return;
    }

    onEditPlan(assignmentToEdit);
  }, [assignments, onEditPlan, onOpenAssign, premiumValidUntil]);

  return {
    handleCall,
    handleEditPlan,
    handleSendMessage: showMessagePlaceholder,
    handleSendPraise: showMessagePlaceholder,
  };
}
