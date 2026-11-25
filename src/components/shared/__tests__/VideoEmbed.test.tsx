import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { VideoEmbed } from '../VideoEmbed';

function playerSays(message: unknown, source?: MessageEventSource | null) {
  const iframe = screen.getByTestId('video-embed-iframe') as HTMLIFrameElement;
  act(() => {
    window.dispatchEvent(
      new MessageEvent('message', { data: JSON.stringify(message), source: source ?? iframe.contentWindow })
    );
  });
}

describe('VideoEmbed (CAT04)', () => {
  it('iframe YouTube startuje od czasu zapisanego w URL ćwiczenia', () => {
    render(<VideoEmbed url="https://www.youtube.com/watch?v=7rnlAVhAK-8&t=6s" title="Cofanie brody" />);

    const src = screen.getByTestId('video-embed-iframe').getAttribute('src');
    expect(src).toContain('youtube.com/embed/7rnlAVhAK-8');
    expect(new URL(src ?? '').searchParams.get('start')).toBe('6');
  });
});

describe('VideoEmbed – bieżący czas filmu (SPEC-064)', () => {
  it('czyta czas z Vimeo tylko z własnego odtwarzacza', () => {
    const onTimeChange = vi.fn();
    render(<VideoEmbed url="https://vimeo.com/123456789#t=30s" title="Film" onTimeChange={onTimeChange} />);

    expect(screen.getByTestId('video-embed-iframe').getAttribute('src')).toContain('api=1');
    playerSays({ event: 'timeupdate', data: { seconds: 41.2 } });
    playerSays({ event: 'seeked', data: { seconds: 50 } });
    // Vimeo with api=1 (checked on a real player 2026-11-25) sends the legacy names.
    playerSays({ event: 'playProgress', data: { seconds: 61.03, duration: 185.8 } });
    playerSays({ event: 'seek', data: { seconds: 70, duration: 185.8 } });
    playerSays({ event: 'timeupdate', data: { seconds: 99 } }, window);

    expect(onTimeChange.mock.calls).toEqual([[41.2], [50], [61.03], [70]]);
  });

  it('pyta Vimeo o bieżący czas, bo przewinięcie przed odtworzeniem nie wysyła zdarzenia', () => {
    const player = { postMessage: vi.fn() } as unknown as Window;
    const contentWindow = vi.spyOn(HTMLIFrameElement.prototype, 'contentWindow', 'get').mockReturnValue(player);
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    try {
      const onTimeChange = vi.fn();
      render(<VideoEmbed url="https://vimeo.com/123456789" title="Film" onTimeChange={onTimeChange} />);

      playerSays({ event: 'ready' }, player);
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(player.postMessage).toHaveBeenCalledWith(JSON.stringify({ method: 'getCurrentTime' }), '*');

      playerSays({ method: 'getCurrentTime', value: 95 }, player);
      expect(onTimeChange).toHaveBeenLastCalledWith(95);
    } finally {
      vi.useRealTimers();
      contentWindow.mockRestore();
    }
  });

  it('czyta czas z YouTube z infoDelivery', () => {
    const onTimeChange = vi.fn();
    render(<VideoEmbed url="https://youtu.be/7rnlAVhAK-8" title="Film" onTimeChange={onTimeChange} />);

    playerSays({ event: 'infoDelivery', info: { currentTime: 12.5 } });
    expect(onTimeChange).toHaveBeenLastCalledWith(12.5);
  });

  it('bez obsługi czasu nie włącza API odtwarzacza', () => {
    render(<VideoEmbed url="https://vimeo.com/123456789" title="Film" />);
    expect(screen.getByTestId('video-embed-iframe').getAttribute('src')).not.toContain('api=1');
  });
});
