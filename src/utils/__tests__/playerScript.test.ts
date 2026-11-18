import { describe, expect, it } from 'vitest';
import { calculateExerciseTotalSeconds } from '@/utils/exerciseTime';
import {
  buildPlayerScript,
  findPlayerScriptStep,
  playerScriptHintAt,
  type ExerciseSideType,
  type PlayerScriptGuidance,
  type PlayerScriptInput,
} from '@/utils/playerScript';
import vectorsFile from './fixtures/playerScript.vectors.json';

type VectorStep = [string, number, number, string | null, number, number, string, boolean];

interface Vector {
  name: string;
  input: PlayerScriptInput;
  plannedDurationSec: number;
  timelineDurationSec: number;
  steps: VectorStep[];
  hints: [number, number, string | null][];
}

const guidance = vectorsFile.guidance as PlayerScriptGuidance;
const vectors = vectorsFile.vectors as unknown as Vector[];

describe('buildPlayerScript: wspólne wektory z aplikacją', () => {
  it.each(vectors.map((vector) => [vector.name, vector] as const))('%s', (_name, vector) => {
    const script = buildPlayerScript(vector.input);

    expect(
      script.steps.map((step) => [
        step.kind,
        step.set,
        step.rep,
        step.side,
        step.startSec,
        step.durationSec,
        step.advance,
        step.countsInPlan,
      ])
    ).toEqual(vector.steps);
    expect(script.plannedDurationSec).toBe(vector.plannedDurationSec);
    expect(script.timelineDurationSec).toBe(vector.timelineDurationSec);

    for (const [index, elapsed, expected] of vector.hints) {
      expect(playerScriptHintAt(script.steps[index], guidance, elapsed)).toBe(expected);
    }
  });
});

describe('buildPlayerScript a czas ćwiczenia w portalu', () => {
  const sides: ExerciseSideType[] = ['none', 'left', 'right', 'both', 'alternating'];

  it('planowany czas scenariusza równa się calculateExerciseTotalSeconds', () => {
    for (const exerciseSide of sides) {
      for (const sets of [1, 2, 4]) {
        for (const reps of [1, 3, 10]) {
          for (const executionTimeSec of [0, 2, 5]) {
            for (const restReps of [0, 3]) {
              for (const restSets of [0, 30]) {
                for (const preparationTime of [0, 5]) {
                  const input = { sets, reps, executionTimeSec, restReps, restSets, preparationTime, exerciseSide };
                  const portal = calculateExerciseTotalSeconds({
                    sets,
                    reps,
                    executionTime: executionTimeSec,
                    restSets,
                    restReps,
                    preparationTime,
                    side: exerciseSide,
                  }).seconds;
                  expect(buildPlayerScript(input).plannedDurationSec).toBe(portal);
                }
              }
            }
          }
        }
      }
    }
  });

  it('findPlayerScriptStep zwraca krok w danej sekundzie, a po końcu null', () => {
    const script = buildPlayerScript({
      sets: 1,
      reps: 2,
      executionTimeSec: 3,
      restReps: 0,
      restSets: 0,
      preparationTime: 5,
      exerciseSide: 'none',
    });
    expect(findPlayerScriptStep(script, 0)?.kind).toBe('prepare');
    expect(findPlayerScriptStep(script, 6)?.rep).toBe(1);
    expect(findPlayerScriptStep(script, 9)?.rep).toBe(2);
    expect(findPlayerScriptStep(script, 11)).toBeNull();
  });
});
