import { describe, expect, it } from 'vitest';

import { buildStageCopy, type StageCopyInput } from '../stageCopy';
import type { StageIssue, VerificationStagesResult } from '../verificationStages';

const cleanStages: VerificationStagesResult = {
  issues: { material: [], parameters: [], instruction: [], safety: [], decision: [] },
  openStages: [],
  canPublish: true,
};

function input(overrides: Partial<StageCopyInput> = {}): StageCopyInput {
  return {
    stages: cleanStages,
    parameters: { findings: [], blockingCount: 0, sessionLevel: 'ok' },
    hasPendingPhoto: false,
    hasPendingProposal: false,
    hasVideo: true,
    photoLabel: '3 zdjęcia',
    sessionLine: '3 × 12 · ≈ 4 min',
    stopIfCount: 2,
    canDecide: true,
    signerName: 'Anna Nowak',
    ...overrides,
  };
}

describe('buildStageCopy', () => {
  it('summarises a clean exercise', () => {
    const { subs, hints } = buildStageCopy(input());
    expect(subs.material).toBe('3 zdjęcia · nagranie');
    expect(subs.parameters).toBe('3 × 12 · ≈ 4 min');
    expect(subs.safety).toBe('2 objawy przerwania');
    expect(subs.decision).toBe('Zatwierdź');
    expect(hints.decision).toBe('Trafi do bazy z podpisem: Anna Nowak.');
  });

  it('puts pending decisions first', () => {
    const { subs, hints } = buildStageCopy(input({ hasPendingPhoto: true, hasPendingProposal: true }));
    expect(subs.material).toBe('Nowe zdjęcie do przyjęcia');
    expect(subs.instruction).toBe('Propozycja do decyzji');
    expect(hints.instruction).toBe('Wstaw propozycję agenta albo ją pomiń.');
  });

  it('separates fields to fix from a too long session', () => {
    const issue: StageIssue = { stage: 'parameters', text: 'x' };
    const stages = { ...cleanStages, issues: { ...cleanStages.issues, parameters: [issue] } };
    const fieldLimit = buildStageCopy(
      input({
        stages,
        parameters: {
          findings: [{ key: 'reps', level: 'limit', text: 'x', canAcknowledge: false }],
          blockingCount: 1,
          sessionLevel: 'limit',
        },
      })
    );
    expect(fieldLimit.subs.parameters).toBe('Do poprawy: 1');
    expect(fieldLimit.hints.parameters).toBe('Popraw zaznaczone parametry: 1.');

    const sessionLimit = buildStageCopy(
      input({
        stages,
        parameters: {
          findings: [{ key: 'session', level: 'limit', text: 'x', canAcknowledge: false }],
          blockingCount: 1,
          sessionLevel: 'limit',
        },
      })
    );
    expect(sessionLimit.hints.parameters).toBe('Za długie ćwiczenie: zmniejsz serie, powtórzenia albo przerwę.');
  });

  it('asks for stop symptoms when none are listed', () => {
    const issue: StageIssue = { stage: 'safety', text: 'Dodaj objaw przerwania.' };
    const stages = {
      issues: { ...cleanStages.issues, safety: [issue] },
      openStages: ['safety' as const],
      canPublish: false,
    };
    const { subs, hints } = buildStageCopy(input({ stages, stopIfCount: 0 }));
    expect(subs.safety).toBe('Brak objawów przerwania');
    expect(hints.safety).toBe('Dodaj objaw przerwania.');
    expect(hints.decision).toBe('Najpierw popraw: Bezpieczeństwo.');
  });

  it('marks a published exercise as already in the catalog', () => {
    const { subs, hints } = buildStageCopy(input({ canDecide: false }));
    expect(subs.decision).toBe('Już w bazie');
    expect(hints.decision).toBe('Ćwiczenie jest już w bazie. Poprawki zapisują się od razu.');
  });
});
