'use client';

/**
 * SSOT UI for patient/safety enrichment content (SPEC-024).
 * Used by ExerciseContentSections (template) and ExerciseExecutionCard (personalization).
 */

import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';
import { ExerciseExecutionSteps } from '@/features/exercises/ExerciseExecutionSteps';
import { ExerciseAudioCues } from '@/features/exercises/ExerciseAudioCues';
import {
  PatientLeadSection,
  PatientExtrasSection,
  SafetySection,
} from '@/features/exercises/ExerciseDetailSections';
import { listOverriddenEnrichmentPaths, type EnrichmentOverride } from './enrichmentOverride';
import { getContentSections, type ContentSectionId } from './contentContract';
import type { ExerciseFieldSurface } from './fieldContract';
import { cn } from '@/lib/utils';

export interface ExercisePatientContentFieldsProps {
  surface: ExerciseFieldSurface;
  enrichment: ExerciseEnrichmentData;
  setPath: (path: string, value: unknown) => void;
  isPathDirty: (path: string) => boolean;
  disabled?: boolean;
  /** Core scalar — opis dla pacjenta (template editor). */
  patientDescription?: string;
  patientDescriptionDirty?: boolean;
  onPatientDescriptionChange?: (value: string) => void;
  /** Core scalar — komenda TTS (template editor). */
  audioCue?: string;
  onAudioCueChange?: (value: string) => void;
  showPatientLead?: boolean;
  /** When false, hide core scalars already present in parameter form. */
  showCoreScalars?: boolean;
  /** Active enrichment override — enables restore UI when provided. */
  enrichmentOverride?: EnrichmentOverride | null;
  onRestoreAll?: () => void;
  className?: string;
  testIdPrefix?: string;
}

export function ExercisePatientContentFields({
  surface,
  enrichment,
  setPath,
  isPathDirty,
  disabled = false,
  patientDescription = '',
  patientDescriptionDirty = false,
  onPatientDescriptionChange,
  audioCue = '',
  onAudioCueChange,
  showPatientLead = true,
  showCoreScalars = true,
  enrichmentOverride,
  onRestoreAll,
  className,
  testIdPrefix = 'exercise-patient-content',
}: Readonly<ExercisePatientContentFieldsProps>) {
  const sections = getContentSections(surface);
  const sectionIds = new Set<ContentSectionId>(sections.map((section) => section.id));
  const overriddenPaths = listOverriddenEnrichmentPaths(enrichmentOverride);
  const showRestore = Boolean(onRestoreAll && overriddenPaths.length > 0);

  return (
    <div className={cn('space-y-4', className)} data-testid={testIdPrefix}>
      {showRestore ? (
        <div
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2"
          data-testid={`${testIdPrefix}-personalized-banner`}
        >
          <p className="text-[11px] text-amber-800 dark:text-amber-200">
            Zmienione dla tego planu ({overriddenPaths.length})
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 px-2 text-[11px] text-primary"
            disabled={disabled}
            onClick={onRestoreAll}
            data-testid={`${testIdPrefix}-restore-all-btn`}
          >
            <RotateCcw className="h-3 w-3" />
            Przywróć z szablonu
          </Button>
        </div>
      ) : null}

      {showPatientLead && sectionIds.has('patientLead') ? (
        <PatientLeadSection
          data={enrichment}
          patientDescription={patientDescription}
          editable
          disabled={disabled}
          patientDescriptionDirty={patientDescriptionDirty}
          isPathDirty={isPathDirty}
          onPatientDescriptionChange={onPatientDescriptionChange ?? (() => {})}
          setPath={setPath}
          showPatientDescription={showCoreScalars}
        />
      ) : null}

      {sectionIds.has('executionSteps') ? (
        <ExerciseExecutionSteps
          enrichmentData={enrichment}
          patientDescription={patientDescription}
          editable
          disabled={disabled}
          setPath={setPath}
        />
      ) : null}

      {sectionIds.has('audioCues') ? (
        <ExerciseAudioCues
          audioCue={audioCue}
          enrichmentData={enrichment}
          editable
          disabled={disabled}
          onAudioCueChange={onAudioCueChange}
          setPath={setPath}
          showTtsCue={showCoreScalars}
        />
      ) : null}

      {sectionIds.has('patientExtras') ? (
        <PatientExtrasSection
          data={enrichment}
          editable
          disabled={disabled}
          isPathDirty={isPathDirty}
          setPath={setPath}
        />
      ) : null}

      {sectionIds.has('safety') ? (
        <SafetySection
          data={enrichment}
          editable
          disabled={disabled}
          isPathDirty={isPathDirty}
          setPath={setPath}
        />
      ) : null}
    </div>
  );
}
