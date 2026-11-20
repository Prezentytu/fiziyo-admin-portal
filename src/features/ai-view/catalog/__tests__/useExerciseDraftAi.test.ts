import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clearExerciseDrafts } from '../exerciseDraftStore';
import { DRAFT_SECTIONS, useExerciseDraftAi, type DraftFill, type DraftSection } from '../useExerciseDraftAi';

const { ai } = vi.hoisted(() => ({
  ai: {
    suggestExercise: vi.fn(),
    generateEnrichment: vi.fn(),
    generateExerciseImage: vi.fn(),
  },
}));
vi.mock('@/services/aiService', () => ({ aiService: ai }));

const SUGGESTION = {
  type: 'time',
  exerciseSide: 'none',
  sets: 3,
  reps: null,
  duration: 30,
  restSets: 60,
  description: 'Opis z propozycji parametrów.',
  advancedParams: { tempo: null, weight: null, rangeOfMotion: null, preparationTime: 5, executionTime: null },
};

const ENRICHMENT = {
  success: true,
  enrichmentData: {
    $schema: 'fiziyo-exercise-v3',
    patient: {
      summary: 'Trzymasz sztangę nad głową.',
      steps: ['Stań', 'Wypchnij sztangę'],
      cues: ['Żebra w dół'],
      mistakes: [{ mistake: 'Wyginanie lędźwi', fix: 'napnij brzuch' }],
    },
    safety: { stop_if: 'Ból barku' },
  },
};

const IMAGE = new File(['x'], 'cwiczenie.png', { type: 'image/png' });

function setup() {
  const fills: DraftFill[] = [];
  const order: DraftSection[] = [];
  const hook = renderHook(() =>
    useExerciseDraftAi({
      draftKey: 'm1',
      onFill: (fill) => {
        fills.push(fill);
        order.push(fill.section);
      },
      imageInput: () => ({ description: 'Opis', type: 'time' }),
    })
  );
  return { hook, fills, order };
}

async function runAll(promise: Promise<void>) {
  await act(async () => {
    await vi.runAllTimersAsync();
    await promise;
  });
}

describe('useExerciseDraftAi', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clearExerciseDrafts();
    ai.suggestExercise.mockResolvedValue({ status: 'ok', suggestion: SUGGESTION });
    ai.generateEnrichment.mockResolvedValue(ENRICHMENT);
    ai.generateExerciseImage.mockResolvedValue({ status: 'ok', file: IMAGE });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('nothing runs and nothing shows before „Generuj”', () => {
    const { hook } = setup();
    expect(Object.values(hook.result.current.sections)).toEqual(DRAFT_SECTIONS.map(() => 'hidden'));
    expect(ai.suggestExercise).not.toHaveBeenCalled();
  });

  it('unfolds the sections in order, ending with the picture, and remembers the name', async () => {
    const { hook, fills, order } = setup();
    await runAll(hook.result.current.generate('Core sztanga nad głową'));

    expect(order).toEqual(['params', 'description', 'steps', 'cues', 'more', 'image']);
    expect(fills).toContainEqual({ section: 'description', text: 'Trzymasz sztangę nad głową.' });
    expect(fills).toContainEqual({
      section: 'more',
      mistakes: 'Wyginanie lędźwi → napnij brzuch',
      stopIf: 'Ból barku',
    });
    expect(fills.find((fill) => fill.section === 'params')).toMatchObject({
      params: { type: 'time', executionTime: 30 },
    });
    expect(hook.result.current.sections).toEqual(
      Object.fromEntries(DRAFT_SECTIONS.map((section) => [section, 'done']))
    );
    expect(hook.result.current.generatedFor).toBe('Core sztanga nad głową');
    expect(ai.generateExerciseImage).toHaveBeenCalledWith('Core sztanga nad głową', 'Opis', 'time');
  });

  it('marks only the section AI did not answer as failed, the rest still fills', async () => {
    ai.generateEnrichment.mockResolvedValue({
      success: true,
      enrichmentData: { $schema: 'fiziyo-exercise-v3', patient: { summary: 'Opis.', cues: ['Żebra w dół'] } },
    });
    ai.generateExerciseImage.mockResolvedValue({ status: 'error', code: 'rate_limited', message: 'x' });
    const { hook } = setup();
    await runAll(hook.result.current.generate('Plank'));

    expect(hook.result.current.sections).toMatchObject({
      params: 'done',
      description: 'done',
      steps: 'failed',
      cues: 'done',
      more: 'failed',
      image: 'failed',
    });
  });

  it('falls back to the parameter proposal for the description when the card has none', async () => {
    ai.generateEnrichment.mockResolvedValue({ success: false });
    const { hook, fills } = setup();
    await runAll(hook.result.current.generate('Plank'));

    expect(fills).toContainEqual({ section: 'description', text: 'Opis z propozycji parametrów.' });
  });

  it('generates one section again without touching the others', async () => {
    const { hook, order } = setup();
    await runAll(hook.result.current.generate('Plank'));
    order.length = 0;
    vi.clearAllMocks();
    ai.generateEnrichment.mockResolvedValue(ENRICHMENT);

    await runAll(hook.result.current.generate('Plank boczny', ['steps']));

    expect(order).toEqual(['steps']);
    expect(hook.result.current.generatedFor).toBe('Plank');
    expect(ai.suggestExercise).not.toHaveBeenCalled();
    expect(ai.generateExerciseImage).not.toHaveBeenCalled();
    expect(hook.result.current.sections.steps).toBe('done');
  });

  it('shows every section at once to fill by hand', () => {
    const { hook } = setup();
    act(() => hook.result.current.showAll());
    expect(Object.values(hook.result.current.sections).every((state) => state === 'done')).toBe(true);
    expect(ai.suggestExercise).not.toHaveBeenCalled();
  });
});
