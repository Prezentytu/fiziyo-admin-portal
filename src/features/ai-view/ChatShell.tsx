'use client';

import { usePathname } from 'next/navigation';

import { Header } from '@/components/layout/Header';
import { ChatSessionProvider } from './ChatSessionContext';
import { ChatShellControlsContext } from './ChatShellControls';
import { ChatSidebar } from './ChatSidebar';

interface ChatShellProps {
  readonly children: React.ReactNode;
  readonly isCollapsed: boolean;
  readonly isMobileOpen: boolean;
  readonly toggleCollapsed: () => void;
  readonly toggleMobile: () => void;
  readonly closeMobile: () => void;
}

/** Dashboard shell in chat mode: the chat sidebar on every page, the chat itself full-bleed on `/`. */
export function ChatShell({
  children,
  isCollapsed,
  isMobileOpen,
  toggleCollapsed,
  toggleMobile,
  closeMobile,
}: ChatShellProps) {
  const isChatHome = usePathname() === '/';
  // Only the chat home has the top bar with an expand button, so other pages keep the sidebar open.
  const collapsed = isChatHome && isCollapsed;

  return (
    <ChatSessionProvider>
      <ChatShellControlsContext.Provider
        value={{ isSidebarCollapsed: collapsed, toggleSidebar: toggleCollapsed, openMobileSidebar: toggleMobile }}
      >
        <div className="flex h-dvh bg-grouped">
          <ChatSidebar
            isCollapsed={collapsed}
            onToggleCollapse={isChatHome ? toggleCollapsed : undefined}
            isMobileOpen={isMobileOpen}
            onMobileClose={closeMobile}
          />
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {isChatHome ? (
              <main className="flex min-h-0 flex-1 flex-col">{children}</main>
            ) : (
              <>
                <Header onMobileMenuToggle={toggleMobile} />
                <main
                  className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-grouped p-4 lg:p-6 2xl:p-8"
                  style={{ scrollbarGutter: 'stable' }}
                >
                  {children}
                </main>
              </>
            )}
          </div>
        </div>
      </ChatShellControlsContext.Provider>
    </ChatSessionProvider>
  );
}
