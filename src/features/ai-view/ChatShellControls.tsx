'use client';

import { createContext, useContext } from 'react';

export interface ChatShellControls {
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  openMobileSidebar: () => void;
}

const NOOP_CONTROLS: ChatShellControls = {
  isSidebarCollapsed: false,
  toggleSidebar: () => undefined,
  openMobileSidebar: () => undefined,
};

export const ChatShellControlsContext = createContext<ChatShellControls>(NOOP_CONTROLS);

/** Sidebar state owned by the dashboard layout; the chat top bar shows the menu button from it. */
export function useChatShellControls(): ChatShellControls {
  return useContext(ChatShellControlsContext);
}
