'use client';

import { usePathname } from 'next/navigation';
import { useRef } from 'react';

import { Header } from '@/components/layout/Header';
import { ChatFirstRunTour } from './ChatFirstRunTour';
import { ChatSessionProvider } from './ChatSessionContext';
import { ChatShellControlsContext } from './ChatShellControls';
import { ChatSidebar } from './ChatSidebar';
import { useChatFirstRun } from './useChatFirstRun';

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
  const collapsed = isCollapsed;
  const scopeRef = useRef<HTMLDivElement>(null);
  const tour = useChatFirstRun(isChatHome && !isMobileOpen);
  const showTourSidebar = tour.step === 1 || tour.step === 2;

  return (
    <ChatSessionProvider>
      <ChatShellControlsContext.Provider
        value={{
          isSidebarCollapsed: collapsed,
          toggleSidebar: toggleCollapsed,
          openMobileSidebar: toggleMobile,
          restartTour: tour.restartTour,
        }}
      >
        <div ref={scopeRef} className="flex h-dvh bg-grouped">
          <ChatSidebar
            isCollapsed={collapsed}
            onToggleCollapse={toggleCollapsed}
            isMobileOpen={isMobileOpen}
            onMobileClose={closeMobile}
            showTourSidebar={showTourSidebar}
            tourAccountMenu={tour.step === 2 ? { canManageOrganization: tour.canManageOrganization } : undefined}
          />
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {isChatHome ? (
              <main className="flex min-h-0 flex-1 flex-col">{children}</main>
            ) : (
              <>
                <Header onMobileMenuToggle={toggleMobile} onExpandSidebar={collapsed ? toggleCollapsed : undefined} />
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
        {tour.step !== null && (
          <ChatFirstRunTour
            scopeRef={scopeRef}
            step={tour.step}
            canManageOrganization={tour.canManageOrganization}
            onStep={tour.goToStep}
            onDismiss={tour.dismiss}
          />
        )}
      </ChatShellControlsContext.Provider>
    </ChatSessionProvider>
  );
}
