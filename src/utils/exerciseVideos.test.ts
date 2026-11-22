import { describe, expect, it } from 'vitest';

import {
  MAX_EXERCISE_VIDEOS,
  addVideo,
  canAddVideo,
  getExerciseVideos,
  getMappingVideos,
  getVideoUrlError,
  isSameVideoList,
  moveVideo,
  normalizeVideoList,
  removeVideoAt,
  setVideoAt,
} from './exerciseVideos';

const FIRST = 'https://vimeo.com/111';
const SECOND = 'https://youtu.be/222';
const THIRD = 'https://cdn.example.com/three.mp4';

describe('getExerciseVideos', () => {
  it('returns the list with the main video first', () => {
    expect(getExerciseVideos({ videos: [FIRST, SECOND], videoUrl: FIRST })).toEqual([FIRST, SECOND]);
  });

  it('falls back to videoUrl when the list is missing, null or empty', () => {
    expect(getExerciseVideos({ videoUrl: FIRST })).toEqual([FIRST]);
    expect(getExerciseVideos({ videos: null, videoUrl: FIRST })).toEqual([FIRST]);
    expect(getExerciseVideos({ videos: [], videoUrl: FIRST })).toEqual([FIRST]);
    expect(getExerciseVideos({ videos: ['', '  '], videoUrl: FIRST })).toEqual([FIRST]);
  });

  it('does not add videoUrl to a list that already has videos', () => {
    expect(getExerciseVideos({ videos: [SECOND], videoUrl: FIRST })).toEqual([SECOND]);
  });

  it('removes duplicates and blank entries, keeping the order', () => {
    expect(getExerciseVideos({ videos: [FIRST, ` ${FIRST} `, null, '', SECOND, undefined] })).toEqual([FIRST, SECOND]);
  });

  it('returns an empty list when there is no video', () => {
    expect(getExerciseVideos(null)).toEqual([]);
    expect(getExerciseVideos(undefined)).toEqual([]);
    expect(getExerciseVideos({})).toEqual([]);
    expect(getExerciseVideos({ videos: [], videoUrl: null })).toEqual([]);
    expect(getExerciseVideos({ videoUrl: '   ' })).toEqual([]);
  });
});

describe('getMappingVideos', () => {
  it('prefers the videos of the mapping over those of the exercise', () => {
    expect(getMappingVideos({ videos: [THIRD], exercise: { videos: [FIRST, SECOND], videoUrl: FIRST } })).toEqual([
      THIRD,
    ]);
    expect(getMappingVideos({ videoUrl: THIRD, exercise: { videos: [FIRST] } })).toEqual([THIRD]);
  });

  it('falls back to the exercise when the mapping has none', () => {
    expect(getMappingVideos({ videos: null, exercise: { videos: [FIRST, SECOND] } })).toEqual([FIRST, SECOND]);
    expect(getMappingVideos({ videos: [], exercise: { videoUrl: FIRST } })).toEqual([FIRST]);
    expect(getMappingVideos({})).toEqual([]);
    expect(getMappingVideos(null)).toEqual([]);
  });
});

describe('normalizeVideoList', () => {
  it('cuts the list to the backend limit', () => {
    const videos = Array.from({ length: MAX_EXERCISE_VIDEOS + 3 }, (_, index) => `https://vimeo.com/${index}`);
    expect(normalizeVideoList(videos)).toEqual(videos.slice(0, MAX_EXERCISE_VIDEOS));
  });
});

describe('isSameVideoList', () => {
  it('ignores empty rows and surrounding spaces', () => {
    expect(isSameVideoList([FIRST], [` ${FIRST}`, ''])).toBe(true);
    expect(isSameVideoList([], [''])).toBe(true);
  });

  it('sees a changed order, an added and a removed video', () => {
    expect(isSameVideoList([FIRST, SECOND], [SECOND, FIRST])).toBe(false);
    expect(isSameVideoList([FIRST], [FIRST, SECOND])).toBe(false);
    expect(isSameVideoList([FIRST], [])).toBe(false);
  });
});

describe('list editing', () => {
  it('types into the single empty row of an empty list', () => {
    expect(setVideoAt([], 0, FIRST)).toEqual([FIRST]);
  });

  it('changes only the given row', () => {
    expect(setVideoAt([FIRST, SECOND], 1, THIRD)).toEqual([FIRST, THIRD]);
    expect(setVideoAt([FIRST], 4, THIRD)).toEqual([FIRST]);
  });

  it('adds an empty row, also next to the empty row of an empty list', () => {
    expect(addVideo([FIRST])).toEqual([FIRST, '']);
    expect(addVideo([])).toEqual(['', '']);
  });

  it('stops adding at the limit', () => {
    const full = Array.from({ length: MAX_EXERCISE_VIDEOS }, (_, index) => `https://vimeo.com/${index}`);
    expect(canAddVideo(full)).toBe(false);
    expect(addVideo(full)).toEqual(full);
    expect(canAddVideo(full.slice(1))).toBe(true);
  });

  it('removes a row, so the next one becomes the main video', () => {
    expect(removeVideoAt([FIRST, SECOND, THIRD], 0)).toEqual([SECOND, THIRD]);
  });

  it('moves a row up and down and ignores a move outside the list', () => {
    expect(moveVideo([FIRST, SECOND, THIRD], 2, 0)).toEqual([THIRD, FIRST, SECOND]);
    expect(moveVideo([FIRST, SECOND, THIRD], 0, 1)).toEqual([SECOND, FIRST, THIRD]);
    expect(moveVideo([FIRST, SECOND], 0, -1)).toEqual([FIRST, SECOND]);
    expect(moveVideo([FIRST, SECOND], 1, 2)).toEqual([FIRST, SECOND]);
  });
});

describe('getVideoUrlError', () => {
  it('accepts an empty row and a full address', () => {
    expect(getVideoUrlError([''], 0)).toBeNull();
    expect(getVideoUrlError([FIRST, THIRD], 1)).toBeNull();
  });

  it('rejects text that is not a full address', () => {
    expect(getVideoUrlError(['vimeo.com/111'], 0)).toMatch(/https/);
    expect(getVideoUrlError(['https://vimeo.com/1 2'], 0)).toMatch(/https/);
  });

  it('rejects an address over the length limit', () => {
    expect(getVideoUrlError([`https://vimeo.com/${'1'.repeat(500)}`], 0)).toMatch(/500/);
  });

  it('marks the repeated address, not its first use', () => {
    expect(getVideoUrlError([FIRST, FIRST], 0)).toBeNull();
    expect(getVideoUrlError([FIRST, FIRST], 1)).toMatch(/już na liście/);
  });
});
