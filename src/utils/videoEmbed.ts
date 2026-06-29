const YOUTUBE_DOMAINS = ['youtube.com', 'youtu.be'] as const;
const VIMEO_HASH_PATTERN = /^[a-zA-Z0-9]+$/;

export function isYouTubeUrl(url: string | undefined | null): boolean {
  if (typeof url !== 'string') {
    return false;
  }

  return YOUTUBE_DOMAINS.some((domain) => url.includes(domain));
}

export function isVimeoUrl(url: string | undefined | null): boolean {
  return typeof url === 'string' && url.includes('vimeo.com');
}

export function isDirectVideoUrl(url: string | undefined | null): boolean {
  if (typeof url !== 'string') {
    return false;
  }

  return /\.(mp4|mov|m4v|webm)(\?.*)?$/i.test(url);
}

export function extractYouTubeId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match?.[2]?.length === 11 ? match[2] : null;
}

export function getYouTubeEmbedUrl(url: string): string | null {
  const youtubeId = extractYouTubeId(url);
  if (!youtubeId) {
    return null;
  }

  return `https://www.youtube.com/embed/${youtubeId}?playsinline=1&modestbranding=1&rel=0`;
}

export function extractVimeoId(url: string): string | null {
  const parsedUrl = tryParseUrl(url);
  if (parsedUrl) {
    const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);
    const numericSegment = pathSegments.find((segment) => /^\d+$/.test(segment));
    if (numericSegment) {
      return numericSegment;
    }
  }

  const patterns = [/vimeo\.com\/(\d+)(?:[^\d]|$)/, /player\.vimeo\.com\/video\/(\d+)(?:[^\d]|$)/];
  for (const pattern of patterns) {
    const match = pattern.exec(url);
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

export function getVimeoEmbedUrl(url: string): string | null {
  const vimeoId = extractVimeoId(url);
  if (!vimeoId) {
    return null;
  }

  const query = new URLSearchParams({
    title: '0',
    byline: '0',
    portrait: '0',
    autoplay: '0',
    muted: '0',
    controls: '1',
    dnt: '1',
  });

  const hash = extractVimeoHash(url);
  if (hash) {
    query.set('h', hash);
  }

  return `https://player.vimeo.com/video/${vimeoId}?${query.toString()}`;
}

function extractVimeoHash(url: string): string | null {
  const parsedUrl = tryParseUrl(url);
  if (parsedUrl) {
    const hashFromQuery = parsedUrl.searchParams.get('h');
    if (hashFromQuery && VIMEO_HASH_PATTERN.test(hashFromQuery)) {
      return hashFromQuery;
    }

    const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);
    const numericIndex = pathSegments.findIndex((segment) => /^\d+$/.test(segment));
    const candidateHash = numericIndex >= 0 ? pathSegments[numericIndex + 1] : null;
    if (candidateHash && VIMEO_HASH_PATTERN.test(candidateHash)) {
      return candidateHash;
    }
  }

  const regexMatch = url.match(/(?:\?|&)h=([a-zA-Z0-9]+)/);
  return regexMatch?.[1] ?? null;
}

function tryParseUrl(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}
