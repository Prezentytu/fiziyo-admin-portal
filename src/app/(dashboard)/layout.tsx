"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { OrganizationGuard } from "@/components/layout/OrganizationGuard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isOnboarding = pathname === "/onboarding";

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
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </OrganizationGuard>
  );
}
