'use client';

import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';
import type { ExerciseContentVersion } from '@/components/shared/exercise/readExerciseContent';
import { ExercisePatientContentFields } from '@/components/shared/exercise/ExercisePatientContentFields';
import { TherapistSection, MetadataSection } from './ExerciseDetailSections';

export interface ExerciseContentSectionsProps {
  enrichment: ExerciseEnrichmentData;
  patientDescription: string;
  clinicalDescription: string;
  audioCue: string;
  videos: string[];
  notes: string;
  disabled?: boolean;
  patientDescriptionDirty?: boolean;
  clinicalDescriptionDirty?: boolean;
  videosDirty?: boolean;
  notesDirty?: boolean;
  isPathDirty: (path: string) => boolean;
  onPatientDescriptionChange: (value: string) => void;
  onClinicalDescriptionChange: (value: string) => void;
  onAudioCueChange: (value: string) => void;
  onVideosChange: (value: string[]) => void;
  onNotesChange: (value: string) => void;
  setPath: (path: string, value: unknown) => void;
  /** When false, skips PatientLeadSection (create wizard keeps a lean description above). */
  showPatientLead?: boolean;
  /**
   * Kontrakt treści rekordu. `3.3` pokazuje edytory pól v3.3 i nie renderuje pól wycofanych
   * (opis dla pacjenta, opis kliniczny, notatka, polecenie audio i stare pola dokumentu); SPEC-038.
   */
  contentVersion?: ExerciseContentVersion;
  /** false = link do filmu renderuje rodzic (kreator: w sekcji Media). */
  showVideoUrl?: boolean;
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
  videos,
  notes,
  disabled = false,
  patientDescriptionDirty = false,
  clinicalDescriptionDirty = false,
  videosDirty = false,
  notesDirty = false,
  isPathDirty,
  onPatientDescriptionChange,
  onClinicalDescriptionChange,
  onAudioCueChange,
  onVideosChange,
  onNotesChange,
  setPath,
  showPatientLead = true,
  contentVersion = 'legacy',
  showVideoUrl = true,
}: Readonly<ExerciseContentSectionsProps>) {
  const isV33 = contentVersion === '3.3';

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
        showCoreScalars={!isV33}
        contentVersion={contentVersion}
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
        contentVersion={contentVersion}
        isPathDirty={isPathDirty}
      />

      <MetadataSection
        data={enrichment}
        videos={videos}
        notes={notes}
        editable
        disabled={disabled}
        videosDirty={videosDirty}
        notesDirty={notesDirty}
        isPathDirty={isPathDirty}
        onVideosChange={onVideosChange}
        onNotesChange={onNotesChange}
        setPath={setPath}
        contentVersion={contentVersion}
        showVideoUrl={showVideoUrl}
      />
    </div>
  );
}
