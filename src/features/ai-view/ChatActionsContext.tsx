'use client';

import { createContext, useContext } from 'react';

import type { ExerciseSet, Patient } from '@/features/assignment/types';
import type { ChatPatient } from './useChatData';
import type { ChatViewSpec } from './utils/viewSpec';

export interface ChatActions {
  organizationId: string;
  therapistId?: string;
  patients: readonly ChatPatient[];
  sets: readonly ExerciseSet[];
  /** Opens the Assignment Wizard with what chat already knows; the human confirms, the wizard writes. */
  openAssign: (set: ExerciseSet | undefined, patient?: Patient) => void;
  /** Opens the set composer with the proposed exercises; a created set comes back as AssignSummary. */
  openCreateSet: (exerciseIds: string[], patient?: Patient) => void;
  openAddPatient: () => void;
  sendMessage: (text: string) => void;
  appendSpec: (spec: ChatViewSpec) => void;
}

export const ChatActionsContext = createContext<ChatActions | null>(null);

export function useChatActions(): ChatActions {
  const actions = useContext(ChatActionsContext);
  if (!actions) throw new Error('useChatActions must be used inside ChatActionsContext');
  return actions;
}

export function toWizardPatient(patient: ChatPatient | undefined): Patient | undefined {
  if (!patient) return undefined;
  return {
    id: patient.id,
    name: patient.name,
    email: patient.email,
    image: patient.image,
    isShadowUser: patient.isShadowUser,
  };
}
