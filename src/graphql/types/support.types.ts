/** Enumy Wsparcia ze schematu (SPEC-056). Nowa wartość z backendu nie może wywrócić listy, więc pola są `string`. */
export type SupportTab = 'CONVERSATIONS' | 'REPORTS';
export type SupportThreadStatus = 'OPEN' | 'WAITING_FOR_CLINIC' | 'WAITING_FOR_US' | 'CLOSED';
export type SupportThreadCategory = 'ONBOARDING' | 'INFO' | 'BILLING' | 'PROBLEM' | 'OTHER';
export type SupportFeedbackType = 'BUG' | 'SUGGESTION' | 'QUESTION';
export type SupportCtaKind = 'PORTAL_PATH' | 'EXTERNAL_URL';

export interface SupportThread {
  id: string;
  subject: string;
  category: string;
  status: string;
  source: string;
  isReport: boolean;
  requiresReply: boolean;
  feedbackType: string | null;
  referenceCode: string | null;
  createdAt: string;
  lastMessageAt: string;
  unread: boolean;
  lastMessagePreview: string | null;
  lastMessageFromTeam: boolean;
}

export interface SupportMessage {
  id: string;
  authorKind: string;
  authorName: string;
  isMine: boolean;
  body: string;
  ctaLabel: string | null;
  ctaKind: string | null;
  ctaUrl: string | null;
  ctaHost: string | null;
  createdAt: string;
}

export interface SupportUnreadCount {
  conversations: number;
  reports: number;
  total: number;
  replyRequested: boolean;
  enabled: boolean;
}

export interface GetSupportUnreadCountResponse {
  supportUnreadCount: SupportUnreadCount;
}

export interface GetSupportThreadsResponse {
  supportThreads: SupportThread[];
}

export interface GetSupportThreadsVariables {
  tab: SupportTab;
}

export interface GetSupportThreadResponse {
  supportThread: { thread: SupportThread; messages: SupportMessage[] } | null;
}

export interface GetSupportThreadVariables {
  id: string;
}

export interface SupportCreateConversationResponse {
  supportCreateConversation: SupportThread;
}

export interface SupportCreateConversationVariables {
  subject: string;
  category: SupportThreadCategory;
  body: string;
}

export interface SupportReplyResponse {
  supportReply: SupportThread | null;
}

export interface SupportReplyVariables {
  threadId: string;
  body: string;
}

export interface SupportMarkReadResponse {
  supportMarkRead: boolean;
}

export interface SupportMarkReadVariables {
  threadId: string;
}
