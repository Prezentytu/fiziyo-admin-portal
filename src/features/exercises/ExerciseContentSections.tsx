'use client';

import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';
import { ExercisePatientContentFields } from '@/components/shared/exercise/ExercisePatientContentFields';
import { TherapistSection, MetadataSection } from './ExerciseDetailSections';

export interface ExerciseContentSectionsProps {
  enrichment: ExerciseEnrichmentData;
  patientDescription: string;
  clinicalDescription: string;
  audioCue: string;
  videoUrl: string;
  notes: string;
  disabled?: boolean;
  patientDescriptionDirty?: boolean;
  clinicalDescriptionDirty?: boolean;
  videoUrlDirty?: boolean;
  notesDirty?: boolean;
  isPathDirty: (path: string) => boolean;
  onPatientDescriptionChange: (value: string) => void;
  onClinicalDescriptionChange: (value: string) => void;
  onAudioCueChange: (value: string) => void;
  onVideoUrlChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  setPath: (path: string, value: unknown) => void;
  /** When false, skips PatientLeadSection (create wizard keeps a lean description above). */
  showPatientLead?: boolean;
}

/**
 * Shared content stack for exercise create + edit (parity of enrichment sections).
 * Patient/safety blocks come from ExercisePatientContentFields (SPEC-024 SSOT).
 */
export function ExerciseContentSections({
  enrichment,
  patientDescription,
  clinicalDescription,
  audioCue,
  videoUrl,
  notes,
  disabled = false,
  patientDescriptionDirty = false,
  clinicalDescriptionDirty = false,
  videoUrlDirty = false,
  notesDirty = false,
  isPathDirty,
  onPatientDescriptionChange,
  onClinicalDescriptionChange,
  onAudioCueChange,
  onVideoUrlChange,
  onNotesChange,
  setPath,
  showPatientLead = true,
}: Readonly<ExerciseContentSectionsProps>) {
  return (
    <div className="space-y-4" data-testid="exercise-content-sections">
      <ExercisePatientContentFields
        surface="template"
        enrichment={enrichment}
        setPath={setPath}
        isPathDirty={isPathDirty}
        disabled={disabled}
        patientDescription={patientDescription}
        patientDescriptionDirty={patientDescriptionDirty}
        onPatientDescriptionChange={onPatientDescriptionChange}
        audioCue={audioCue}
        onAudioCueChange={onAudioCueChange}
        showPatientLead={showPatientLead}
        showCoreScalars
        testIdPrefix="exercise-patient-content"
      />

      <TherapistSection
        data={enrichment}
        clinicalDescription={clinicalDescription}
        editable
        disabled={disabled}
        clinicalDescriptionDirty={clinicalDescriptionDirty}
        onClinicalDescriptionChange={onClinicalDescriptionChange}
        setPath={setPath}
        persist={async () => {}}
      />

      <MetadataSection
        data={enrichment}
        videoUrl={videoUrl}
        notes={notes}
        editable
        disabled={disabled}
        videoUrlDirty={videoUrlDirty}
        notesDirty={notesDirty}
        isPathDirty={isPathDirty}
        onVideoUrlChange={onVideoUrlChange}
        onNotesChange={onNotesChange}
        setPath={setPath}
      />
    </div>
  );
}
