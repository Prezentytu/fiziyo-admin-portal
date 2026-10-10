import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { VideoEmbed } from '../VideoEmbed';

describe('VideoEmbed (CAT04)', () => {
  it('iframe YouTube startuje od czasu zapisanego w URL ćwiczenia', () => {
    render(<VideoEmbed url="https://www.youtube.com/watch?v=7rnlAVhAK-8&t=6s" title="Cofanie brody" />);

    const src = screen.getByTestId('video-embed-iframe').getAttribute('src');
    expect(src).toContain('youtube.com/embed/7rnlAVhAK-8');
    expect(new URL(src ?? '').searchParams.get('start')).toBe('6');
  });
});
