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

function getYouTubePosterUrl(videoUrl: string): string | undefined {
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
