import { describe, expect, it } from 'vitest';

import { appendImageFiles, getClipboardImageFiles } from '../clipboardImages';

function makeFile(name: string, size: number, type = 'image/png'): File {
  return new File([new Uint8Array(size)], name, { type });
}

function makeItem(kind: string, type: string, file: File | null) {
  return { kind, type, getAsFile: () => file };
}

describe('getClipboardImageFiles', () => {
  it('returns only image files from clipboard items', () => {
    const image = makeFile('shot.png', 10);
    const items = [
      makeItem('string', 'text/plain', null),
      makeItem('file', 'image/png', image),
      makeItem('file', 'application/pdf', makeFile('doc.pdf', 10, 'application/pdf')),
      makeItem('file', 'image/jpeg', null),
    ];

    expect(getClipboardImageFiles(items)).toEqual([image]);
  });

  it('returns empty list when clipboard has no items', () => {
    expect(getClipboardImageFiles(undefined)).toEqual([]);
  });
});

describe('appendImageFiles', () => {
  const options = { maxFiles: 3, maxSizeBytes: 100 };

  it('appends pasted images after existing ones', () => {
    const existing = [makeFile('a.png', 10)];
    const pasted = makeFile('b.png', 10);

    const result = appendImageFiles(existing, [pasted], options);

    expect(result.files).toEqual([existing[0], pasted]);
    expect(result.addedCount).toBe(1);
  });

  it('skips oversize images and stops at the file limit', () => {
    const existing = [makeFile('a.png', 10), makeFile('b.png', 10)];
    const tooBig = makeFile('big.png', 101);
    const first = makeFile('c.png', 10);
    const second = makeFile('d.png', 10);

    const result = appendImageFiles(existing, [tooBig, first, second], options);

    expect(result.files).toEqual([...existing, first]);
    expect(result).toMatchObject({ addedCount: 1, oversizeCount: 1, overLimitCount: 1 });
  });
});
