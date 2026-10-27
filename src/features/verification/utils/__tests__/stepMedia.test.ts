import { describe, expect, it } from 'vitest';

import {
  realignMediaForBlankEntries,
  cycleStepImage,
  describeReadingFocus,
  resolveFocusedMedia,
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

describe('describeReadingFocus', () => {
  const base = {
    steps: ['Stań prosto', 'Zejdź w dół', ''],
    stepImages: [{ step: 2, url: 'b.jpg' }],
    photos: ['a.jpg', 'b.jpg'],
    description: 'Przysiad z masą ciała.',
    hasVideo: true,
  };

  it('pairs the description with the video', () => {
    expect(describeReadingFocus({ ...base, focusedStep: null })).toEqual({
      isDescription: true,
      label: 'Opis porównaj z nagraniem',
      text: 'Przysiad z masą ciała.',
      photoUrl: null,
      photoIndex: null,
    });
    expect(describeReadingFocus({ ...base, focusedStep: null, hasVideo: false }).label).toBe(
      'Opis porównaj ze zdjęciami'
    );
  });

  it('shows the photo pinned to the step being read', () => {
    expect(describeReadingFocus({ ...base, focusedStep: 1 })).toEqual({
      isDescription: false,
      label: 'Krok 2 · zdjęcie 2',
      text: 'Zejdź w dół',
      photoUrl: 'b.jpg',
      photoIndex: 1,
    });
  });

  it('says when a step has no photo or no text', () => {
    expect(describeReadingFocus({ ...base, focusedStep: 0 }).label).toBe('Krok 1 · bez zdjęcia');
    expect(describeReadingFocus({ ...base, focusedStep: 2 }).text).toBe('Pusty krok');
  });

  it('ignores a pin to a photo that was removed', () => {
    const result = describeReadingFocus({ ...base, focusedStep: 1, photos: ['a.jpg'] });
    expect(result.photoUrl).toBeNull();
    expect(result.label).toBe('Krok 2 · bez zdjęcia');
  });

  it('falls back to the description when the step no longer exists', () => {
    expect(describeReadingFocus({ ...base, focusedStep: 5 }).label).toBe('Opis porównaj z nagraniem');
  });
});

describe('resolveFocusedMedia', () => {
  const items = [
    { kind: 'image' as const, src: 'https://cdn/a.jpg' },
    { kind: 'image' as const, src: 'https://cdn/b.jpg' },
    { kind: 'video' as const, src: 'https://youtu.be/x' },
  ];
  const photosOnly = items.slice(0, 2);

  it('follows a pin made right now, not the one before', () => {
    const readStep = (stepImages: Parameters<typeof cycleStepImage>[0]) =>
      describeReadingFocus({
        focusedStep: 0,
        steps: ['Stań prosto'],
        stepImages,
        photos: images,
        description: '',
        hasVideo: true,
      });
    expect(resolveFocusedMedia(items, readStep([]))).toEqual({ kind: 'item', index: 2 });
    const pinnedTwice = cycleStepImage(cycleStepImage([], 0, images), 0, images);
    expect(resolveFocusedMedia(items, readStep(pinnedTwice))).toEqual({ kind: 'item', index: 1 });
  });

  it('shows the video for the description and for a step without a photo', () => {
    expect(resolveFocusedMedia(items, { isDescription: true, photoUrl: null })).toEqual({ kind: 'item', index: 2 });
    expect(resolveFocusedMedia(items, { isDescription: false, photoUrl: null })).toEqual({ kind: 'item', index: 2 });
  });

  it('keeps the photos browsable for the description when there is no video', () => {
    expect(resolveFocusedMedia(photosOnly, { isDescription: true, photoUrl: null })).toEqual({ kind: 'free' });
  });

  it('shows nothing instead of another step photo when nothing matches', () => {
    expect(resolveFocusedMedia(photosOnly, { isDescription: false, photoUrl: null })).toEqual({ kind: 'empty' });
    expect(resolveFocusedMedia(items, { isDescription: false, photoUrl: 'https://cdn/removed.jpg' })).toEqual({
      kind: 'empty',
    });
  });
});
