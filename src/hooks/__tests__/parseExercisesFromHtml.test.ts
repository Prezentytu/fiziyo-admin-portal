import { describe, expect, it } from 'vitest';

import { parseExercisesFromHtml } from '../useChat';

const plankHtml = `
<div class="exercise">
  <h2>Deska</h2>
  <ul>
    <li class="tag">core</li>
  </ul>
  <p>Hold</p>
  <ul>
    <li>Czas przygotowania: <b>5</b> sekund</li>
    <li>Liczba powtórzeń: <b>0</b></li>
    <li>Czas odpoczynku między powtórzeniami: <b>0</b> sekund</li>
    <li>Czas odpoczynku między seriami: <b>60</b> sekund</li>
    <li>Liczba serii: <b>3</b></li>
    <li>Długość ćwiczenia: <b>30</b> sekund</li>
  </ul>
</div>
`;

describe('parseExercisesFromHtml', () => {
  it('keeps hold duration separate from preparation time', () => {
    const [exercise] = parseExercisesFromHtml(plankHtml);

    expect(exercise).toMatchObject({
      name: 'Deska',
      preparationTime: '5',
      reps: '0',
      restBetweenSets: '60',
      sets: '3',
      duration: '30',
    });
  });
});
