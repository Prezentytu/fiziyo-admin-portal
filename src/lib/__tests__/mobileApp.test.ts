import { describe, expect, it } from 'vitest';

import {
  ANDROID_PLAY_STORE_URL,
  detectMobilePlatform,
  IOS_APP_STORE_URL,
  PATIENT_APP_DOWNLOAD_URL,
} from '@/lib/mobileApp';

describe('mobile app links', () => {
  it('point at the published FiziYo listings, not placeholders', () => {
    expect(IOS_APP_STORE_URL).toBe('https://apps.apple.com/pl/app/fiziyo/id6756354288');
    expect(ANDROID_PLAY_STORE_URL).toBe('https://play.google.com/store/apps/details?id=com.fizjo.app.dev');
    expect(PATIENT_APP_DOWNLOAD_URL).toBe('https://fiziyo.pl/start/');
  });
});

describe('detectMobilePlatform', () => {
  it('recognises phones and desktop', () => {
    expect(detectMobilePlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)')).toBe('ios');
    expect(detectMobilePlatform('Mozilla/5.0 (Linux; Android 15; Pixel 9)')).toBe('android');
    expect(detectMobilePlatform('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('desktop');
  });

  it('treats an iPad with a Mac user agent as iOS, but not a Mac without touch', () => {
    const mac = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15';
    expect(detectMobilePlatform(mac, 5)).toBe('ios');
    expect(detectMobilePlatform(mac, 0)).toBe('desktop');
  });
});
