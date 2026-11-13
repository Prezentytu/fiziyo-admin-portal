import { getMediaUrl, getMediaUrls } from '@/utils/mediaUrl';
import { extractYouTubeId } from '@/utils/videoEmbed';

export type MediaItemKind = 'image' | 'video' | 'gif';

export interface MediaItem {
  kind: MediaItemKind;
  src: string;
  poster?: string;
  title?: string;
}

export interface BuildMediaItemsInput {
  thumbnailUrl?: string | null;
  imageUrl?: string | null;
  images?: (string | null | undefined)[] | null;
  videoUrl?: string | null;
  gifUrl?: string | null;
  title?: string;
}

export function buildMediaItems({
  thumbnailUrl,
  imageUrl,
  images,
  videoUrl,
  gifUrl,
  title,
}: BuildMediaItemsInput): MediaItem[] {
  const items: MediaItem[] = [];
  const mediaTitle = title?.trim() || undefined;

  const imageItems: MediaItem[] = getMediaUrls([thumbnailUrl, imageUrl, ...(images ?? [])]).map((src) => ({
    kind: 'image',
    src,
    title: mediaTitle,
  }));
  items.push(...imageItems);

  const normalizedVideoUrl = getMediaUrl(videoUrl);
  if (normalizedVideoUrl) {
    items.push({
      kind: 'video',
      src: normalizedVideoUrl,
      poster: getYouTubePosterUrl(normalizedVideoUrl),
      title: mediaTitle,
    });
  }

  const normalizedGifUrl = getMediaUrl(gifUrl);
  if (normalizedGifUrl) {
    items.push({
      kind: 'gif',
      src: normalizedGifUrl,
      title: mediaTitle,
    });
  }

  return dedupeMediaItems(items);
}

export function getYouTubePosterUrl(videoUrl: string): string | undefined {
  const youtubeId = extractYouTubeId(videoUrl);
  if (!youtubeId) {
    return undefined;
  }

  return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
}

function dedupeMediaItems(items: MediaItem[]): MediaItem[] {
  const seenKeys = new Set<string>();

  return items.filter((item) => {
    const itemKey = `${item.kind}:${item.src}`;
    if (seenKeys.has(itemKey)) {
      return false;
    }

    seenKeys.add(itemKey);
    return true;
  });
}

const MEDIA_KIND_LABEL: Record<MediaItemKind, string> = {
  image: 'Zdjęcie',
  video: 'Film',
  gif: 'GIF',
};

/**
 * Accessible names for gallery thumbnails. A kind that occurs once gets its bare name
 * ("Film"); repeated kinds are numbered within the kind ("Zdjęcie 2 z 3").
 */
export function getMediaItemLabels(items: readonly MediaItem[]): string[] {
  const totals: Record<MediaItemKind, number> = { image: 0, video: 0, gif: 0 };
  for (const item of items) totals[item.kind] += 1;

  const seen: Record<MediaItemKind, number> = { image: 0, video: 0, gif: 0 };
  return items.map((item) => {
    seen[item.kind] += 1;
    const label = MEDIA_KIND_LABEL[item.kind];
    return totals[item.kind] > 1 ? `${label} ${seen[item.kind]} z ${totals[item.kind]}` : label;
  });
}
