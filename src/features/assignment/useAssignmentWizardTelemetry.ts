'use client';

import { useEffect, useRef } from 'react';
import { trackEvent } from '@/lib/telemetry/client';
import { finishFlow, startFlow } from '@/lib/telemetry/flowTimer';
import type { WizardStep } from './types';

const FLOW = 'assignment_wizard';

let lastStep: WizardStep | null = null;

interface WizardTelemetryInput {
  currentStep: WizardStep;
  stepIndex: number;
  stepCount: number;
  mode: string;
  isEditMode: boolean;
}

/** Tracks wizard open and every step view, so the funnel shows where therapists stop. */
export function useAssignmentWizardTelemetry({ currentStep, stepIndex, stepCount, mode, isEditMode }: WizardTelemetryInput) {
  const openedRef = useRef(false);

  useEffect(() => {
    if (openedRef.current) {
      return;
    }
    openedRef.current = true;
    startFlow(FLOW);
    trackEvent('assignment_wizard:open', { mode, is_edit: isEditMode, step_count: stepCount });
  }, [mode, isEditMode, stepCount]);

  useEffect(() => {
    lastStep = currentStep;
    trackEvent('assignment_wizard:step_view', { step: currentStep, step_index: stepIndex, step_count: stepCount });
  }, [currentStep, stepIndex, stepCount]);
}

export function trackAssignmentWizardComplete(patientsCount: number): void {
  trackEvent('assignment_wizard:complete', {
    patients_count: patientsCount,
    duration_ms: finishFlow(FLOW),
  });
  lastStep = null;
}

export function trackAssignmentWizardAbandon(): void {
  const durationMs = finishFlow(FLOW);
  if (durationMs === null) {
    return;
  }
  trackEvent('assignment_wizard:abandon', { last_step: lastStep, duration_ms: durationMs });
  lastStep = null;
}
