interface ClipboardItemLike {
  kind: string;
  type: string;
  getAsFile: () => File | null;
}

interface AppendImagesOptions {
  maxFiles: number;
  maxSizeBytes: number;
}

export interface AppendImagesResult {
  files: File[];
  addedCount: number;
  oversizeCount: number;
  overLimitCount: number;
}

export function getClipboardImageFiles(items: ArrayLike<ClipboardItemLike> | null | undefined): File[] {
  if (!items) return [];
  return Array.from(items)
    .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
    .map((item) => item.getAsFile())
    .filter((file): file is File => file !== null);
}

export function appendImageFiles(current: File[], incoming: File[], options: AppendImagesOptions): AppendImagesResult {
  const accepted = incoming.filter((file) => file.size <= options.maxSizeBytes);
  const freeSlots = Math.max(0, options.maxFiles - current.length);
  const added = accepted.slice(0, freeSlots);

  return {
    files: [...current, ...added],
    addedCount: added.length,
    oversizeCount: incoming.length - accepted.length,
    overLimitCount: accepted.length - added.length,
  };
}
