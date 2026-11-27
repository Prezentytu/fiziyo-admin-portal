'use client';

import { useEffect, useRef } from 'react';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getVimeoEmbedUrl, getYouTubeEmbedUrl, isDirectVideoUrl, isVimeoUrl, isYouTubeUrl } from '@/utils/videoEmbed';

interface VideoEmbedProps {
  url: string;
  title: string;
  className?: string;
  /** Current playback position in seconds, read from the YouTube/Vimeo player while it plays or after a seek. */
  onTimeChange?: (seconds: number) => void;
}

const YOUTUBE_LISTENING_MS = 500;
const YOUTUBE_LISTENING_ATTEMPTS = 20;

export function VideoEmbed({ url, title, className, onTimeChange }: Readonly<VideoEmbedProps>) {
  const tracksTime = Boolean(onTimeChange);
  const isYouTube = isYouTubeUrl(url);
  const youtubeEmbedUrl = isYouTube ? getYouTubeEmbedUrl(url, { enableApi: tracksTime }) : null;
  const vimeoEmbedUrl = isVimeoUrl(url) ? getVimeoEmbedUrl(url, { enableApi: tracksTime }) : null;
  const directVideo = isDirectVideoUrl(url);
  const embedUrl = youtubeEmbedUrl ?? vimeoEmbedUrl;

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const onTimeChangeRef = useRef(onTimeChange);
  useEffect(() => {
    onTimeChangeRef.current = onTimeChange;
  }, [onTimeChange]);

  useEffect(() => {
    if (!embedUrl || !tracksTime) return;
    const iframe = iframeRef.current;
    if (!iframe) return;

    // YouTube takes JSON strings. Vimeo takes plain objects: a JSON string switches it to its legacy API,
    // which answers `playProgress`/`seek` instead of `timeupdate`/`seeked`.
    const postYouTube = (message: unknown) => iframe.contentWindow?.postMessage(JSON.stringify(message), '*');
    const subscribeVimeo = () => {
      iframe.contentWindow?.postMessage({ method: 'addEventListener', value: 'timeupdate' }, '*');
      iframe.contentWindow?.postMessage({ method: 'addEventListener', value: 'seeked' }, '*');
    };

    let youtubeAttempts = 0;
    let youtubeTimer: ReturnType<typeof setInterval> | null = null;
    const stopYouTubeListening = () => {
      if (youtubeTimer) clearInterval(youtubeTimer);
      youtubeTimer = null;
    };
    // YouTube answers with infoDelivery (currentTime) only after the page says it is listening.
    const startYouTubeListening = () => {
      stopYouTubeListening();
      youtubeAttempts = 0;
      youtubeTimer = setInterval(() => {
        youtubeAttempts += 1;
        postYouTube({ event: 'listening', id: 1, channel: 'widget' });
        if (youtubeAttempts >= YOUTUBE_LISTENING_ATTEMPTS) stopYouTubeListening();
      }, YOUTUBE_LISTENING_MS);
    };

    const handleMessage = (event: MessageEvent) => {
      if (event.source !== iframe.contentWindow) return;
      // YouTube and Vimeo's `ready` come as JSON strings, Vimeo's answers to object messages as objects.
      let data: {
        event?: string;
        data?: { seconds?: unknown };
        info?: { currentTime?: unknown };
      } | null;
      try {
        data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }
      if (!data || typeof data !== 'object') return;

      if (isYouTube) {
        if (data.event === 'onReady' || data.event === 'initialDelivery' || data.event === 'infoDelivery') {
          stopYouTubeListening();
        }
        const seconds = data.info?.currentTime;
        if (typeof seconds === 'number' && Number.isFinite(seconds)) onTimeChangeRef.current?.(seconds);
        return;
      }

      if (data.event === 'ready') subscribeVimeo();
      const seconds = data.data?.seconds;
      if ((data.event === 'timeupdate' || data.event === 'seeked') && typeof seconds === 'number') {
        onTimeChangeRef.current?.(seconds);
      }
    };

    const handleLoad = () => {
      if (isYouTube) startYouTubeListening();
      else subscribeVimeo();
    };

    window.addEventListener('message', handleMessage);
    iframe.addEventListener('load', handleLoad);
    return () => {
      window.removeEventListener('message', handleMessage);
      iframe.removeEventListener('load', handleLoad);
      stopYouTubeListening();
    };
  }, [embedUrl, isYouTube, tracksTime]);

  if (embedUrl) {
    return (
      <div className={cn('relative h-full w-full overflow-hidden rounded-xl bg-black', className)}>
        <iframe
          ref={iframeRef}
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
