"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileSidebar } from "@/components/layout/MobileSidebar";
import { Header } from "@/components/layout/Header";
import { OrganizationGuard } from "@/components/layout/OrganizationGuard";
import { OrganizationProvider } from "@/contexts/OrganizationContext";
import { ExerciseBuilderProvider } from "@/contexts/ExerciseBuilderContext";
import { AIChatButton } from "@/components/chat/AIChatButton";
import { useSidebarState } from "@/hooks/useSidebarState";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isOnboarding = pathname === "/onboarding";
  const {
    isCollapsed,
    isMobileOpen,
    isHydrated,
    toggleCollapsed,
    toggleMobile,
    closeMobile,
  } = useSidebarState();

  // Onboarding page - bez sidebar i header
  if (isOnboarding) {
    return (
      <div className="min-h-screen bg-background">
        <OrganizationGuard>{children}</OrganizationGuard>
      </div>
    );
  }

  // Normalne strony dashboardu
  return (
    <OrganizationGuard>
      <OrganizationProvider>
        <ExerciseBuilderProvider>
          <div className="flex h-screen bg-background">
            {/* Desktop Sidebar */}
            <Sidebar
              isCollapsed={isHydrated ? isCollapsed : false}
              onToggleCollapse={toggleCollapsed}
            />

            {/* Mobile Sidebar */}
            <MobileSidebar isOpen={isMobileOpen} onClose={closeMobile} />

            {/* Main content area */}
            <div className="flex flex-1 flex-col overflow-hidden">
              <Header onMobileMenuToggle={toggleMobile} />
              <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
            </div>

            {/* AI Chat Floating Button */}
            <AIChatButton />
          </div>
        </ExerciseBuilderProvider>
      </OrganizationProvider>
    </OrganizationGuard>
  );
}
