import { describe, expect, it } from 'vitest';

import { evaluateParameters } from '../parameterRules';
import {
  hasPatientVideo,
  canDecideOnExercise,
  computeVerificationStages,
  formatStageCount,
  countStopIfSymptoms,
  listContentGaps,
  type VerificationStagesInput,
} from '../verificationStages';

const readyInput: VerificationStagesInput = {
  name: 'Przysiad',
  patientDescription: 'Stań w lekkim rozkroku, zejdź biodrami w dół i wróć do pozycji wyjściowej spokojnie.',
  therapistDescription: 'Wzmacnia mięśnie czworogłowe ud.',
  hasVideo: true,
  imageCount: 3,
  hasPendingPhoto: false,
  parameters: evaluateParameters({
    values: { sets: 3, reps: 12, repTime: 3, hold: null, rest: 60 },
    mode: 'reps',
    side: 'none',
  }),
  descriptionNumberCount: 0,
  hasPendingProposal: false,
  stopIfCount: 1,
};

describe('computeVerificationStages', () => {
  it('pozwala opublikować, gdy żaden etap nie ma uwag', () => {
    const result = computeVerificationStages(readyInput);

    expect(result.canPublish).toBe(true);
    expect(result.openStages).toEqual([]);
  });

  it('blokuje publikację i wskazuje etapy do poprawy', () => {
    const result = computeVerificationStages({
      ...readyInput,
      parameters: evaluateParameters({
        values: { sets: 100, reps: 1000, repTime: null, hold: null, rest: 300 },
        mode: 'reps',
        side: 'none',
      }),
      stopIfCount: 0,
    });

    expect(result.canPublish).toBe(false);
    expect(result.openStages).toEqual(['parameters', 'safety']);
    expect(result.issues.decision.length).toBe(result.issues.parameters.length + result.issues.safety.length);
  });

  it('brak nagrania nie blokuje, brak jakiegokolwiek materiału tak', () => {
    expect(computeVerificationStages({ ...readyInput, hasVideo: false }).canPublish).toBe(true);
    expect(computeVerificationStages({ ...readyInput, hasVideo: false, imageCount: 0 }).openStages).toEqual([
      'material',
    ]);
  });

  it('nieprzyjęte zdjęcie i propozycja agenta zostawiają etap otwarty', () => {
    const result = computeVerificationStages({ ...readyInput, hasPendingPhoto: true, hasPendingProposal: true });
    expect(result.openStages).toEqual(['material', 'instruction']);
  });

  it('pilnuje dotychczasowych minimów opisów', () => {
    const result = computeVerificationStages({ ...readyInput, patientDescription: 'Krótko', therapistDescription: '' });
    expect(result.openStages).toEqual(['instruction', 'safety']);
  });
});

describe('countStopIfSymptoms', () => {
  it('liczy objawy bez nagłówków grup i pustych linii', () => {
    const stopIf = [
      'Natychmiast przerwij i zadzwoń pod 112, jeśli pojawi się:',
      '- ból lub ucisk w klatce piersiowej',
      '- duszność, która nie mija',
      '',
      'Przerwij, usiądź i odpocznij:',
      '- zawroty głowy',
    ].join('\n');

    expect(countStopIfSymptoms(stopIf)).toBe(3);
    expect(countStopIfSymptoms('Ostry ból kolana')).toBe(1);
    expect(countStopIfSymptoms(undefined)).toBe(0);
  });
});

describe('formatStageCount', () => {
  it('odmienia liczbę etapów', () => {
    expect(formatStageCount(1)).toBe('1 etap');
    expect(formatStageCount(3)).toBe('3 etapy');
    expect(formatStageCount(5)).toBe('5 etapów');
    expect(formatStageCount(12)).toBe('12 etapów');
    expect(formatStageCount(22)).toBe('22 etapy');
  });
});

describe('długie ćwiczenie potwierdzone „OK”', () => {
  it('nie blokuje publikacji po potwierdzeniu', () => {
    const longExercise = { sets: 5, reps: 20, repTime: 6, hold: null, rest: 120 };
    const open = computeVerificationStages({
      ...readyInput,
      parameters: evaluateParameters({ values: longExercise, mode: 'reps', side: 'both' }),
    });
    expect(open.canPublish).toBe(false);

    const acknowledged = computeVerificationStages({
      ...readyInput,
      parameters: evaluateParameters({
        values: longExercise,
        mode: 'reps',
        side: 'both',
        acknowledgedSessionSeconds: 5 * 20 * 6 * 2 + 4 * 120,
      }),
    });
    expect(acknowledged.canPublish).toBe(true);
  });
});

describe('canDecideOnExercise', () => {
  it('nie pozwala publikować ani oznaczać duplikatu ćwiczenia, które jest już w bazie', () => {
    expect(canDecideOnExercise('PUBLISHED')).toBe(false);
    expect(canDecideOnExercise('ARCHIVED_GLOBAL')).toBe(false);
    expect(canDecideOnExercise('PENDING_REVIEW')).toBe(true);
    expect(canDecideOnExercise('CHANGES_REQUESTED')).toBe(true);
  });
});

describe('hasPatientVideo', () => {
  it('sam GIF nie zdejmuje braku nagrania, bo player pacjenta go nie pokazuje', () => {
    expect(hasPatientVideo({ videoUrl: null, gifUrl: 'https://cdn.example.com/ruch.gif' })).toBe(false);
    expect(hasPatientVideo({ videoUrl: '  ', gifUrl: null })).toBe(false);
    expect(hasPatientVideo({ videoUrl: 'https://cdn.example.com/film.mp4', gifUrl: null })).toBe(true);
  });
});

describe('listContentGaps', () => {
  it('karta ćwiczenia widzi te same braki treści co bramka publikacji', () => {
    const gaps = listContentGaps({
      name: 'Przysiad',
      patientDescription: 'Krótko',
      therapistDescription: '',
      hasVideo: false,
      imageCount: 0,
      stopIfCount: 0,
    });
    const stages = computeVerificationStages({
      ...readyInput,
      patientDescription: 'Krótko',
      therapistDescription: '',
      hasVideo: false,
      imageCount: 0,
      stopIfCount: 0,
    });

    expect(gaps.map((gap) => gap.text)).toEqual(stages.issues.decision.map((issue) => issue.text));
    expect(gaps).toHaveLength(4);
  });

  it('pełna karta nie ma braków', () => {
    expect(listContentGaps(readyInput)).toEqual([]);
  });
});
