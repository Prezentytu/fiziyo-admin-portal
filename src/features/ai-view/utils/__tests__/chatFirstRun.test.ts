import { describe, expect, it } from 'vitest';

import { isNewChatAccountSession } from '../chatFirstRun';

const createdAt = new Date('2026-11-20T12:00:00Z');
const hour = 60 * 60_000;

describe('isNewChatAccountSession', () => {
  it('accepts the session created during sign-up even when the portal finishes setting up later', () => {
    const session = new Date(createdAt.getTime() + 30_000);
    expect(isNewChatAccountSession(createdAt, session, createdAt.getTime() + hour)).toBe(true);
  });

  it('rejects a later login and excludes accounts older than the new-account window', () => {
    const laterSession = new Date(createdAt.getTime() + hour);
    expect(isNewChatAccountSession(createdAt, laterSession, laterSession.getTime())).toBe(false);
    expect(isNewChatAccountSession(createdAt, createdAt, createdAt.getTime() + 25 * hour)).toBe(false);
  });

  it('ignores invalid or future timestamps', () => {
    expect(isNewChatAccountSession(new Date(NaN), createdAt, createdAt.getTime())).toBe(false);
    expect(isNewChatAccountSession(createdAt, createdAt, createdAt.getTime() - 1)).toBe(false);
  });
});
