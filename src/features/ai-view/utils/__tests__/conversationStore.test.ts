import { describe, expect, it } from 'vitest';

import {
  clearStoredConversations,
  conversationStorageKey,
  conversationTitle,
  MAX_CONVERSATIONS,
  MAX_STORED_MESSAGES,
  parseConversations,
  removeConversation,
  upsertConversation,
  type ChatThreadMessage,
} from '../conversationStore';

function userMessage(id: string, text: string): ChatThreadMessage {
  return { id, role: 'user', text, createdAt: 1 };
}

const ASSISTANT: ChatThreadMessage = {
  id: 'a1',
  role: 'assistant',
  text: 'Gotowe.',
  spec: { component: 'Sent', patientId: 'p1', setName: 'Kolano', planLabel: 'od jutra' },
  source: 'local',
  creditsUsed: 0,
  createdAt: 2,
};

describe('conversationStorageKey', () => {
  it('scopes history to the user and the organization', () => {
    expect(conversationStorageKey('u1', 'org-a')).not.toBe(conversationStorageKey('u1', 'org-b'));
    expect(conversationStorageKey('u1', 'org-a')).not.toBe(conversationStorageKey('u2', 'org-a'));
  });
});

describe('parseConversations', () => {
  it('drops broken messages and unknown cards one by one', () => {
    const raw = JSON.stringify([
      {
        id: 'c1',
        title: 'Kolano',
        updatedAt: 5,
        messages: [
          userMessage('m1', 'kolano'),
          ASSISTANT,
          { id: 'x', role: 'assistant', spec: { component: 'Html' } },
          42,
        ],
      },
      { id: 'c2', title: 'Pusta', updatedAt: 9, messages: [{ broken: true }] },
      'nonsense',
    ]);
    const conversations = parseConversations(raw);
    expect(conversations).toHaveLength(1);
    expect(conversations[0].messages.map((message) => message.id)).toEqual(['m1', 'a1']);
  });

  it('keeps the result cards of saved forms, so a reload never shows the form again', () => {
    const added: ChatThreadMessage = {
      id: 'a2',
      role: 'assistant',
      spec: { component: 'PatientAdded', patientId: 'p-new', name: 'Anna Nowak' },
      source: 'local',
      creditsUsed: 0,
      createdAt: 3,
    };
    const raw = JSON.stringify(upsertConversation([], 'c1', [userMessage('m1', 'dodaj pacjenta'), added]));
    expect(parseConversations(raw)[0].messages.at(-1)).toEqual(added);
  });

  it('survives invalid JSON and non-arrays', () => {
    expect(parseConversations('{')).toEqual([]);
    expect(parseConversations('{"a":1}')).toEqual([]);
    expect(parseConversations(null)).toEqual([]);
  });
});

describe('conversationTitle', () => {
  it('takes the first user message, shortened', () => {
    expect(conversationTitle([ASSISTANT, userMessage('m1', '  Ułóż   zestaw  ')])).toBe('Ułóż zestaw');
    expect(conversationTitle([userMessage('m1', 'a'.repeat(100))])).toHaveLength(60);
    expect(conversationTitle([])).toBe('Nowa rozmowa');
  });
});

describe('upsertConversation', () => {
  it('moves the updated conversation to the top and drops empty ones', () => {
    const first = upsertConversation([], 'c1', [userMessage('m1', 'pierwsza')], 1);
    const both = upsertConversation(first, 'c2', [userMessage('m2', 'druga')], 2);
    const updated = upsertConversation(both, 'c1', [userMessage('m1', 'pierwsza'), ASSISTANT], 3);
    expect(updated.map((conversation) => conversation.id)).toEqual(['c1', 'c2']);
    expect(upsertConversation(updated, 'c2', [], 4).map((conversation) => conversation.id)).toEqual(['c1']);
  });

  it('keeps the newest messages and conversations within limits', () => {
    const messages = Array.from({ length: MAX_STORED_MESSAGES + 5 }, (_, index) => userMessage(`m${index}`, 'x'));
    expect(upsertConversation([], 'c1', messages)[0].messages).toHaveLength(MAX_STORED_MESSAGES);

    let conversations = upsertConversation([], 'c0', [userMessage('m', 'x')], 0);
    for (let index = 1; index <= MAX_CONVERSATIONS; index += 1) {
      conversations = upsertConversation(conversations, `c${index}`, [userMessage('m', 'x')], index);
    }
    expect(conversations).toHaveLength(MAX_CONVERSATIONS);
    expect(conversations.some((conversation) => conversation.id === 'c0')).toBe(false);
  });
});

describe('removeConversation', () => {
  it('removes one conversation', () => {
    const conversations = upsertConversation([], 'c1', [userMessage('m1', 'x')]);
    expect(removeConversation(conversations, 'c1')).toEqual([]);
  });
});

describe('clearStoredConversations', () => {
  it('removes every chat history and nothing else', () => {
    window.localStorage.setItem(conversationStorageKey('u1', 'org-a'), '[]');
    window.localStorage.setItem(conversationStorageKey('u2', 'org-b'), '[]');
    window.localStorage.setItem('fiziyo-chat-mode', '{"enabled":true}');
    clearStoredConversations(window.localStorage);
    expect(window.localStorage.getItem(conversationStorageKey('u1', 'org-a'))).toBeNull();
    expect(window.localStorage.getItem(conversationStorageKey('u2', 'org-b'))).toBeNull();
    expect(window.localStorage.getItem('fiziyo-chat-mode')).toBe('{"enabled":true}');
  });
});
