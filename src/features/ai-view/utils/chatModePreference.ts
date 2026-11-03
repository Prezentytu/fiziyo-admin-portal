export interface ChatModePreference {
  /** Chat replaces the classic dashboard (DEC-20261030-01, experimental). */
  enabled: boolean;
  /** Off = rule-based dispatcher only; nothing leaves the portal for a model. */
  useAi: boolean;
}

export const CHAT_MODE_STORAGE_KEY = 'fiziyo-chat-mode';
export const DEFAULT_CHAT_MODE: ChatModePreference = { enabled: false, useAi: true };

export function parseChatModePreference(raw: string | null): ChatModePreference {
  if (!raw) return DEFAULT_CHAT_MODE;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return DEFAULT_CHAT_MODE;
    const { enabled, useAi } = parsed as Record<string, unknown>;
    return {
      enabled: typeof enabled === 'boolean' ? enabled : DEFAULT_CHAT_MODE.enabled,
      useAi: typeof useAi === 'boolean' ? useAi : DEFAULT_CHAT_MODE.useAi,
    };
  } catch {
    return DEFAULT_CHAT_MODE;
  }
}
