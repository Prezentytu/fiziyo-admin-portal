import { describe, expect, it } from 'vitest';

import {
  formatReleaseNoteDate,
  notificationsBellCount,
  notificationsBellLabel,
  parseSettingsTab,
  releaseNoteAnchorFromHash,
  releaseNoteHref,
  releaseNoteKindPresentation,
  safeReleaseNoteUrl,
  shouldShowReleaseBanner,
  unseenReleaseNoteIds,
} from '../releaseNotes';

describe('releaseNoteKindPresentation', () => {
  it.each([
    ['NEW', 'Nowość'],
    ['IMPROVEMENT', 'Ulepszenie'],
    ['FIX', 'Poprawka'],
    ['OPT_IN', 'Do włączenia'],
  ])('labels %s as %s', (kind, label) => {
    expect(releaseNoteKindPresentation(kind).label).toBe(label);
  });

  it('keeps the list readable when a newer backend sends a kind the panel does not know', () => {
    expect(releaseNoteKindPresentation('DEPRECATION')).toEqual({ label: 'Zmiana', variant: 'secondary' });
  });
});

describe('formatReleaseNoteDate', () => {
  it('writes the Polish long date in the clinics time zone', () => {
    expect(formatReleaseNoteDate('2026-11-17T08:00:00Z')).toBe('17 listopada 2026');
  });

  it('uses the Warsaw day for a late-evening UTC publish', () => {
    expect(formatReleaseNoteDate('2026-11-16T23:30:00Z')).toBe('17 listopada 2026');
  });

  it('returns an empty string instead of "Invalid Date"', () => {
    expect(formatReleaseNoteDate('not-a-date')).toBe('');
  });
});

describe('parseSettingsTab', () => {
  const tabs = ['profile', 'organizations', 'accessibility', 'whats-new'] as const;

  it('opens a tab named in ?tab=', () => {
    expect(parseSettingsTab('whats-new', tabs, 'profile')).toBe('whats-new');
  });

  it.each([null, '', 'billing', 'organization'])('falls back to the profile for %s', (value) => {
    expect(parseSettingsTab(value, tabs, 'profile')).toBe('profile');
  });
});

describe('release note links', () => {
  it('points the banner and the bell at the release anchor on the settings tab', () => {
    expect(releaseNoteHref('abc')).toBe('/settings?tab=whats-new#wydanie-abc');
  });

  it('reads only release anchors from the hash', () => {
    expect(releaseNoteAnchorFromHash('#wydanie-abc')).toBe('wydanie-abc');
    expect(releaseNoteAnchorFromHash('#wydanie-')).toBeNull();
    expect(releaseNoteAnchorFromHash('#profile')).toBeNull();
    expect(releaseNoteAnchorFromHash('')).toBeNull();
  });

  it('ignores a malformed hash instead of throwing (link pasted with a broken %-sequence)', () => {
    expect(releaseNoteAnchorFromHash('#wydanie-%E0')).toBeNull();
    expect(releaseNoteAnchorFromHash('#%')).toBeNull();
  });

  it.each([
    ['/settings?tab=accessibility', '/settings?tab=accessibility'],
    [
      'https://portal.fiziyo.pl/co-nowego/2026-11-17-odpoczynek.png',
      'https://portal.fiziyo.pl/co-nowego/2026-11-17-odpoczynek.png',
    ],
    ['  /patients  ', '/patients'],
    ['//evil.example/x', null],
    ['javascript:alert(1)', null],
    ['http://portal.fiziyo.pl/x', null],
    ['', null],
    [null, null],
  ])('accepts %s from Ops as %s', (value, expected) => {
    expect(safeReleaseNoteUrl(value)).toBe(expected);
  });
});

describe('shouldShowReleaseBanner', () => {
  const sent = { id: 'r1', notified: true };
  const elsewhere = { pathname: '/patients', settingsTab: null, dismissedId: null };

  it('shows a release Ops sent a notification about', () => {
    expect(shouldShowReleaseBanner(sent, elsewhere)).toBe(true);
  });

  it('stays hidden for a release published without a notification', () => {
    expect(shouldShowReleaseBanner({ id: 'r1', notified: false }, elsewhere)).toBe(false);
  });

  it('stays hidden when everything is seen or the API does not know release notes', () => {
    expect(shouldShowReleaseBanner(null, elsewhere)).toBe(false);
  });

  it('hides right after the user closes it, before the refetch arrives', () => {
    expect(shouldShowReleaseBanner(sent, { ...elsewhere, dismissedId: 'r1' })).toBe(false);
    expect(shouldShowReleaseBanner({ id: 'r2', notified: true }, { ...elsewhere, dismissedId: 'r1' })).toBe(true);
  });

  it('does not cover the "Co nowego" tab itself, but shows on other settings tabs', () => {
    expect(shouldShowReleaseBanner(sent, { ...elsewhere, pathname: '/settings', settingsTab: 'whats-new' })).toBe(
      false
    );
    expect(shouldShowReleaseBanner(sent, { ...elsewhere, pathname: '/settings', settingsTab: 'profile' })).toBe(true);
    expect(shouldShowReleaseBanner(sent, { ...elsewhere, pathname: '/settings', settingsTab: null })).toBe(true);
  });
});

describe('notifications bell', () => {
  it('adds one for a sent, unseen release on top of patient signals', () => {
    expect(notificationsBellCount(2, { notified: true })).toBe(3);
    expect(notificationsBellCount(0, { notified: true })).toBe(1);
  });

  it('counts only patient signals when the release was not sent or there is none', () => {
    expect(notificationsBellCount(2, { notified: false })).toBe(2);
    expect(notificationsBellCount(2, null)).toBe(2);
  });

  it('keeps the existing labels when there is no release', () => {
    expect(notificationsBellLabel(0, false)).toBe('Powiadomienia');
    expect(notificationsBellLabel(3, false)).toBe('Powiadomienia: zgłoszenia pacjentów (3)');
  });

  it('names the release in the label', () => {
    expect(notificationsBellLabel(0, true)).toBe('Powiadomienia: nowa wersja portalu');
    expect(notificationsBellLabel(2, true)).toBe('Powiadomienia: nowa wersja portalu i zgłoszenia pacjentów (2)');
  });
});

describe('unseenReleaseNoteIds', () => {
  it('oznacza jako nowe każde nieobejrzane wydanie, nie tylko najnowsze', () => {
    const ids = unseenReleaseNoteIds([
      { id: 'r3', seen: false },
      { id: 'r2', seen: false },
      { id: 'r1', seen: true },
    ]);
    expect([...ids]).toEqual(['r3', 'r2']);
  });

  it('nic nie jest nowe, gdy wszystko obejrzane', () => {
    expect(unseenReleaseNoteIds([{ id: 'r1', seen: true }]).size).toBe(0);
  });
});
