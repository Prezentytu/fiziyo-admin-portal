import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import goldenV33 from '@/components/shared/exercise/__tests__/fixtures/enrichmentV33.fx-0073.json';
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

const golden = goldenV33 as ExerciseEnrichmentData;

/** Wzorcowy rekord 3.3 z paczki p001; kolumny opisów wypełnione celowo, żeby sprawdzić, że widok je pomija. */
const v33Record: ReadViewRecord = {
  patientDescription: 'STARY OPIS Z KOLUMNY',
  clinicalDescription: 'STARY OPIS KLINICZNY',
  enrichmentData: {
    ...golden,
    therapist: { ...golden.therapist, note: 'Dobre na start po rekonstrukcji ACL.' },
    equipment_items: [
      { code: 'towel', label: 'mały zrolowany ręcznik', qty: 1, required: true, substitutes: [] },
      { code: 'band', label: 'taśma', qty: 2, required: false, substitutes: ['pasek', 'ręcznik'] },
    ],
  },
};

describe('widok ćwiczenia, rekord 3.3', () => {
  it('nie pokazuje starych opisów z kolumn, choć są wypełnione', () => {
    const { container } = renderReadView(v33Record);
    expect(container.textContent).not.toContain('STARY OPIS');
    expect(screen.queryByText('Opis dla pacjenta')).not.toBeInTheDocument();
    expect(screen.queryByText('Opis dla fizjoterapeuty')).not.toBeInTheDocument();
    expect(sectionText('exercise-detail-patient-lead')).toBe(
      `Instrukcja dla pacjentaKrótkie podsumowanie${golden.patient?.summary}`
    );
  });

  it('kroki, wskazówki z fazą, błędy i odczucia zostają tam, gdzie były', () => {
    renderReadView(v33Record);
    expect(screen.getAllByTestId(/^exercise-execution-step-\d+$/)).toHaveLength(8);
    expect(sectionText('exercise-audio-cue-4')).toBe('Ręcznik pod kolanem, noga prosta.Przygotowanie');
    expect(sectionText('exercise-audio-cue-5')).toBe('Rozluźnij udo całkowicie.Odpoczynek');
    const extras = sectionText('exercise-detail-patient-extras');
    expect(extras).toContain('Błąd: Wstrzymujesz oddech.Korekta: Oddychaj spokojnie, możesz liczyć na głos.');
    expect(extras).toContain(`Co pacjent powinien czuć: ${golden.patient?.should_feel}`);
    expect(extras).toContain(`Czego nie powinien czuć: ${golden.patient?.should_not_feel}`);
    expect(extras).toContain(golden.patient?.why);
    expect(extras).toContain(`Kiedy wykonywać: ${golden.patient?.when_to_do}`);
  });

  it('pokazuje oddech oraz wersję łatwiejszą i trudniejszą', () => {
    renderReadView(v33Record);
    expect(sectionText('exercise-detail-breathing-text')).toBe(`Oddech: ${golden.breathing?.text}`);
    expect(sectionText('exercise-detail-easier-text')).toBe(`Łatwiej: ${golden.patient?.easier}`);
    expect(sectionText('exercise-detail-harder-text')).toBe(`Trudniej: ${golden.patient?.harder}`);
  });

  it('bezpieczeństwo ma „Przerwij, gdy”, przeciwwskazania i regułę bólu', () => {
    renderReadView(v33Record);
    const safety = within(screen.getByTestId('exercise-detail-safety'));
    expect(safety.getByTestId('exercise-detail-stop-if-text').textContent).toBe(
      `Przerwij, gdy…${golden.safety?.stop_if}`
    );
    const contraindications = safety.getByTestId('exercise-detail-safety-contraindications');
    expect(within(contraindications).getByText('Przeciwwskazania:')).toBeInTheDocument();
    expect(within(contraindications).getByRole('listitem').textContent).toBe(
      golden.safety?.contraindications?.[0]?.text
    );
    expect(safety.getByTestId('exercise-detail-pain-rule-text').textContent).toBe('Reguła bólu: WS-3');
    expect(safety.queryByText('Wymaga nadzoru fizjoterapeuty')).not.toBeInTheDocument();
  });

  it('ostrożności dla grup szczególnych stoją na końcu bezpieczeństwa, zdanie w linii, bez kodu grupy', () => {
    renderReadView({
      ...v33Record,
      enrichmentData: {
        ...golden,
        safety: {
          ...golden.safety,
          precautions: [
            { group: 'ciaza', text: 'W ciąży po 20. tygodniu ćwicz w pozycji półleżącej.' },
            { group: 'endoproteza_biodra', text: 'Po endoprotezie biodra nie krzyżuj nóg.' },
            { group: 'inne' },
          ],
        },
      },
    });
    const safety = screen.getByTestId('exercise-detail-safety');
    const precautions = within(safety).getByTestId('exercise-detail-safety-precautions');
    expect(within(precautions).getByText('Ostrożności dla grup szczególnych:')).toBeInTheDocument();
    expect(within(precautions).getByText('Pacjent widzi je w osobnym bloku na końcu karty ćwiczenia.')).toBeInTheDocument();
    expect(within(precautions).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'W ciąży po 20. tygodniu ćwicz w pozycji półleżącej.',
      'Po endoprotezie biodra nie krzyżuj nóg.',
    ]);
    expect(precautions.textContent).not.toContain('ciaza');
    expect(safety.lastElementChild?.lastElementChild).toBe(precautions);
  });

  it('bez ostrożności nie ma ich nagłówka; same ostrożności wystarczą, żeby pokazać sekcję', () => {
    const { unmount } = renderReadView(v33Record);
    expect(screen.queryByTestId('exercise-detail-safety-precautions')).not.toBeInTheDocument();
    expect(screen.queryByText(/Ostrożności dla grup szczególnych/)).not.toBeInTheDocument();
    unmount();

    renderReadView({
      enrichmentData: { schemaVersion: '3.3', safety: { precautions: [{ group: 'senior', text: 'Ćwicz przy stabilnym oparciu.' }] } },
    });
    expect(sectionText('exercise-detail-safety')).toContain('Ćwicz przy stabilnym oparciu.');
  });

  it('rekord stary nie pokazuje ostrożności, nawet gdy dokument ma ten klucz', () => {
    renderReadView({
      ...legacyRecord,
      enrichmentData: {
        ...legacyRecord.enrichmentData,
        safety: { ...legacyRecord.enrichmentData.safety, precautions: [{ group: 'ciaza', text: 'Nie dla starego rekordu.' }] },
      },
    });
    expect(screen.queryByTestId('exercise-detail-safety-precautions')).not.toBeInTheDocument();
    expect(screen.queryByText('Nie dla starego rekordu.')).not.toBeInTheDocument();
  });

  it('blok fizjoterapeuty ma punkty kontrolne, uwagi kliniczne i wskazania jako kody', () => {
    renderReadView(v33Record);
    const therapist = within(screen.getByTestId('exercise-detail-therapist'));
    const checkpoints = within(therapist.getByTestId('exercise-detail-checkpoints')).getAllByRole('listitem');
    expect(checkpoints.map((item) => item.textContent)).toEqual(
      golden.therapist?.checkpoints?.map((checkpoint) => checkpoint.text)
    );
    expect(therapist.getByTestId('exercise-detail-therapist-note').textContent).toBe(
      'Uwagi kliniczne: Dobre na start po rekonstrukcji ACL.'
    );
    const indications = within(therapist.getByTestId('exercise-detail-indications')).getAllByRole('listitem');
    expect(indications.map((item) => item.textContent)).toEqual(['osteoarthritis', 'patellofemoral_syndrome']);
  });

  it('sprzęt: nazwa, liczba sztuk powyżej jednej, wymagany albo opcjonalny, zamienniki', () => {
    renderReadView(v33Record);
    expect(sectionText('exercise-detail-equipment-item-0')).toBe('mały zrolowany ręcznikwymagany');
    expect(sectionText('exercise-detail-equipment-item-1')).toBe('taśma × 2opcjonalnyZamienniki: pasek, ręcznik');
  });

  it('nie pokazuje pól zespołu: pochodzenia, cyklu życia ani wyników audytu', () => {
    const { container } = renderReadView(v33Record);
    for (const teamOnly of ['h2g-17392', 'ai_audited', 'export_v33', 'PAR2', 'demo_only', 'permission_demo']) {
      expect(container.textContent).not.toContain(teamOnly);
    }
  });

  it('puste pola 3.3 nie zostawiają nagłówków ani pustych sekcji', () => {
    renderReadView({
      patientDescription: 'STARY OPIS Z KOLUMNY',
      clinicalDescription: 'STARY OPIS KLINICZNY',
      enrichmentData: { schemaVersion: '3.3', patient: { steps: ['Usiądź.'] } },
    });
    for (const testId of [
      'exercise-detail-patient-lead',
      'exercise-detail-patient-extras',
      'exercise-detail-safety',
      'exercise-detail-therapist',
      'exercise-detail-metadata',
    ]) {
      expect(screen.queryByTestId(testId)).not.toBeInTheDocument();
    }
    expect(sectionText('exercise-execution-steps-list')).toBe('1Usiądź.');
  });
});

describe('widok ćwiczenia, rekord podniesiony mechanicznie do 3.3', () => {
  // Znacznik wersji dopisany do starego dokumentu: kolumny i stare klucze terapeuty wciąż wypełnione.
  const raised: ReadViewRecord = {
    ...legacyRecord,
    enrichmentData: {
      ...legacyRecord.enrichmentData,
      schemaVersion: '3.3',
      therapist: { ...legacyRecord.enrichmentData.therapist, note: 'Uwaga na koślawienie (przeniesione).' },
    },
  };

  it('instrukcja jest raz: kroki i podsumowanie bez opisu z kolumny', () => {
    const { container } = renderReadView(raised);
    expect(container.textContent).not.toContain('Stań prosto.');
    expect(container.textContent).not.toContain('Wzorzec przysiadu.');
    expect(sectionText('exercise-detail-patient-lead')).toBe(
      'Instrukcja dla pacjentaKrótkie podsumowaniePrzysiad do krzesła.'
    );
    expect(sectionText('exercise-execution-steps-list')).toBe('1Stań przed krzesłem.2Usiądź i wstań.');
  });

  it('stare klucze, które 3.3 wycofało, nie są czytane; uwagi kliniczne idą z nowego pola', () => {
    renderReadView(raised);
    expect(sectionText('exercise-detail-therapist')).toBe(
      'Dla fizjoterapeuty' +
        'Uwagi kliniczne: Uwaga na koślawienie (przeniesione).' +
        'Faza rehabilitacji:faza II' +
        'Korzyści terapeutyczne:siła'
    );
    expect(sectionText('exercise-detail-safety')).toBe(
      'BezpieczeństwoWymaga nadzoru fizjoterapeutyPrzerwij, gdy…Zawroty głowy\nOstry ból kolana'
    );
  });

  it('kolumny bez pola w kontrakcie zostają: wskazówka fizjoterapeuty i polecenie audio', () => {
    renderReadView(raised);
    expect(sectionText('exercise-detail-metadata')).toContain('Wskazówka fizjoterapeuty: Korzyści: siła nóg');
    expect(sectionText('exercise-audio-cue-main')).toContain('Plecy proste');
  });
});
