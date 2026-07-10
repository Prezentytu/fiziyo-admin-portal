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
    case 'summary':
      return true;
    default:
      return false;
  }
}
