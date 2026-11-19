import { describe, expect, it } from 'vitest';

import {
  canStartSupportConversation,
  parseSupportTab,
  shouldShowSupportBanner,
  supportBadgeCount,
  supportCtaTarget,
  supportInboxState,
  supportKindLabel,
  supportStatusLabel,
  supportTabHref,
  supportTabUnread,
  validateConversationDraft,
} from '../support';

const count = (overrides = {}) => ({
  conversations: 1,
  reports: 2,
  total: 3,
  replyRequested: true,
  enabled: true,
  ...overrides,
});

describe('supportCtaTarget', () => {
  it('external https link keeps host for „Otworzy się …”', () => {
    expect(
      supportCtaTarget({ ctaLabel: 'Termin', ctaKind: 'EXTERNAL_URL', ctaUrl: 'https://calendly.com/fiziyo/20' })
    ).toEqual({ kind: 'external', href: 'https://calendly.com/fiziyo/20', host: 'calendly.com', label: 'Termin' });
  });

  it.each([
    ['EXTERNAL_URL', 'http://calendly.com/x'],
    ['EXTERNAL_URL', 'javascript:alert(1)'],
    ['EXTERNAL_URL', 'https://user:pass@evil.example/x'],
    ['EXTERNAL_URL', 'https://localhost/x'],
    ['PORTAL_PATH', '//evil.example'],
    ['PORTAL_PATH', '/patients/../..//evil'],
    ['PORTAL_PATH', 'https://fiziyo.pl/settings'],
    ['OTHER', '/settings'],
  ])('%s %s never becomes a link', (ctaKind, ctaUrl) => {
    expect(supportCtaTarget({ ctaLabel: 'X', ctaKind, ctaUrl })).toBeNull();
  });

  it('portal path stays an in-app link', () => {
    expect(supportCtaTarget({ ctaLabel: 'Ustawienia', ctaKind: 'PORTAL_PATH', ctaUrl: '/settings?tab=ai' })).toEqual({
      kind: 'internal',
      href: '/settings?tab=ai',
      label: 'Ustawienia',
    });
  });

  it('no label or url means no button', () => {
    expect(supportCtaTarget({ ctaLabel: null, ctaKind: 'PORTAL_PATH', ctaUrl: '/settings' })).toBeNull();
    expect(supportCtaTarget({ ctaLabel: 'X', ctaKind: 'PORTAL_PATH', ctaUrl: null })).toBeNull();
  });
});

describe('supportInboxState', () => {
  it('waits while the counter loads, and gives up with an error when it failed', () => {
    expect(supportInboxState(null, false)).toBe('loading');
    expect(supportInboxState(null, true)).toBe('unavailable');
  });

  it('shows the inbox only when the flag is on, also with stale data after a failed poll', () => {
    expect(supportInboxState(count(), false)).toBe('enabled');
    expect(supportInboxState(count(), true)).toBe('enabled');
    expect(supportInboxState(count({ enabled: false }), false)).toBe('disabled');
  });
});

describe('visibility and counters', () => {
  it('only owner and admin start a conversation', () => {
    expect(canStartSupportConversation('OWNER')).toBe(true);
    expect(canStartSupportConversation('admin')).toBe(true);
    expect(canStartSupportConversation('therapist')).toBe(false);
    expect(canStartSupportConversation(undefined)).toBe(false);
  });

  it('disabled flag hides banner and counters', () => {
    expect(shouldShowSupportBanner(count())).toBe(true);
    expect(shouldShowSupportBanner(count({ enabled: false }))).toBe(false);
    expect(shouldShowSupportBanner(count({ replyRequested: false }))).toBe(false);
    expect(supportBadgeCount(count())).toBe(3);
    expect(supportBadgeCount(count({ enabled: false }))).toBe(0);
    expect(supportTabUnread(count(), 'REPORTS')).toBe(2);
    expect(supportTabUnread(null, 'CONVERSATIONS')).toBe(0);
  });
});

describe('labels and routing', () => {
  it('status reads from the clinic side', () => {
    expect(supportStatusLabel('WAITING_FOR_CLINIC')).toEqual({ label: 'Czeka na Twoją odpowiedź', tone: 'warning' });
    expect(supportStatusLabel('WAITING_FOR_US').label).toBe('Wysłane do zespołu');
    expect(supportStatusLabel('SOMETHING_NEW').label).toBe('Otwarte');
  });

  it('report shows feedback type, conversation shows category', () => {
    expect(supportKindLabel({ isReport: true, feedbackType: 'BUG', category: 'PROBLEM' })).toBe('Błąd');
    expect(supportKindLabel({ isReport: false, feedbackType: null, category: 'BILLING' })).toBe('Rozliczenia');
  });

  it('tab round-trips through the query string', () => {
    expect(parseSupportTab('reports')).toBe('REPORTS');
    expect(parseSupportTab(null)).toBe('CONVERSATIONS');
    expect(supportTabHref('REPORTS')).toBe('/wsparcie?tab=reports');
  });

  it('validates a new conversation', () => {
    expect(validateConversationDraft({ subject: ' ', category: 'OTHER', body: 'x' })).toBe('Wpisz temat.');
    expect(validateConversationDraft({ subject: 'Temat', category: 'OTHER', body: ' ' })).toBe('Napisz wiadomość.');
    expect(validateConversationDraft({ subject: 'Temat', category: 'OTHER', body: 'Treść' })).toBeNull();
  });
});
