import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { VideoEmbed } from '../VideoEmbed';

/** YouTube and Vimeo's `ready` arrive as JSON strings; Vimeo answers object messages with objects. */
function playerSays(data: unknown, source?: MessageEventSource | null) {
  const iframe = screen.getByTestId('video-embed-iframe') as HTMLIFrameElement;
  act(() => {
    window.dispatchEvent(new MessageEvent('message', { data, source: source ?? iframe.contentWindow }));
  });
}

/** jsdom does not load a cross-origin iframe, so its contentWindow is null: stand in for the player's window. */
function givePlayerWindow(iframe: HTMLIFrameElement) {
  const playerWindow = { postMessage: vi.fn() };
  Object.defineProperty(iframe, 'contentWindow', { configurable: true, value: playerWindow });
  return playerWindow;
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
  // Odpowiedzi skopiowane z żywego player.vimeo.com: na wiadomości tekstowe Vimeo odpowiada starym API
  // (`playProgress`, `seek`), czasu w `timeupdate`/`seeked` używa tylko po subskrypcji obiektem.
  it('subskrybuje Vimeo obiektem i czyta czas tylko z własnego odtwarzacza', () => {
    const onTimeChange = vi.fn();
    render(<VideoEmbed url="https://vimeo.com/123456789#t=30s" title="Film" onTimeChange={onTimeChange} />);

    const iframe = screen.getByTestId('video-embed-iframe') as HTMLIFrameElement;
    expect(iframe.getAttribute('src')).toContain('api=1');
    const { postMessage } = givePlayerWindow(iframe);
    playerSays(JSON.stringify({ event: 'ready' }));
    expect(postMessage).toHaveBeenCalledWith({ method: 'addEventListener', value: 'timeupdate' }, '*');
    expect(postMessage).toHaveBeenCalledWith({ method: 'addEventListener', value: 'seeked' }, '*');

    playerSays({ event: 'timeupdate', data: { seconds: 41.2, percent: 0.07, duration: 596.458 } });
    playerSays({ event: 'seeked', data: { seconds: 50, percent: 0.08, duration: 596.458 } });
    playerSays({ event: 'timeupdate', data: { seconds: 99 } }, window);

    expect(onTimeChange.mock.calls).toEqual([[41.2], [50]]);
  });

  it('czyta czas z YouTube z infoDelivery', () => {
    const onTimeChange = vi.fn();
    render(<VideoEmbed url="https://youtu.be/7rnlAVhAK-8" title="Film" onTimeChange={onTimeChange} />);
    givePlayerWindow(screen.getByTestId('video-embed-iframe') as HTMLIFrameElement);

    playerSays(JSON.stringify({ event: 'infoDelivery', info: { currentTime: 12.5 } }));
    expect(onTimeChange).toHaveBeenLastCalledWith(12.5);
  });

  it('bez obsługi czasu nie włącza API odtwarzacza', () => {
    render(<VideoEmbed url="https://vimeo.com/123456789" title="Film" />);
    expect(screen.getByTestId('video-embed-iframe').getAttribute('src')).not.toContain('api=1');
  });
});
