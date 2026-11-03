import { z } from 'zod';

import { isCardComponent, type ChatCardSpec } from './chatCards';
import type { DispatchFailure } from './resolveReply';

export type ChatThreadMessage =
  | { id: string; role: 'user'; text: string; attachmentName?: string; createdAt: number }
  | {
      id: string;
      role: 'assistant';
      text?: string;
      spec?: ChatCardSpec;
      /** `local`: the thread itself (next step of a flow), no dispatcher involved. */
      source: 'ai' | 'rules' | 'local';
      creditsUsed: number;
      fallbackReason?: DispatchFailure;
      /** Quick reply the therapist picked; the other replies under this message are spent. */
      chosen?: string;
      createdAt: number;
    };

export interface StoredConversation {
  id: string;
  title: string;
  updatedAt: number;
  messages: ChatThreadMessage[];
}

export const MAX_CONVERSATIONS = 20;
export const MAX_STORED_MESSAGES = 80;
const MAX_TITLE_LENGTH = 60;

const specSchema = z
  .object({ component: z.string() })
  .passthrough()
  .refine((spec) => isCardComponent(spec.component));

const messageSchema = z.discriminatedUnion('role', [
  z.object({
    id: z.string(),
    role: z.literal('user'),
    text: z.string(),
    attachmentName: z.string().optional(),
    createdAt: z.number(),
  }),
  z.object({
    id: z.string(),
    role: z.literal('assistant'),
    text: z.string().optional(),
    spec: specSchema.optional(),
    source: z.enum(['ai', 'rules', 'local']),
    creditsUsed: z.number(),
    fallbackReason: z.enum(['unavailable', 'insufficient_credits', 'unauthorized']).optional(),
    chosen: z.string().optional(),
    createdAt: z.number(),
  }),
]);

const conversationSchema = z.object({
  id: z.string(),
  title: z.string(),
  updatedAt: z.number(),
  messages: z.array(z.unknown()),
});

/** Conversations live per browser, per signed-in user and organization: another account never sees them. */
export function conversationStorageKey(userId: string, organizationId: string): string {
  return `fiziyo-chat-conversations:${userId}:${organizationId}`;
}

export const CONVERSATION_KEY_PREFIX = 'fiziyo-chat-conversations:';

/** Sign-out wipes every stored chat history in this browser; patient names live in it. */
export function clearStoredConversations(storage?: Pick<Storage, 'length' | 'key' | 'removeItem'>): void {
  try {
    const target = storage ?? window.localStorage;
    const keys: string[] = [];
    for (let index = 0; index < target.length; index += 1) {
      const key = target.key(index);
      if (key?.startsWith(CONVERSATION_KEY_PREFIX)) keys.push(key);
    }
    keys.forEach((key) => target.removeItem(key));
  } catch {
    // Storage can be blocked; sign-out must still happen.
  }
}

/** Invalid entries are dropped one by one; a broken message never takes the whole history with it. */
export function parseConversations(raw: string | null): StoredConversation[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const conversations: StoredConversation[] = [];
  for (const entry of parsed) {
    const conversation = conversationSchema.safeParse(entry);
    if (!conversation.success) continue;
    const messages = conversation.data.messages.flatMap((message) => {
      const result = messageSchema.safeParse(message);
      return result.success ? [result.data as ChatThreadMessage] : [];
    });
    if (messages.length === 0) continue;
    conversations.push({ ...conversation.data, messages });
  }
  return sortConversations(conversations).slice(0, MAX_CONVERSATIONS);
}

function sortConversations(conversations: StoredConversation[]): StoredConversation[] {
  return [...conversations].sort((left, right) => right.updatedAt - left.updatedAt);
}

export function conversationTitle(messages: readonly ChatThreadMessage[]): string {
  const first = messages.find((message) => message.role === 'user');
  const text = first?.role === 'user' ? first.text.replace(/\s+/g, ' ').trim() : '';
  if (!text) return 'Nowa rozmowa';
  return text.length > MAX_TITLE_LENGTH ? `${text.slice(0, MAX_TITLE_LENGTH - 1).trimEnd()}…` : text;
}

/** Newest first; an empty conversation is not kept, an existing one moves to the top. */
export function upsertConversation(
  conversations: readonly StoredConversation[],
  id: string,
  messages: readonly ChatThreadMessage[],
  now: number = Date.now()
): StoredConversation[] {
  const others = conversations.filter((conversation) => conversation.id !== id);
  if (messages.length === 0) return [...others];
  const next: StoredConversation = {
    id,
    title: conversationTitle(messages),
    updatedAt: now,
    messages: messages.slice(-MAX_STORED_MESSAGES),
  };
  return sortConversations([next, ...others]).slice(0, MAX_CONVERSATIONS);
}

export function removeConversation(conversations: readonly StoredConversation[], id: string): StoredConversation[] {
  return conversations.filter((conversation) => conversation.id !== id);
}

/** Puts back a conversation deleted a moment ago (undo), in its place by date. */
export function restoreConversation(
  conversations: readonly StoredConversation[],
  conversation: StoredConversation
): StoredConversation[] {
  const others = conversations.filter((existing) => existing.id !== conversation.id);
  return sortConversations([conversation, ...others]).slice(0, MAX_CONVERSATIONS);
}

export interface ConversationGroup {
  label: string;
  conversations: StoredConversation[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Sidebar sections by the local day of the last message: today, yesterday, this week, older. */
export function groupConversationsByDay(
  conversations: readonly StoredConversation[],
  now: Date = new Date()
): ConversationGroup[] {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const buckets: ConversationGroup[] = [
    { label: 'Dzisiaj', conversations: [] },
    { label: 'Wczoraj', conversations: [] },
    { label: 'Ostatnie 7 dni', conversations: [] },
    { label: 'Wcześniej', conversations: [] },
  ];
  for (const conversation of conversations) {
    const index =
      conversation.updatedAt >= startOfToday
        ? 0
        : conversation.updatedAt >= startOfToday - DAY_MS
          ? 1
          : conversation.updatedAt >= startOfToday - 6 * DAY_MS
            ? 2
            : 3;
    buckets[index].conversations.push(conversation);
  }
  return buckets.filter((bucket) => bucket.conversations.length > 0);
}
