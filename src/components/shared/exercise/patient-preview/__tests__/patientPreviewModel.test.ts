import { describe, expect, it } from 'vitest';
import type { ExerciseExecutionCardData } from '../../types';
import {
  buildPatientPreviewBlocks,
  buildPatientPreviewDetails,
  buildPatientPreviewFrame,
  buildPatientPreviewNotes,
  buildPatientPreviewScript,
  resolvePatientPreviewSource,
} from '../patientPreviewModel';

function exercise(overrides: Partial<ExerciseExecutionCardData> = {}): ExerciseExecutionCardData {
  return {
    id: 'ex-1',
    displayName: 'Odwodzenie nogi w leżeniu bokiem',
    sets: 2,
    reps: 3,
    executionTime: 3,
    restSets: 20,
    restReps: 0,
    preparationTime: 5,
    side: 'both',
    enrichment: {
      schemaVersion: '3.3',
      patient: {
        steps: ['Połóż się na boku.', 'Unieś górną nogę.', 'Opuść powoli.'],
        cues: ['Ustaw biodra jedno nad drugim.', 'Prowadź piętą.', 'Nie odchylaj tułowia.'],
        cue_phases: [{ cue: 0, phase: 'preparation' }],
      },
    } as ExerciseExecutionCardData['enrichment'],
    ...overrides,
  };
}

describe('resolvePatientPreviewSource', () => {
  it('składa wskazówki jak aplikacja: przygotowanie z fazą i dwa pierwsze kroki, reszta do pracy', () => {
    const source = resolvePatientPreviewSource(exercise());
    expect(source.guidance.prepare).toEqual([
      'Ustaw biodra jedno nad drugim.',
      'Połóż się na boku.',
      'Unieś górną nogę.',
    ]);
    expect(source.guidance.work).toEqual(['Prowadź piętą.', 'Nie odchylaj tułowia.']);
    expect(source.guidance.rest).toEqual([]);
  });

  it('naprzemiennie na stronę podwaja powtórzenia, rekord bez wersji nie', () => {
    expect(resolvePatientPreviewSource(exercise({ side: 'alternating', alternatingPerSide: true })).input.reps).toBe(6);
    expect(resolvePatientPreviewSource(exercise({ side: 'alternating' })).input.reps).toBe(3);
  });

  it('stare ćwiczenie na czas bez czasu powtórzenia bierze duration', () => {
    const source = resolvePatientPreviewSource(exercise({ executionTime: 0, isTimeBased: true, duration: 30 }));
    expect(source.input.executionTimeSec).toBe(30);
    expect(resolvePatientPreviewSource(exercise({ executionTime: 0 })).input.executionTimeSec).toBe(0);
  });
});

describe('buildPatientPreviewFrame', () => {
  const source = resolvePatientPreviewSource(exercise());
  const script = buildPatientPreviewScript(source);

  it('przed startem ekran „Gotowe do startu”, po stuknięciu rusza przygotowanie', () => {
    const before = buildPatientPreviewFrame(source, script, 0, { started: false, paused: false });
    expect(before.screen).toBe('start');
    expect(before.side).toEqual({ side: 'left', word: 'Lewa', detail: '1/2' });
    const after = buildPatientPreviewFrame(source, script, 0, { started: true, paused: false });
    expect(after.screen).toBe('phase');
    expect(after.phaseLabel).toBe('Przygotuj się');
    expect(after.timerText).toBe('00:05');
    expect(after.hint).toBe('Ustaw biodra jedno nad drugim.');
  });

  it('przygotowanie prawej strony zaczyna się od zdania o zmianie strony', () => {
    const frame = buildPatientPreviewFrame(source, script, 15, { started: true, paused: false });
    expect(frame.phaseLabel).toBe('Przygotuj się');
    expect(frame.hint).toBe('Lewa strona zrobiona. Teraz prawa strona.');
    expect(frame.side?.detail).toBe('2/2');
  });

  it('bez przygotowania start ma własny ekran, a prawa strona ekran zmiany strony', () => {
    const noPrep = resolvePatientPreviewSource(exercise({ preparationTime: 0 }));
    const noPrepScript = buildPatientPreviewScript(noPrep);
    expect(buildPatientPreviewFrame(noPrep, noPrepScript, 0, { started: false, paused: false }).screen).toBe('start');
    expect(buildPatientPreviewFrame(noPrep, noPrepScript, 10, { started: true, paused: false }).screen).toBe(
      'sideSwitch'
    );
  });

  it('praca odhaczana pokazuje licznik i podpowiedź startu serii', () => {
    const manual = resolvePatientPreviewSource(exercise({ executionTime: 0, preparationTime: 0, side: 'none' }));
    const frame = buildPatientPreviewFrame(manual, buildPatientPreviewScript(manual), 1, {
      started: true,
      paused: false,
    });
    expect(frame.isManual).toBe(true);
    expect(frame.timerText).toBe('0');
    expect(frame.timerSuffix).toBe('/3');
    expect(frame.hint).toBe('Zacznij serię albo zakończ ją przyciskiem ✓');
  });

  it('po końcu osi ekran podsumowania, pauza zmienia ton', () => {
    expect(buildPatientPreviewFrame(source, script, 999, { started: true, paused: false }).screen).toBe('done');
    expect(buildPatientPreviewFrame(source, script, 6, { started: true, paused: true }).tone).toBe('paused');
  });

  it('kafelki na każdą stronę: pole na każdą stronę każdej serii (L, P), jak pasek serii w aplikacji', () => {
    const rightSide = buildPatientPreviewFrame(source, script, 20, { started: true, paused: false });
    expect(rightSide.tiles.map((tile) => [tile.label, tile.state])).toEqual([
      ['L', 'done'],
      ['P', 'current'],
      ['L', 'future'],
      ['P', 'future'],
    ]);
    expect(rightSide.tiles.map((tile) => tile.pairEnd)).toEqual([false, true, false, false]);
    const restBeforeSetTwo = buildPatientPreviewFrame(source, script, 42.5, { started: true, paused: false });
    expect(restBeforeSetTwo.tiles.map((tile) => tile.state)).toEqual(['done', 'done', 'current', 'future']);
  });

  it('naprzemiennie: kafelek bieżącej serii to para L+P, licznik dalej liczy ruchy', () => {
    const alternating = resolvePatientPreviewSource(exercise({ side: 'alternating', alternatingPerSide: true }));
    // 3 na stronę = 6 ruchów po 3 s po 5 s przygotowania; 12,5 s to połowa ruchu 3 (lewa, para 2).
    const frame = buildPatientPreviewFrame(alternating, buildPatientPreviewScript(alternating), 12.5, {
      started: true,
      paused: false,
    });
    const current = frame.tiles.find((tile) => tile.state === 'current');
    expect(frame.rep).toBe(3);
    expect(frame.repsTotal).toBe(6);
    expect(current?.state === 'current' ? current.reps : null).toEqual([
      { work: 1, rest: 0 },
      { work: 0.25, rest: 0 },
      { work: 0, rest: 0 },
    ]);
  });

  it('naprzemiennie z nieparzystą liczbą ruchów (stary rekord łącznie) zostaje przy kafelku na ruch', () => {
    const legacy = resolvePatientPreviewSource(exercise({ side: 'alternating' }));
    const frame = buildPatientPreviewFrame(legacy, buildPatientPreviewScript(legacy), 6, {
      started: true,
      paused: false,
    });
    const current = frame.tiles.find((tile) => tile.state === 'current');
    expect(current?.state === 'current' ? current.reps : []).toHaveLength(3);
  });

  it('kafelki bez stron: jedno pole na serię z numerem', () => {
    const single = resolvePatientPreviewSource(exercise({ side: 'none' }));
    const frame = buildPatientPreviewFrame(single, buildPatientPreviewScript(single), 6, {
      started: true,
      paused: false,
    });
    expect(frame.tiles.map((tile) => [tile.label, tile.state])).toEqual([
      ['1', 'current'],
      ['2', 'future'],
    ]);
  });
});

describe('oś i uwagi', () => {
  it('łączy powtórzenia serii w jeden blok i oznacza ekran zmiany strony', () => {
    const source = resolvePatientPreviewSource(exercise({ preparationTime: 0, sets: 1 }));
    const blocks = buildPatientPreviewBlocks(source, buildPatientPreviewScript(source));
    expect(blocks.map((block) => [block.label, block.durationSec, block.hatched])).toEqual([
      ['Seria 1 · lewa', 9, false],
      ['Ekran „Prawa strona”', 5, true],
      ['Seria 1 · prawa', 9, false],
    ]);
  });

  it('krótkie powtórzenie z kilkoma wskazówkami pracy daje uwagę o playerze', () => {
    const source = resolvePatientPreviewSource(exercise());
    const notes = buildPatientPreviewNotes(source, buildPatientPreviewScript(source));
    expect(notes.map((note) => note.level)).toContain('player');
  });
});

describe('zakres i dolny panel', () => {
  it('bez czasu powtórzenia parametry mówią, że powtórzenia są odhaczane', () => {
    const source = resolvePatientPreviewSource(exercise({ executionTime: 0 }));
    const details = buildPatientPreviewDetails(
      exercise({ executionTime: 0 }),
      source,
      buildPatientPreviewScript(source)
    );
    expect(details.parameters).toContainEqual({ label: 'Liczenie', value: 'odhaczane przyciskiem ✓' });
  });

  it('przerwa w playerze nazywa się „Odpocznij” jak w aplikacji', () => {
    const source = resolvePatientPreviewSource(exercise());
    const frame = buildPatientPreviewFrame(source, buildPatientPreviewScript(source), 30, {
      started: true,
      paused: false,
    });
    expect(frame.phaseLabel).toBe('Odpocznij');
  });

  it('rozwinięty panel: kroki i wskazówki numerowane, parametry z szacowanym czasem', () => {
    const source = resolvePatientPreviewSource(exercise());
    const details = buildPatientPreviewDetails(exercise(), source, buildPatientPreviewScript(source));
    expect(details.sections.map((section) => section.title)).toEqual(['Kroki wykonania', 'Wskazówki prowadzące']);
    expect(details.parameters.map((parameter) => parameter.label)).toEqual([
      'Serie',
      'Powtórzenia',
      'Czas powtórzenia',
      'Przerwa między seriami',
      'Przygotowanie',
      'Strona',
      'Szacowany czas',
    ]);
    expect(details.parameters[1].value).toBe('3 na stronę');
  });
});
