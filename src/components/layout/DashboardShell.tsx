'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileSidebar } from '@/components/layout/MobileSidebar';
import { Header } from '@/components/layout/Header';
import { OrganizationGuard } from '@/components/layout/OrganizationGuard';
import { OrganizationProvider } from '@/contexts/OrganizationContext';
import { CurrentUserProvider } from '@/contexts/CurrentUserContext';
import { ExerciseBuilderProvider } from '@/contexts/ExerciseBuilderContext';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { useSidebarState } from '@/hooks/useSidebarState';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isOnboarding = pathname === '/onboarding';
  const { isCollapsed, isMobileOpen, isHydrated, toggleCollapsed, toggleMobile, closeMobile } = useSidebarState();

  if (isOnboarding) {
    return (
      <div className="min-h-screen bg-background">
        <OrganizationGuard>{children}</OrganizationGuard>
      </div>
    );
  }

  return (
    <OrganizationGuard>
      <ErrorBoundary>
        <OrganizationProvider>
          <CurrentUserProvider>
            <ExerciseBuilderProvider>
              <div className="flex h-dvh bg-background">
                <Sidebar isCollapsed={isHydrated ? isCollapsed : false} onToggleCollapse={toggleCollapsed} />
                <MobileSidebar isOpen={isMobileOpen} onClose={closeMobile} />
                <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                  <Header onMobileMenuToggle={toggleMobile} />
                  <main
                    data-testid="nav-main-content"
                    className="min-h-0 min-w-0 flex-1 overflow-y-auto p-4 lg:p-6 2xl:p-8"
                    style={{ scrollbarGutter: 'stable' }}
                  >
                    {children}
                  </main>
                </div>
              </div>
            </ExerciseBuilderProvider>
          </CurrentUserProvider>
        </OrganizationProvider>
      </ErrorBoundary>
    </OrganizationGuard>
  );
}
