import { describe, expect, it } from 'vitest';

import {
  realignMediaForBlankEntries,
  cycleStepImage,
  getCuePhase,
  keepExistingImages,
  removeCuePhaseAt,
  removeStepImageAt,
  replaceLinkedImage,
  setCuePhase,
  stepsForImage,
} from '../stepMedia';

const images = ['https://cdn/a.jpg', 'https://cdn/b.jpg'];

describe('step images', () => {
  it('przełącza zdjęcie kroku po kolei i wraca do „bez zdjęcia”', () => {
    const first = cycleStepImage([], 0, images);
    expect(first).toEqual([{ step: 1, url: images[0] }]);

    const second = cycleStepImage(first, 0, images);
    expect(second).toEqual([{ step: 1, url: images[1] }]);

    expect(cycleStepImage(second, 0, images)).toEqual([]);
  });

  it('po usunięciu kroku przesuwa numery kolejnych kroków', () => {
    const links = [
      { step: 1, url: images[0] },
      { step: 2, url: images[1] },
      { step: 3, url: images[0] },
    ];
    expect(removeStepImageAt(links, 1)).toEqual([
      { step: 1, url: images[0] },
      { step: 2, url: images[0] },
    ]);
  });

  it('pokazuje, które kroki pokazuje zdjęcie, i przenosi powiązanie na wymienione zdjęcie', () => {
    const links = [
      { step: 3, url: images[0] },
      { step: 1, url: images[0] },
    ];
    expect(stepsForImage(links, images[0])).toEqual([1, 3]);
    expect(stepsForImage(replaceLinkedImage(links, images[0], 'https://cdn/new.jpg'), 'https://cdn/new.jpg')).toEqual([
      1, 3,
    ]);
  });

  it('zapomina zdjęcia, których już nie ma', () => {
    expect(keepExistingImages([{ step: 1, url: 'https://cdn/gone.jpg' }], images)).toEqual([]);
  });
});

describe('cue phases', () => {
  it('domyślnie czyta wskazówkę w fazie pracy', () => {
    expect(getCuePhase(undefined, 0)).toBe('work');
  });

  it('zapisuje fazę i przesuwa indeksy po usunięciu wskazówki', () => {
    const links = setCuePhase(setCuePhase([], 2, 'rest'), 0, 'preparation');
    expect(links).toEqual([
      { cue: 0, phase: 'preparation' },
      { cue: 2, phase: 'rest' },
    ]);
    expect(removeCuePhaseAt(links, 0)).toEqual([{ cue: 1, phase: 'rest' }]);
  });
});

describe('realignMediaForBlankEntries', () => {
  it('przesuwa zdjęcia i fazy za wyczyszczonym krokiem i wskazówką', () => {
    const result = realignMediaForBlankEntries({
      steps: ['Stań', '  ', 'Wstań'],
      step_images: [
        { step: 1, url: 'a' },
        { step: 2, url: 'b' },
        { step: 3, url: 'c' },
      ],
      cues: ['', 'Oddychaj'],
      cue_phases: [
        { cue: 0, phase: 'preparation' },
        { cue: 1, phase: 'rest' },
      ],
    });

    expect(result.step_images).toEqual([
      { step: 1, url: 'a' },
      { step: 2, url: 'c' },
    ]);
    expect(result.cue_phases).toEqual([{ cue: 0, phase: 'rest' }]);
  });
});
