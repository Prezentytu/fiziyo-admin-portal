import { PATIENT_JOIN_ORIGIN, PATIENT_START_PATH } from '@/lib/patientJoinUrl';

export const IOS_APP_STORE_URL = 'https://apps.apple.com/pl/app/fiziyo/id6756354288';
export const ANDROID_PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.fizjo.app.dev';

/** The landing /start page without params shows the store for the phone that opens it. */
export const PATIENT_APP_DOWNLOAD_URL = new URL(`${PATIENT_START_PATH}/`, PATIENT_JOIN_ORIGIN).toString();

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
