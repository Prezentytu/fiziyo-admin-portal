'use client';

import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getVimeoEmbedUrl, getYouTubeEmbedUrl, isDirectVideoUrl, isVimeoUrl, isYouTubeUrl } from '@/utils/videoEmbed';

interface VideoEmbedProps {
  url: string;
  title: string;
  className?: string;
}

export function VideoEmbed({ url, title, className }: Readonly<VideoEmbedProps>) {
  const youtubeEmbedUrl = isYouTubeUrl(url) ? getYouTubeEmbedUrl(url) : null;
  const vimeoEmbedUrl = isVimeoUrl(url) ? getVimeoEmbedUrl(url) : null;
  const directVideo = isDirectVideoUrl(url);
  const embedUrl = youtubeEmbedUrl ?? vimeoEmbedUrl;

  if (embedUrl) {
    return (
      <div className={cn('relative h-full w-full overflow-hidden rounded-xl bg-black', className)}>
        <iframe
          src={embedUrl}
          title={title}
          className="h-full w-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          data-testid="video-embed-iframe"
        />
      </div>
    );
  }

  if (directVideo) {
    return (
      <video
        src={url}
        controls
        playsInline
        className={cn('h-full w-full rounded-xl bg-black object-contain', className)}
        data-testid="video-embed-native"
      />
    );
  }

  return (
    <div className={cn('flex h-full w-full items-center justify-center rounded-xl border border-border/50 bg-card', className)}>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-accent"
        data-testid="video-embed-fallback-link"
      >
        <ExternalLink className="h-4 w-4" />
        Otwórz wideo
      </a>
    </div>
  );
}
