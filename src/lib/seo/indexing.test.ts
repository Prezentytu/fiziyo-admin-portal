import { describe, expect, it } from 'vitest';
import { buildIndexingHeaders, robotsFor } from './indexing';

const noindexSource = () => new RegExp(`^${buildIndexingHeaders()[0].source}$`);

describe('robotsFor', () => {
  it('lets crawlers reach only sign-in and registration on production', () => {
    expect(robotsFor('portal.fiziyo.pl')).toEqual({
      rules: { userAgent: '*', allow: ['/sign-in', '/register'], disallow: '/' },
    });
  });

  it('closes DEV, previews and unknown hosts entirely', () => {
    for (const host of ['devportal.fiziyo.pl', 'dev.portal.fiziyo.pl', 'x.vercel.app', null]) {
      expect(robotsFor(host)).toEqual({ rules: { userAgent: '*', disallow: '/' } });
    }
  });

  it('ignores the port and letter case of the host', () => {
    expect(robotsFor('Portal.FiziYo.pl:443').rules).toMatchObject({ allow: ['/sign-in', '/register'] });
  });
});

describe('buildIndexingHeaders', () => {
  it('marks the panel noindex and leaves the public pages and robots.txt alone', () => {
    const source = noindexSource();
    for (const path of ['/', '/patients', '/exercises/1', '/sign-inx', '/registered', '/api/x']) {
      expect(source.test(path), path).toBe(true);
    }
    for (const path of ['/sign-in', '/sign-in/factor-one', '/register', '/robots.txt']) {
      expect(source.test(path), path).toBe(false);
    }
  });

  it('marks the public pages noindex everywhere but production', () => {
    expect(buildIndexingHeaders()[1]).toMatchObject({
      missing: [{ type: 'host', value: 'portal.fiziyo.pl' }],
      headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
    });
  });
});
