import { describe, expect, it } from 'vitest';

import { DEFAULT_CHAT_MODE, parseChatModePreference } from '../chatModePreference';

describe('parseChatModePreference', () => {
  it('is off with AI allowed by default', () => {
    expect(parseChatModePreference(null)).toEqual({ enabled: false, useAi: true });
  });

  it('reads stored flags and ignores wrong types', () => {
    expect(parseChatModePreference('{"enabled":true,"useAi":false}')).toEqual({ enabled: true, useAi: false });
    expect(parseChatModePreference('{"enabled":"yes"}')).toEqual(DEFAULT_CHAT_MODE);
  });

  it('survives broken storage', () => {
    expect(parseChatModePreference('{nope')).toEqual(DEFAULT_CHAT_MODE);
    expect(parseChatModePreference('[]')).toEqual(DEFAULT_CHAT_MODE);
  });
});
