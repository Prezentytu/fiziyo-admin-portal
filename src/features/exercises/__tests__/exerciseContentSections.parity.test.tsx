import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ExerciseContentSections } from '../ExerciseContentSections';

const SECTION_TEST_IDS = [
  'exercise-content-sections',
  'exercise-detail-patient-lead',
  'exercise-execution-steps',
  'exercise-audio-cues',
  'exercise-detail-patient-extras',
  'exercise-detail-safety',
  'exercise-detail-therapist',
  'exercise-detail-metadata',
] as const;

describe('ExerciseContentSections parity', () => {
  it('renderuje pełny stack sekcji treści (edit / create with showPatientLead)', () => {
    render(
      <ExerciseContentSections
        enrichment={{}}
        patientDescription=""
        clinicalDescription=""
        audioCue=""
        videoUrl=""
        notes=""
        isPathDirty={() => false}
        onPatientDescriptionChange={vi.fn()}
        onClinicalDescriptionChange={vi.fn()}
        onAudioCueChange={vi.fn()}
        onVideoUrlChange={vi.fn()}
        onNotesChange={vi.fn()}
        setPath={vi.fn()}
      />
    );

    for (const testId of SECTION_TEST_IDS) {
      expect(screen.getByTestId(testId), `missing ${testId}`).toBeInTheDocument();
    }
  });

  it('create lean mode ukrywa PatientLead (opis jest poza collapsible)', () => {
    render(
      <ExerciseContentSections
        enrichment={{}}
        patientDescription=""
        clinicalDescription=""
        audioCue=""
        videoUrl=""
        notes=""
        showPatientLead={false}
        isPathDirty={() => false}
        onPatientDescriptionChange={vi.fn()}
        onClinicalDescriptionChange={vi.fn()}
        onAudioCueChange={vi.fn()}
        onVideoUrlChange={vi.fn()}
        onNotesChange={vi.fn()}
        setPath={vi.fn()}
      />
    );

    expect(screen.queryByTestId('exercise-detail-patient-lead')).not.toBeInTheDocument();
    expect(screen.getByTestId('exercise-execution-steps')).toBeInTheDocument();
    expect(screen.getByTestId('exercise-audio-cues')).toBeInTheDocument();
    expect(screen.getByTestId('exercise-detail-patient-extras')).toBeInTheDocument();
    expect(screen.getByTestId('exercise-detail-safety')).toBeInTheDocument();
    expect(screen.getByTestId('exercise-detail-therapist')).toBeInTheDocument();
    expect(screen.getByTestId('exercise-detail-metadata')).toBeInTheDocument();
  });
});
