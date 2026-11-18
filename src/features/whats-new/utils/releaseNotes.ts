import type { BadgeProps } from '@/components/ui/badge';
import type { ReleaseNote } from '@/graphql/types';

export const WHATS_NEW_TAB = 'whats-new';
export const RELEASE_NOTES_TAKE = 20;
export const UNSEEN_RELEASE_NOTE_POLL_MS = 10 * 60 * 1000;

const RELEASE_ANCHOR_PREFIX = 'wydanie-';

interface KindPresentation {
  label: string;
  variant: NonNullable<BadgeProps['variant']>;
}

const KIND_PRESENTATION: Record<string, KindPresentation> = {
  NEW: { label: 'Nowość', variant: 'default' },
  IMPROVEMENT: { label: 'Ulepszenie', variant: 'info' },
  FIX: { label: 'Poprawka', variant: 'secondary' },
  OPT_IN: { label: 'Do włączenia', variant: 'suggestion' },
};

/** Etykieta rodzaju pozycji; rodzaj nieznany panelowi (nowszy backend) dostaje neutralną „Zmianę”. */
export function releaseNoteKindPresentation(kind: string): KindPresentation {
  return KIND_PRESENTATION[kind] ?? { label: 'Zmiana', variant: 'secondary' };
}

const RELEASE_DATE_FORMAT = new Intl.DateTimeFormat('pl-PL', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Warsaw',
});

/** „17 listopada 2026” w strefie gabinetów; zła data z API daje pusty tekst zamiast „Invalid Date”. */
export function formatReleaseNoteDate(publishedAt: string): string {
  const date = new Date(publishedAt);
  return Number.isNaN(date.getTime()) ? '' : RELEASE_DATE_FORMAT.format(date);
}

/** Releases the user had not seen when the tab opened; they keep the „Nowe” badge for the whole visit. */
export function unseenReleaseNoteIds(notes: readonly Pick<ReleaseNote, 'id' | 'seen'>[]): ReadonlySet<string> {
  return new Set(notes.filter((note) => !note.seen).map((note) => note.id));
}

export function releaseNoteAnchorId(noteId: string): string {
  return `${RELEASE_ANCHOR_PREFIX}${noteId}`;
}

export function releaseNoteHref(noteId: string): string {
  return `/settings?tab=${WHATS_NEW_TAB}#${releaseNoteAnchorId(noteId)}`;
}

/** Kotwica wydania z `location.hash` albo null, gdy hash wskazuje coś innego. */
export function releaseNoteAnchorFromHash(hash: string): string | null {
  const anchor = decodeURIComponent(hash.replace(/^#/, ''));
  return anchor.startsWith(RELEASE_ANCHOR_PREFIX) && anchor.length > RELEASE_ANCHOR_PREFIX.length ? anchor : null;
}

/**
 * Link i zrzut wpisuje Ops ręcznie: przepuszczamy ścieżkę w panelu albo https, nic innego (np. `javascript:`).
 */
export function safeReleaseNoteUrl(url: string | null | undefined): string | null {
  const value = url?.trim();
  if (!value) return null;
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  return /^https:\/\/[^\s]+$/i.test(value) ? value : null;
}

/** Zakładka z `?tab=`; wartość spoza dostępnych dla roli wraca do profilu. */
export function parseSettingsTab<T extends string>(value: string | null, availableTabs: readonly T[], fallback: T): T {
  return availableTabs.find((tab) => tab === value) ?? fallback;
}

interface ReleaseBannerContext {
  pathname: string;
  settingsTab: string | null;
  dismissedId: string | null;
}

/** Pasek tylko dla wydania, o którym Ops wysłał powiadomienie, i nie nad samą zakładką „Co nowego”. */
export function shouldShowReleaseBanner(
  note: Pick<ReleaseNote, 'id' | 'notified'> | null,
  { pathname, settingsTab, dismissedId }: ReleaseBannerContext
): boolean {
  if (!note?.notified || note.id === dismissedId) return false;
  return !(pathname === '/settings' && settingsTab === WHATS_NEW_TAB);
}

/** Licznik dzwonka: zgłoszenia pacjentów plus jedno wysłane, nieobejrzane wydanie portalu. */
export function notificationsBellCount(signalCount: number, note: Pick<ReleaseNote, 'notified'> | null): number {
  return signalCount + (note?.notified ? 1 : 0);
}

export function notificationsBellLabel(signalCount: number, hasRelease: boolean): string {
  if (hasRelease) {
    return signalCount > 0
      ? `Powiadomienia: nowa wersja portalu i zgłoszenia pacjentów (${signalCount})`
      : 'Powiadomienia: nowa wersja portalu';
  }
  return signalCount > 0 ? `Powiadomienia: zgłoszenia pacjentów (${signalCount})` : 'Powiadomienia';
}
