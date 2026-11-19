import type {
  SupportMessage,
  SupportTab,
  SupportThread,
  SupportThreadCategory,
  SupportUnreadCount,
} from '@/graphql/types';

/** `/support` jest zajęte: publiczne przekierowanie na fiziyo.pl/support (link ze sklepów), więc panel używa `/wsparcie`. */
export const SUPPORT_PATH = '/wsparcie';
export const SUPPORT_POLL_MS = 60_000;
export const SUPPORT_SUBJECT_MAX = 160;
export const SUPPORT_BODY_MAX = 4000;

export const SUPPORT_TABS: SupportTab[] = ['CONVERSATIONS', 'REPORTS'];

export const SUPPORT_TAB_LABELS: Record<SupportTab, string> = {
  CONVERSATIONS: 'Rozmowy',
  REPORTS: 'Zgłoszenia',
};

export const SUPPORT_CATEGORY_OPTIONS: { value: SupportThreadCategory; label: string }[] = [
  { value: 'ONBOARDING', label: 'Wdrożenie' },
  { value: 'BILLING', label: 'Rozliczenia' },
  { value: 'PROBLEM', label: 'Problem' },
  { value: 'INFO', label: 'Informacja' },
  { value: 'OTHER', label: 'Inne' },
];

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  SUPPORT_CATEGORY_OPTIONS.map((option) => [option.value, option.label])
);

const FEEDBACK_LABELS: Record<string, string> = { BUG: 'Błąd', SUGGESTION: 'Sugestia', QUESTION: 'Pytanie' };

export type SupportStatusTone = 'warning' | 'secondary' | 'outline';

/** Status z perspektywy gabinetu: „czeka na nas” w Ops to dla gabinetu „wysłane do zespołu”. */
export function supportStatusLabel(status: string): { label: string; tone: SupportStatusTone } {
  switch (status) {
    case 'WAITING_FOR_CLINIC':
      return { label: 'Czeka na Twoją odpowiedź', tone: 'warning' };
    case 'WAITING_FOR_US':
      return { label: 'Wysłane do zespołu', tone: 'secondary' };
    case 'CLOSED':
      return { label: 'Zamknięty', tone: 'outline' };
    default:
      return { label: 'Otwarte', tone: 'secondary' };
  }
}

export function supportKindLabel(thread: Pick<SupportThread, 'isReport' | 'feedbackType' | 'category'>): string {
  if (thread.isReport && thread.feedbackType) {
    return FEEDBACK_LABELS[thread.feedbackType] ?? 'Zgłoszenie';
  }
  return CATEGORY_LABELS[thread.category] ?? 'Inne';
}

/** Rozmowę z zespołem zaczyna właściciel albo administrator gabinetu (D-W1); backend pilnuje tego samego. */
export function canStartSupportConversation(role: string | null | undefined): boolean {
  return ['owner', 'admin'].includes((role ?? '').toLowerCase());
}

export function parseSupportTab(value: string | null | undefined): SupportTab {
  return value === 'reports' ? 'REPORTS' : 'CONVERSATIONS';
}

export function supportTabHref(tab: SupportTab): string {
  return tab === 'REPORTS' ? `${SUPPORT_PATH}?tab=reports` : SUPPORT_PATH;
}

export function supportThreadHref(threadId: string): string {
  return `${SUPPORT_PATH}/${encodeURIComponent(threadId)}`;
}

export type SupportCtaTarget =
  { kind: 'external'; href: string; host: string; label: string } | { kind: 'internal'; href: string; label: string };

/**
 * Dokąd prowadzi przycisk w wiadomości. Backend przyjmuje tylko https z domeną albo ścieżkę portalu z listy;
 * tu sprawdzamy to jeszcze raz, żeby zły adres nigdy nie stał się linkiem.
 */
export function supportCtaTarget(
  message: Pick<SupportMessage, 'ctaLabel' | 'ctaKind' | 'ctaUrl'>
): SupportCtaTarget | null {
  const label = message.ctaLabel?.trim();
  const url = message.ctaUrl?.trim();
  if (!label || !url) return null;

  if (message.ctaKind === 'EXTERNAL_URL') {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:' || !parsed.hostname.includes('.') || parsed.username || parsed.password) {
        return null;
      }
      return { kind: 'external', href: parsed.href, host: parsed.hostname, label };
    } catch {
      return null;
    }
  }

  if (
    message.ctaKind === 'PORTAL_PATH' &&
    /^\/[A-Za-z0-9\-_/]*(\?[A-Za-z0-9\-_=&]*)?$/.test(url) &&
    !url.includes('//')
  ) {
    return { kind: 'internal', href: url, label };
  }
  return null;
}

export type SupportInboxState = 'loading' | 'unavailable' | 'disabled' | 'enabled';

/**
 * Co pokazuje strona Wsparcia, zanim wczyta wątki. Licznik niesie flagę `supportInbox`; gdy padł bez danych,
 * lista się nie odpyta, więc strona mówi o błędzie zamiast stać na „Wczytywanie…”.
 */
export function supportInboxState(
  count: SupportUnreadCount | null | undefined,
  countFailed: boolean
): SupportInboxState {
  if (count) return count.enabled ? 'enabled' : 'disabled';
  return countFailed ? 'unavailable' : 'loading';
}

/** Baner na pulpicie: tylko gdy Wsparcie jest włączone, a zespół prosi o odpowiedź. */
export function shouldShowSupportBanner(count: SupportUnreadCount | null | undefined): boolean {
  return Boolean(count?.enabled && count.replyRequested);
}

/** Licznik przy ikonie Wsparcia; 0, gdy funkcja jest wyłączona. */
export function supportBadgeCount(count: SupportUnreadCount | null | undefined): number {
  return count?.enabled ? count.total : 0;
}

export function supportTabUnread(count: SupportUnreadCount | null | undefined, tab: SupportTab): number {
  if (!count?.enabled) return 0;
  return tab === 'REPORTS' ? count.reports : count.conversations;
}

export interface ConversationDraft {
  subject: string;
  category: SupportThreadCategory;
  body: string;
}

export function validateConversationDraft(draft: ConversationDraft): string | null {
  const subject = draft.subject.trim();
  const body = draft.body.trim();
  if (subject.length === 0) return 'Wpisz temat.';
  if (subject.length > SUPPORT_SUBJECT_MAX) return `Temat może mieć najwyżej ${SUPPORT_SUBJECT_MAX} znaków.`;
  if (body.length === 0) return 'Napisz wiadomość.';
  if (body.length > SUPPORT_BODY_MAX) return `Wiadomość może mieć najwyżej ${SUPPORT_BODY_MAX} znaków.`;
  return null;
}
