import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';
import {
  MetadataSection,
  PatientExtrasSection,
  PatientLeadSection,
  SafetySection,
  TherapistSection,
} from '../ExerciseDetailSections';
import { ExerciseAudioCues } from '../ExerciseAudioCues';
import { ExerciseExecutionSteps } from '../ExerciseExecutionSteps';

interface ReadViewRecord {
  enrichmentData: ExerciseEnrichmentData;
  patientDescription?: string;
  clinicalDescription?: string;
  notes?: string;
  videoUrl?: string;
  audioCue?: string;
}

/** Prawa kolumna strony ćwiczenia w trybie odczytu, w tej samej kolejności co `exercises/[id]/page.tsx`. */
function renderReadView(record: ReadViewRecord) {
  const data = record.enrichmentData;
  const isPathDirty = () => false;
  const setPath = vi.fn();
  return render(
    <>
      <PatientLeadSection
        data={data}
        patientDescription={record.patientDescription ?? ''}
        editable={false}
        patientDescriptionDirty={false}
        isPathDirty={isPathDirty}
        onPatientDescriptionChange={vi.fn()}
        setPath={setPath}
      />
      <ExerciseExecutionSteps enrichmentData={data} editable={false} />
      <ExerciseAudioCues audioCue={record.audioCue ?? ''} enrichmentData={data} editable={false} />
      <PatientExtrasSection data={data} editable={false} isPathDirty={isPathDirty} setPath={setPath} />
      <SafetySection data={data} editable={false} isPathDirty={isPathDirty} setPath={setPath} />
      <TherapistSection
        data={data}
        clinicalDescription={record.clinicalDescription ?? ''}
        editable={false}
        clinicalDescriptionDirty={false}
        onClinicalDescriptionChange={vi.fn()}
        setPath={setPath}
        persist={async () => {}}
      />
      <MetadataSection
        data={data}
        videoUrl={record.videoUrl ?? ''}
        notes={record.notes ?? ''}
        editable={false}
        videoUrlDirty={false}
        notesDirty={false}
        isPathDirty={isPathDirty}
        onVideoUrlChange={vi.fn()}
        onNotesChange={vi.fn()}
        setPath={setPath}
      />
    </>
  );
}

function sectionText(testId: string): string {
  return screen.getByTestId(testId).textContent ?? '';
}

const legacyRecord: ReadViewRecord = {
  patientDescription: 'Stań prosto.\nZrób przysiad.',
  clinicalDescription: 'Wzorzec przysiadu.',
  notes: 'Korzyści: siła nóg',
  videoUrl: 'https://vimeo.com/1',
  audioCue: 'Plecy proste',
  enrichmentData: {
    $schema: 'fiziyo-exercise-v3',
    patient: {
      summary: 'Przysiad do krzesła.',
      steps: ['Stań przed krzesłem.', 'Usiądź i wstań.'],
      cues: ['Stopy na szerokość bioder', 'Wstań'],
      cue_phases: [{ cue: 0, phase: 'preparation' }],
      mistakes: [{ mistake: 'Kolana do środka', fix: 'Prowadź kolana nad stopy' }, { mistake: 'Pięty w górze' }],
      should_feel: 'Pracę ud.',
      should_not_feel: 'Bólu kolan.',
      why: 'Wzmacnia nogi.',
      when_to_do: 'Rano.',
    },
    safety: { stop_if: 'Zawroty głowy\nOstry ból kolana', intensity_guide: 'do 5/10', requires_supervision: true },
    therapist: {
      clinical_notes: 'Uwaga na koślawienie.',
      indications: ['ChZS kolana'],
      contraindications: ['ostry stan'],
      rehab_phases: ['faza II'],
      clinical_benefits: ['siła'],
      progression_notes: 'Dodaj obciążenie.',
    },
    ai: { keywords: ['przysiad'], problems: ['ból kolana'], suitable_for: ['seniorzy'], contraindicated_for: ['ostry uraz'] },
    equipment: ['krzesło', 'mata'],
  },
};

describe('widok ćwiczenia, rekord stary: treść bez zmian', () => {
  it('instrukcja pokazuje opis z kolumny i podsumowanie', () => {
    renderReadView(legacyRecord);
    expect(sectionText('exercise-detail-patient-lead')).toBe(
      'Instrukcja dla pacjentaOpis dla pacjentaStań prosto.\nZrób przysiad.Krótkie podsumowaniePrzysiad do krzesła.'
    );
  });

  it('kroki i wskazówki z fazą', () => {
    renderReadView(legacyRecord);
    expect(sectionText('exercise-execution-steps-list')).toBe('1Stań przed krzesłem.2Usiądź i wstań.');
    expect(sectionText('exercise-audio-cue-main')).toContain('Plecy proste');
    expect(sectionText('exercise-audio-cues-list')).toBe('Stopy na szerokość bioderPrzygotowanieWstańPraca');
  });

  it('odczucia i błędy', () => {
    renderReadView(legacyRecord);
    expect(sectionText('exercise-detail-patient-extras')).toBe(
      'Odczucia i typowe błędy' +
        'Błąd: Kolana do środkaKorekta: Prowadź kolana nad stopy' +
        'Błąd: Pięty w górze' +
        'Co pacjent powinien czuć: Pracę ud.' +
        'Czego nie powinien czuć: Bólu kolan.' +
        'Wzmacnia nogi.' +
        'Kiedy wykonywać: Rano.'
    );
  });

  it('bezpieczeństwo', () => {
    renderReadView(legacyRecord);
    expect(sectionText('exercise-detail-safety')).toBe(
      'Bezpieczeństwo' +
        'Wymaga nadzoru fizjoterapeuty' +
        'Przerwij, gdy…Zawroty głowy\nOstry ból kolana' +
        'Wskazówki dot. intensywności: do 5/10'
    );
  });

  it('blok fizjoterapeuty', () => {
    renderReadView(legacyRecord);
    expect(sectionText('exercise-detail-therapist')).toBe(
      'Dla fizjoterapeuty' +
        'Opis dla fizjoterapeutyWzorzec przysiadu.' +
        'Uwaga na koślawienie.' +
        'Wskazania:ChZS kolana' +
        'Przeciwwskazania:ostry stan' +
        'Faza rehabilitacji:faza II' +
        'Korzyści terapeutyczne:siła' +
        'Notatki o progresji: Dodaj obciążenie.'
    );
  });

  it('metadane ze sprzętem jako etykiety', () => {
    renderReadView(legacyRecord);
    expect(sectionText('exercise-detail-metadata')).toBe(
      'Metadane i wyszukiwanie' +
        'Film: https://vimeo.com/1' +
        'Wskazówka fizjoterapeuty: Korzyści: siła nóg' +
        'Potrzebny sprzętkrzesłomata' +
        'Problemy / dolegliwościból kolana' +
        'Odpowiednie dlaseniorzy' +
        'Przeciwwskazane dlaostry uraz' +
        'Słowa kluczoweprzysiad'
    );
  });

  it('puste pola zostawiają te same zaślepki co dziś', () => {
    renderReadView({ patientDescription: 'Sam opis.', enrichmentData: { therapist: { indications: ['ChZS'] } } });
    expect(sectionText('exercise-detail-patient-lead')).toBe(
      'Instrukcja dla pacjentaOpis dla pacjentaSam opis.Krótkie podsumowanie—'
    );
    expect(sectionText('exercise-detail-therapist')).toBe(
      'Dla fizjoterapeutyOpis dla fizjoterapeutyBrak opisu dla fizjoterapeuty.Wskazania:ChZS'
    );
    expect(screen.queryByTestId('exercise-detail-patient-extras')).not.toBeInTheDocument();
    expect(screen.queryByTestId('exercise-detail-safety')).not.toBeInTheDocument();
    expect(screen.queryByTestId('exercise-detail-metadata')).not.toBeInTheDocument();
  });

  it('samo podsumowanie pokazuje zaślepkę opisu', () => {
    renderReadView({ enrichmentData: { patient: { summary: 'Krótko.' } } });
    expect(sectionText('exercise-detail-patient-lead')).toBe(
      'Instrukcja dla pacjentaOpis dla pacjentaBrak opisu dla pacjenta.Krótkie podsumowanieKrótko.'
    );
  });
});
