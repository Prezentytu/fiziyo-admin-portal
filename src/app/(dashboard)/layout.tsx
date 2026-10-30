'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileSidebar } from '@/components/layout/MobileSidebar';
import { Header } from '@/components/layout/Header';
import { OrganizationGuard } from '@/components/layout/OrganizationGuard';
import { OrganizationProvider } from '@/contexts/OrganizationContext';
import { ExerciseBuilderProvider } from '@/contexts/ExerciseBuilderContext';
import { useSidebarState } from '@/hooks/useSidebarState';
import { ChatSessionProvider } from '@/features/ai-view/ChatSessionContext';
import { ChatShellControlsContext } from '@/features/ai-view/ChatShellControls';
import { ChatSidebar } from '@/features/ai-view/ChatSidebar';
import { useChatMode } from '@/features/ai-view/useChatMode';

export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const isOnboarding = pathname === '/onboarding';
  const { isCollapsed, isMobileOpen, isHydrated, toggleCollapsed, toggleMobile, closeMobile } = useSidebarState();
  const { preference } = useChatMode();

  // Onboarding page - bez sidebar i header
  if (isOnboarding) {
    return (
      <div className="min-h-screen bg-background">
        <OrganizationGuard>{children}</OrganizationGuard>
      </div>
    );
  }

  if (preference.enabled) {
    const isChatHome = pathname === '/';
    // Only the chat home has the top bar with an expand button, so other pages keep the sidebar open.
    const collapsed = isHydrated && isChatHome ? isCollapsed : false;
    return (
      <OrganizationGuard>
        <OrganizationProvider>
          <ExerciseBuilderProvider>
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
          </ExerciseBuilderProvider>
        </OrganizationProvider>
      </OrganizationGuard>
    );
  }

  // Normalne strony dashboardu
  return (
    <OrganizationGuard>
      <OrganizationProvider>
        <ExerciseBuilderProvider>
          <div className="flex h-dvh bg-grouped">
            {/* Desktop Sidebar */}
            <Sidebar isCollapsed={isHydrated ? isCollapsed : false} onToggleCollapse={toggleCollapsed} />

            {/* Mobile Sidebar */}
            <MobileSidebar isOpen={isMobileOpen} onClose={closeMobile} />

            {/* Main content area */}
            <div className="flex flex-1 flex-col overflow-hidden min-h-0">
              <Header onMobileMenuToggle={toggleMobile} />
              <main className="flex flex-1 flex-col overflow-y-auto min-h-0 bg-grouped p-4 lg:p-6 2xl:p-8" style={{ scrollbarGutter: 'stable' }}>
                {children}
              </main>
            </div>
          </div>
        </ExerciseBuilderProvider>
      </OrganizationProvider>
    </OrganizationGuard>
  );
}
