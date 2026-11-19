'use client';

import { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileSidebar } from '@/components/layout/MobileSidebar';
import { Header } from '@/components/layout/Header';
import { OrganizationGuard } from '@/components/layout/OrganizationGuard';
import { OrganizationProvider } from '@/contexts/OrganizationContext';
import { ExerciseBuilderProvider } from '@/contexts/ExerciseBuilderContext';
import { DemoPoolProvider } from '@/features/exercises/demoPool';
import { useSidebarState } from '@/hooks/useSidebarState';
import { ChatShell } from '@/features/ai-view/ChatShell';
import { TelemetryIdentity } from '@/components/telemetry/TelemetryIdentity';
import { TelemetryConsentPrompt } from '@/components/telemetry/TelemetryConsentPrompt';
import { AiCreditsRequestHost } from '@/features/ai-credits/AiCreditsRequestHost';
import { useChatMode } from '@/features/ai-view/useChatMode';
import { ReleaseNoteBanner } from '@/features/whats-new/ReleaseNoteBanner';
import { SupportReplyBanner } from '@/features/support/SupportReplyBanner';

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

  const content = (
    <>
      <Suspense fallback={null}>
        <ReleaseNoteBanner />
      </Suspense>
      <SupportReplyBanner />
      {children}
    </>
  );

  // Normalne strony dashboardu
  return (
    <OrganizationGuard>
      <OrganizationProvider>
        <TelemetryIdentity />
        <TelemetryConsentPrompt />
        <AiCreditsRequestHost />
        <DemoPoolProvider>
          <ExerciseBuilderProvider>
            {preference.enabled ? (
              <ChatShell
                isCollapsed={isHydrated && isCollapsed}
                isMobileOpen={isMobileOpen}
                toggleCollapsed={toggleCollapsed}
                toggleMobile={toggleMobile}
                closeMobile={closeMobile}
              >
                {content}
              </ChatShell>
            ) : (
              <div className="flex h-dvh bg-grouped">
                {/* Desktop Sidebar */}
                <Sidebar isCollapsed={isHydrated ? isCollapsed : false} onToggleCollapse={toggleCollapsed} />

                {/* Mobile Sidebar */}
                <MobileSidebar isOpen={isMobileOpen} onClose={closeMobile} />

                {/* Main content area */}
                <div className="flex flex-1 flex-col overflow-hidden min-h-0">
                  <Header onMobileMenuToggle={toggleMobile} />
                  <main
                    className="flex flex-1 flex-col overflow-y-auto min-h-0 bg-grouped p-4 lg:p-6 2xl:p-8"
                    style={{ scrollbarGutter: 'stable' }}
                  >
                    {content}
                  </main>
                </div>
              </div>
            )}
          </ExerciseBuilderProvider>
        </DemoPoolProvider>
      </OrganizationProvider>
    </OrganizationGuard>
  );
}
