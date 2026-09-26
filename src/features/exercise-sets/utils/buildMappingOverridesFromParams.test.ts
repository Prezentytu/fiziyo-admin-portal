import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildMappingOverridesFromParams } from './buildMappingOverridesFromParams';

const repoRoot = resolve(__dirname, '../../../..');

describe('buildMappingOverridesFromParams', () => {
  it('writes Razem (none) into overridesJson when catalog side is Both', () => {
    const json = buildMappingOverridesFromParams(
      { side: 'both', exerciseSide: 'both' },
      { exerciseSide: 'none' }
    );

    expect(JSON.parse(json ?? '{}')).toEqual({ exerciseSide: 'none' });
  });

  it('returns null when builder keeps catalog Both', () => {
    expect(
      buildMappingOverridesFromParams(
        { side: 'both', exerciseSide: 'both' },
        { exerciseSide: 'both' }
      )
    ).toBeNull();
  });
});

describe('addExerciseToSet write-paths send overridesJson', () => {
  const filesWithSideEditor = [
    'src/features/exercise-sets/AddExerciseToSetDialog.tsx',
    'src/features/assignment/AssignmentWizard.tsx',
    'src/features/exercise-sets/CreateSetWizard.tsx',
    'src/features/exercise-sets/EditExerciseSetFullDialog.tsx',
    'src/features/patients/AddExerciseToPatientDialog.tsx',
    'src/features/exercise-sets/utils/createSetSubmit.ts',
  ];

  it.each(filesWithSideEditor)('%s includes overridesJson on the add-exercise payload', (relativePath) => {
    const source = readFileSync(resolve(repoRoot, relativePath), 'utf8');
    expect(source).toMatch(/overridesJson/);
  });
});
