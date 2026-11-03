export const IOS_APP_STORE_URL = 'https://apps.apple.com/pl/app/fiziyo/id6756354288';
export const ANDROID_PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.fizjo.app.dev';

export type MobilePlatform = 'ios' | 'android' | 'desktop';

/** iPadOS reports a Mac user agent, so touch support separates it from a desktop Mac. */
export function detectMobilePlatform(userAgent: string, maxTouchPoints = 0): MobilePlatform {
  const agent = userAgent.toLowerCase();
  const touch = maxTouchPoints > 1;
  if (/iphone|ipad|ipod/.test(agent) || (/macintosh/.test(agent) && touch)) {
    return 'ios';
  }
  if (/android/.test(agent)) {
    return 'android';
  }
  return 'desktop';
}
