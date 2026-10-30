'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';

import {
  CHAT_MODE_STORAGE_KEY,
  DEFAULT_CHAT_MODE,
  parseChatModePreference,
  type ChatModePreference,
} from './utils/chatModePreference';

const CHANGE_EVENT = 'fiziyo-chat-mode-change';

function subscribe(onChange: () => void): () => void {
  window.addEventListener('storage', onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(CHAT_MODE_STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Per-browser preference shared by the header toggle, settings and the dashboard. */
export function useChatMode() {
  const raw = useSyncExternalStore(subscribe, readRaw, () => null);
  const preference = useMemo(() => parseChatModePreference(raw), [raw]);

  const update = useCallback((patch: Partial<ChatModePreference>) => {
    const next = { ...parseChatModePreference(readRaw()), ...patch };
    try {
      window.localStorage.setItem(CHAT_MODE_STORAGE_KEY, JSON.stringify(next));
    } catch {
      return;
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { preference: raw === null ? DEFAULT_CHAT_MODE : preference, update };
}
