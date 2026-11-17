import { describe, expect, it } from 'vitest';

import type { AiExerciseVariant } from '@/features/exercises/utils/aiFullExercise';
import { freshIdeas } from '../exerciseIdeas';

const idea = (name: string): AiExerciseVariant => ({
  name,
  position: null,
  equipment: null,
  side: 'none',
  level: 'unknown',
});

describe('freshIdeas', () => {
  it('drops ideas the catalog already has, ignoring case and Polish letters', () => {
    const ideas = [idea('Mostek biodrowy'), idea('Ślizg pięty w leżeniu'), idea('Przysiad przy ścianie')];

    expect(freshIdeas(ideas, ['MOSTEK BIODROWY', 'Slizg piety w lezeniu']).map((item) => item.name)).toEqual([
      'Przysiad przy ścianie',
    ]);
  });

  it('keeps one idea per name', () => {
    expect(freshIdeas([idea('Plank'), idea('plank '), idea('')], [])).toHaveLength(1);
  });
});
