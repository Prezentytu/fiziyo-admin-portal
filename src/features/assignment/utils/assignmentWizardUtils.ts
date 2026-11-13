import type { WizardStep } from '../types';
import { hasSelectedScheduleDays, type FrequencyInput } from './scheduleFrequencyUtils';

export interface CanProceedContext {
  selectedSet: unknown;
  builderInstancesLength: number;
  planNameTrimLength: number;
  selectedPatientsCount: number;
  frequency: FrequencyInput;
}

/**
 * Czy użytkownik może przejść dalej z danego kroku (logika walidacji kroków wizarda).
 */
export function canProceedFromStep(step: WizardStep, context: CanProceedContext): boolean {
  switch (step) {
    case 'select-set':
      return context.selectedSet !== null;
    case 'customize-set':
      return context.builderInstancesLength > 0 && context.planNameTrimLength >= 2;
    case 'select-patients':
      return context.selectedPatientsCount > 0;
    case 'schedule':
      return context.frequency.isFlexible !== false || hasSelectedScheduleDays(context.frequency);
    default:
      return false;
  }
}

export interface WizardEnterKeyInput {
  isLastStep: boolean;
  canProceed: boolean;
  shiftKey: boolean;
  metaKey: boolean;
  ctrlKey: boolean;
}

export function wizardEnterSubmits(input: WizardEnterKeyInput): boolean {
  if (!input.isLastStep || !input.canProceed || input.shiftKey) {
    return false;
  }
  return input.metaKey || input.ctrlKey;
}

export function wizardEnterAdvances(input: Pick<WizardEnterKeyInput, 'isLastStep' | 'canProceed' | 'shiftKey'>): boolean {
  return !input.isLastStep && input.canProceed && !input.shiftKey;
}

/** Limit notatki do zestawu; ten sam co w backendzie (`TherapistsMutation.AssignmentNoteMaxLength`). */
export const ASSIGNMENT_NOTE_MAX_LENGTH = 1000;

/** Notatka do przypisania wysyłana do API: przycięta, pusta = brak notatki. */
export function toAssignmentNotePayload(note: string): string | null {
  const trimmed = note.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Notatka do `updateExerciseSetAssignment` przy edycji planu. `undefined` = bez zmiany (nie wysyłamy),
 * pusty tekst = usuń notatkę (w API `null` znaczy „bez zmian”), inaczej przycięta treść.
 */
export function toAssignmentNoteUpdatePayload(note: string, initialNote: string | null | undefined): string | undefined {
  const next = note.trim();
  const previous = initialNote?.trim() ?? '';
  return next === previous ? undefined : next;
}
