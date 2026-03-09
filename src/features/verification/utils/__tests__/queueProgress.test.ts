import { describe, expect, it } from 'vitest';

import { buildQueueProgressModel } from '../queueProgress';

describe('buildQueueProgressModel', () => {
  it('zwraca opisowy model kolejki dla pozycji w trakcie', () => {
    const model = buildQueueProgressModel(1, 52, 51);

    expect(model).toEqual({
      summary: 'Ćwiczenie 1 z 52 do weryfikacji',
      details: 'Po decyzji zostanie 51 ćwiczeń',
      progressPercent: expect.any(Number),
    });
    expect(model?.progressPercent).toBeCloseTo(1.923, 2);
  });

  it('zwraca komunikat o ostatnim ćwiczeniu', () => {
    const model = buildQueueProgressModel(52, 52, 0);

    expect(model?.summary).toBe('Ćwiczenie 52 z 52 do weryfikacji');
    expect(model?.details).toBe('To ostatnie ćwiczenie w kolejce');
    expect(model?.progressPercent).toBe(100);
  });

  it('zwraca null gdy brak pozycji lub brak kolejki', () => {
    expect(buildQueueProgressModel(null, 12, 11)).toBeNull();
    expect(buildQueueProgressModel(1, 0, 0)).toBeNull();
  });
});
