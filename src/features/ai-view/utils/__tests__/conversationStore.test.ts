import { describe, expect, it } from 'vitest';

import {
  clearStoredConversations,
  conversationStorageKey,
  conversationTitle,
  MAX_CONVERSATIONS,
  MAX_STORED_MESSAGES,
  parseConversations,
  groupConversationsByDay,
  removeConversation,
  restoreConversation,
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

describe('restoreConversation', () => {
  it('puts a deleted conversation back in its place by date', () => {
    const older = { id: 'c1', title: 'Starsza', updatedAt: 1, messages: [] };
    const deleted = { id: 'c2', title: 'Usunięta', updatedAt: 2, messages: [] };
    const newer = { id: 'c3', title: 'Nowsza', updatedAt: 3, messages: [] };

    const restored = restoreConversation(removeConversation([newer, deleted, older], 'c2'), deleted);

    expect(restored.map((conversation) => conversation.id)).toEqual(['c3', 'c2', 'c1']);
  });
});

describe('groupConversationsByDay', () => {
  it('sorts conversations into today, yesterday, this week and older by local day', () => {
    const now = new Date(2026, 9, 30, 9, 0);
    const at = (day: number, hour: number) => new Date(2026, 9, day, hour).getTime();
    const conversation = (id: string, updatedAt: number) => ({ id, title: id, updatedAt, messages: [] });

    const groups = groupConversationsByDay(
      [
        conversation('today', at(30, 0)),
        conversation('yesterday-late', at(29, 23)),
        conversation('week', at(24, 8)),
        conversation('older', at(23, 23)),
      ],
      now
    );

    expect(groups.map((group) => [group.label, group.conversations.map((item) => item.id)])).toEqual([
      ['Dzisiaj', ['today']],
      ['Wczoraj', ['yesterday-late']],
      ['Ostatnie 7 dni', ['week']],
      ['Wcześniej', ['older']],
    ]);
  });

  it('leaves out empty sections', () => {
    const now = new Date(2026, 9, 30, 9, 0);
    expect(groupConversationsByDay([{ id: 'c1', title: 'c1', updatedAt: now.getTime(), messages: [] }], now)).toEqual([
      { label: 'Dzisiaj', conversations: [{ id: 'c1', title: 'c1', updatedAt: now.getTime(), messages: [] }] },
    ]);
  });
});
