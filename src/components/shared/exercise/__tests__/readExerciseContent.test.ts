import { describe, expect, it } from 'vitest';

import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';
import goldenV33 from './fixtures/enrichmentV33.fx-0073.json';
import { printableInstructionLines, readExerciseContent, type ExerciseContentSource } from '../readExerciseContent';

const golden = goldenV33 as ExerciseEnrichmentData;

const v2Document: ExerciseEnrichmentData = {
  simplified_instruction: 'Unieś biodra z leżenia.',
  patient_instruction: {
    pre_exercise: {
      instruction_steps: [{ step: 1, text: 'Połóż się na plecach.' }, { step: 2, text: ' Unieś biodra. ' }],
    },
  },
  therapist_notes: {
    clinical_notes: 'Kontrola miednicy.',
    clinical_indications: ['ból lędźwi'],
    contraindications: ['świeży uraz'],
    coaching_cues: [{ text: 'Napnij pośladki' }],
  },
  patient_notes: { why_this_exercise: 'Wzmacnia pośladki.', technique_reminders: ['Nie wyginaj lędźwi'] },
  feel_description: { should_feel: 'Pracę pośladków.', should_not_feel: 'Bólu w krzyżu.' },
  common_mistakes: [{ mistake: 'Za wysoko', fix: 'Zatrzymaj się w linii' }],
  safety: { stop_if: 'Ostry ból', requires_supervision: false },
  equipment: ['mata'],
};

const oldV3: ExerciseContentSource = {
  patientDescription: 'Stań prosto.\nZrób przysiad.',
  clinicalDescription: 'Wzorzec przysiadu.',
  notes: 'Korzyści: siła nóg',
  audioCue: 'Plecy proste',
  equipment: 'krzesło',
  side: 'BOTH',
  enrichmentData: {
    $schema: 'fiziyo-exercise-v3',
    patient: {
      summary: 'Przysiad do krzesła.',
      steps: ['Stań przed krzesłem.', 'Usiądź i wstań.'],
      cues: ['Stopy na szerokość bioder', 'Wstań', 'Odpocznij'],
      cue_phases: [
        { cue: 0, phase: 'preparation' },
        { cue: 2, phase: 'rest' },
      ],
    },
    therapist: { clinical_notes: 'Uwaga na koślawienie.', indications: ['ChZS kolana'], contraindications: ['ostry stan'] },
    safety: { stop_if: 'Zawroty głowy', intensity_guide: 'do 5/10' },
  },
};

describe('readExerciseContent: wersja rekordu', () => {
  it('bez znacznika wersji rekord jest stary', () => {
    expect(readExerciseContent(oldV3).version).toBe('legacy');
    expect(readExerciseContent(oldV3).schemaVersion).toBeNull();
    expect(readExerciseContent({ enrichmentData: v2Document }).version).toBe('legacy');
  });

  it('wersję 3.3 mówi dokument albo kolumna rekordu', () => {
    expect(readExerciseContent({ enrichmentData: { schemaVersion: '3.3' } }).version).toBe('3.3');
    expect(readExerciseContent({ schemaVersion: '3.3', enrichmentData: {} }).version).toBe('3.3');
    expect(readExerciseContent({ schemaVersion: 3.3, enrichmentData: null }).version).toBe('3.3');
    expect(readExerciseContent({ enrichmentData: { schemaVersion: '3.3' } }).schemaVersion).toBe('3.3');
  });

  it('wersje sprzed 3.3 i nieczytelne znaczniki zostają stare, późniejsze czytają się po nowemu', () => {
    for (const schemaVersion of ['3', '3.2', '2.0', 'abc', '', '  ']) {
      expect(readExerciseContent({ schemaVersion }).version).toBe('legacy');
    }
    expect(readExerciseContent({ schemaVersion: '3.4' }).version).toBe('3.3');
    expect(readExerciseContent({ schemaVersion: '3.10' }).version).toBe('3.3');
    expect(readExerciseContent({ schemaVersion: '4.0' }).version).toBe('3.3');
  });
});

describe('readExerciseContent: rekord stary', () => {
  it('dokument v2 czyta przez toV3', () => {
    const content = readExerciseContent({ enrichmentData: v2Document, patientDescription: 'Opis z kolumny' });

    expect(content.instruction).toEqual({
      summary: 'Unieś biodra z leżenia.',
      steps: ['Połóż się na plecach.', 'Unieś biodra.'],
      description: 'Opis z kolumny',
    });
    expect(content.cues).toEqual([
      { text: 'Napnij pośladki', phase: 'work' },
      { text: 'Nie wyginaj lędźwi', phase: 'work' },
    ]);
    expect(content.mistakes).toEqual([{ mistake: 'Za wysoko', fix: 'Zatrzymaj się w linii' }]);
    expect(content.why).toBe('Wzmacnia pośladki.');
    expect(content.shouldFeel).toBe('Pracę pośladków.');
    expect(content.shouldNotFeel).toBe('Bólu w krzyżu.');
    expect(content.stopIf).toBe('Ostry ból');
    expect(content.requiresSupervision).toBe(false);
    expect(content.therapistNote).toBe('Kontrola miednicy.');
    expect(content.indications).toEqual([{ code: null, text: 'ból lędźwi' }]);
    expect(content.contraindications).toEqual(['świeży uraz']);
    expect(content.equipment).toEqual([{ label: 'mata', code: null, qty: null, required: null, substitutes: [] }]);
  });

  it('stary v3 pokazuje opis z kolumny obok kroków i czyta stare miejsca pól', () => {
    const content = readExerciseContent(oldV3);

    expect(content.instruction.description).toBe('Stań prosto.\nZrób przysiad.');
    expect(content.instruction.summary).toBe('Przysiad do krzesła.');
    expect(content.instruction.steps).toHaveLength(2);
    expect(content.hasInstruction).toBe(true);
    expect(content.cues).toEqual([
      { text: 'Stopy na szerokość bioder', phase: 'preparation' },
      { text: 'Wstań', phase: 'work' },
      { text: 'Odpocznij', phase: 'rest' },
    ]);
    expect(content.clinicalDescription).toBe('Wzorzec przysiadu.');
    expect(content.therapistNote).toBe('Uwaga na koślawienie.');
    expect(content.contraindications).toEqual(['ostry stan']);
    expect(content.indications).toEqual([{ code: null, text: 'ChZS kolana' }]);
    expect(content.painRule).toBeNull();
    expect(content.safetyFlags).toEqual([]);
    expect(content.notes).toBe('Korzyści: siła nóg');
    expect(content.audioCue).toBe('Plecy proste');
    expect(content.equipment.map((item) => item.label)).toEqual(['krzesło']);
    expect(content.side).toEqual({ mode: 'BOTH', perSideDose: false, start: null, shownInMedia: null });
  });

  it('rekord bez dokumentu czyta same kolumny', () => {
    const content = readExerciseContent({
      description: 'Opis pod starą nazwą pola',
      clinicalDescription: ' Kliniczny ',
      exerciseSide: 'LEFT',
      equipment: 'guma',
      enrichmentData: null,
    });

    expect(content.version).toBe('legacy');
    expect(content.instruction).toEqual({ summary: null, steps: [], description: 'Opis pod starą nazwą pola' });
    expect(content.hasInstruction).toBe(true);
    expect(content.clinicalDescription).toBe('Kliniczny');
    expect(content.side.mode).toBe('LEFT');
    expect(content.equipment.map((item) => item.label)).toEqual(['guma']);
    expect(content.cues).toEqual([]);
    expect(content.breathing).toBeNull();
  });

  it('stary rekord nie udaje dawki na stronę, nawet gdy dokument ma klucz side', () => {
    const content = readExerciseContent({
      side: 'ALTERNATING',
      enrichmentData: { $schema: 'fiziyo-exercise-v3', side: { mode: 'alternating', per_side_dose: true } },
    });
    expect(content.side).toEqual({ mode: 'ALTERNATING', perSideDose: false, start: null, shownInMedia: null });
  });
});

describe('readExerciseContent: rekord 3.3', () => {
  it('wzorcowy rekord z paczki p001 oddaje wszystkie nowe pola', () => {
    const content = readExerciseContent({ enrichmentData: golden, side: 'BOTH' });

    expect(content.version).toBe('3.3');
    expect(content.schemaVersion).toBe('3.3');
    expect(content.instruction.summary).toBe(golden.patient?.summary);
    expect(content.instruction.steps).toEqual(golden.patient?.steps);
    expect(content.instruction.description).toBeNull();
    expect(content.hasInstruction).toBe(true);
    expect(content.cues).toHaveLength(6);
    expect(content.cues[0]).toEqual({ text: 'Napnij przód uda.', phase: 'work' });
    expect(content.cues[4]).toEqual({ text: 'Ręcznik pod kolanem, noga prosta.', phase: 'preparation' });
    expect(content.cues[5]).toEqual({ text: 'Rozluźnij udo całkowicie.', phase: 'rest' });
    expect(content.mistakes).toHaveLength(3);
    expect(content.why).toBe(golden.patient?.why);
    expect(content.whenToDo).toBe(golden.patient?.when_to_do);
    expect(content.shouldFeel).toBe(golden.patient?.should_feel);
    expect(content.shouldNotFeel).toBe(golden.patient?.should_not_feel);
    expect(content.easier).toBe(golden.patient?.easier);
    expect(content.harder).toBe(golden.patient?.harder);
    expect(content.breathing).toEqual({ text: golden.breathing?.text, pattern: null });
    expect(content.stopIf).toBe(golden.safety?.stop_if);
    expect(content.stopIf?.split('\n')).toHaveLength(2);
    expect(content.painRule).toBe('WS-3');
    expect(content.contraindications).toEqual([golden.safety?.contraindications?.[0]?.text]);
    expect(content.safetyFlags).toEqual([
      'supine_pregnancy',
      'floor_transfer_required',
      'supine_head_support',
      'orthostatic_transition',
      'valsalva_risk',
    ]);
    expect(content.requiresSupervision).toBe(false);
    expect(content.indications).toEqual([
      { code: 'osteoarthritis', text: null },
      { code: 'patellofemoral_syndrome', text: null },
    ]);
    expect(content.checkpoints).toHaveLength(5);
    expect(content.checkpoints[1]).toEqual({
      text: 'przy napięciu ręcznik się spłaszcza, rzepka przesuwa się w górę, kolano prostuje się mocniej',
      evidence: 'frame',
      view: 'closeup',
    });
    expect(content.therapistNote).toBeNull();
    expect(content.equipment).toEqual([
      { label: 'mata albo łóżko', code: 'mat', qty: 1, required: true, substitutes: [] },
      { label: 'mały zrolowany ręcznik', code: 'towel', qty: 1, required: true, substitutes: [] },
    ]);
    expect(content.side).toEqual({ mode: 'each_side', perSideDose: true, start: 'left', shownInMedia: 'right' });
    expect(content.clinicalDescription).toBeNull();
  });

  it('rekord podniesiony mechanicznie nie pokazuje starych kolumn opisu, choć wciąż są wypełnione', () => {
    const raised: ExerciseContentSource = {
      ...oldV3,
      enrichmentData: {
        ...(oldV3.enrichmentData as ExerciseEnrichmentData),
        schemaVersion: '3.3',
        therapist: {
          clinical_notes: 'Uwaga na koślawienie.',
          contraindications: ['ostry stan'],
          indications: ['ChZS kolana'],
          note: 'Uwaga na koślawienie (przeniesione).',
        },
      },
    };
    const content = readExerciseContent(raised);

    expect(content.version).toBe('3.3');
    expect(content.instruction.description).toBeNull();
    expect(content.clinicalDescription).toBeNull();
    expect(content.instruction.steps).toEqual(['Stań przed krzesłem.', 'Usiądź i wstań.']);
    expect(printableInstructionLines(content).join('\n')).not.toContain('Stań prosto.');
    // Fakty mają w 3.3 jedno miejsce: stare klucze terapeuty nie są czytane.
    expect(content.therapistNote).toBe('Uwaga na koślawienie (przeniesione).');
    expect(content.contraindications).toEqual([]);
    expect(content.indications).toEqual([]);
    // Kolumny bez pola w kontrakcie zostają czytelne; sprzęt z kolumny, gdy dokument nie ma equipment_items.
    expect(content.notes).toBe('Korzyści: siła nóg');
    expect(content.audioCue).toBe('Plecy proste');
    expect(content.equipment.map((item) => item.label)).toEqual(['krzesło']);
    expect(content.side.mode).toBe('BOTH');
    expect(content.side.perSideDose).toBe(false);
  });

  it('rekord 3.3 bez kroków i podsumowania nie ma instrukcji mimo wypełnionej kolumny opisu', () => {
    const content = readExerciseContent({ schemaVersion: '3.3', patientDescription: 'Stary opis', enrichmentData: {} });
    expect(content.hasInstruction).toBe(false);
    expect(printableInstructionLines(content)).toEqual([]);
  });

  it('dokument 3.3 bez $schema nie traci nowych kluczy', () => {
    const { $schema: _schema, ...withoutMarker } = golden;
    const content = readExerciseContent({ enrichmentData: withoutMarker });
    expect(content.checkpoints).toHaveLength(5);
    expect(content.equipment).toHaveLength(2);
  });
});

describe('readExerciseContent: odporność', () => {
  it('nie zmienia wejścia', () => {
    for (const source of [oldV3, { enrichmentData: v2Document }, { enrichmentData: golden }]) {
      const before = JSON.stringify(source);
      readExerciseContent(source);
      expect(JSON.stringify(source)).toBe(before);
    }
  });

  it('przyjmuje dokument jako tekst JSON', () => {
    expect(readExerciseContent({ enrichmentData: JSON.stringify(golden) })).toEqual(
      readExerciseContent({ enrichmentData: golden })
    );
  });

  it('pusty albo uszkodzony dokument daje pusty model, bez wyjątku', () => {
    const broken: unknown[] = [undefined, null, {}, '', '{zepsuty', '[]', 'null', 42, [], true];
    for (const enrichmentData of broken) {
      const content = readExerciseContent({ enrichmentData } as ExerciseContentSource);
      expect(content.version).toBe('legacy');
      expect(content.hasInstruction).toBe(false);
      expect(content.instruction).toEqual({ summary: null, steps: [], description: null });
      expect(content.equipment).toEqual([]);
    }
    expect(readExerciseContent(null).hasInstruction).toBe(false);
    expect(readExerciseContent(undefined).side.mode).toBeNull();
  });

  it('pola o złym typie są pomijane w obu wersjach', () => {
    const malformed = {
      patient: { summary: 7, steps: 'nie lista', cues: ['', 'Dobra', null, 5], cue_phases: [{ cue: 1, phase: 'zła' }, 'x'], mistakes: [{ fix: 'bez błędu' }, null, { mistake: 'Błąd' }] },
      therapist: { checkpoints: ['sam tekst', { text: ' ' }, { text: 'Punkt', view: 3 }], note: {} },
      safety: { stop_if: ['x'], contraindications: [{ text: 'P1' }, 'P2', {}], flags: [{ code: 'f1' }, 'f2', null], pain_rule: 3 },
      equipment_items: [{ code: 'mat' }, { label: 'Guma', qty: '2', substitutes: ['pasek', 1] }, 'x'],
      breathing: 'tekst',
      side: 'left',
      classification: { indications: 'kod' },
    };
    const asNew = readExerciseContent({ enrichmentData: { ...malformed, schemaVersion: '3.3' } } as unknown as ExerciseContentSource);

    expect(asNew.instruction).toEqual({ summary: null, steps: [], description: null });
    expect(asNew.cues).toEqual([{ text: 'Dobra', phase: 'work' }]);
    expect(asNew.mistakes).toEqual([{ mistake: 'Błąd', fix: null }]);
    expect(asNew.checkpoints).toEqual([
      { text: 'sam tekst', evidence: null, view: null },
      { text: 'Punkt', evidence: null, view: null },
    ]);
    expect(asNew.therapistNote).toBeNull();
    expect(asNew.stopIf).toBeNull();
    expect(asNew.painRule).toBeNull();
    expect(asNew.contraindications).toEqual(['P1', 'P2']);
    expect(asNew.safetyFlags).toEqual(['f1', 'f2']);
    expect(asNew.equipment).toEqual([
      { label: 'mat', code: 'mat', qty: null, required: null, substitutes: [] },
      { label: 'Guma', code: null, qty: null, required: null, substitutes: ['pasek'] },
    ]);
    expect(asNew.breathing).toBeNull();
    expect(asNew.side).toEqual({ mode: null, perSideDose: false, start: null, shownInMedia: null });
    expect(asNew.indications).toEqual([]);

    expect(() => readExerciseContent({ enrichmentData: malformed } as unknown as ExerciseContentSource)).not.toThrow();
    expect(
      readExerciseContent({ enrichmentData: malformed, patientDescription: 'Opis' } as unknown as ExerciseContentSource)
        .instruction.description
    ).toBe('Opis');
  });
});

describe('printableInstructionLines', () => {
  it('rekord stary z opisem drukuje opis, linia po linii', () => {
    expect(printableInstructionLines(readExerciseContent(oldV3))).toEqual(['Stań prosto.', 'Zrób przysiad.']);
  });

  it('bez opisu drukuje podsumowanie i ponumerowane kroki', () => {
    const lines = printableInstructionLines(readExerciseContent({ enrichmentData: golden }));
    expect(lines).toHaveLength(9);
    expect(lines[0]).toBe(golden.patient?.summary);
    expect(lines[1]).toBe(`1. ${golden.patient?.steps?.[0]}`);
    expect(lines[8]).toBe(`8. ${golden.patient?.steps?.[7]}`);
  });

  it('numerację można wyłączyć', () => {
    const content = readExerciseContent({ enrichmentData: { patient: { steps: ['A', 'B'] } } });
    expect(printableInstructionLines(content, { numbered: false })).toEqual(['A', 'B']);
  });
});
