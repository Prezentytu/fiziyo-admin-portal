"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Dumbbell,
  FolderKanban,
  Users,
  Building2,
  CreditCard,
  Settings,
  PanelLeftClose,
  PanelLeft,
  FileText,
  Sparkles,
  LucideIcon,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { OrganizationSwitcher } from "./OrganizationSwitcher";
import { UserProfileFooter } from "./UserProfileFooter";
import { Logo } from "@/components/shared/Logo";
import { useRoleAccess } from "@/hooks/useRoleAccess";

// ========================================
// Types
// ========================================

interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
  testId: string;
  /** Optional badge indicator (e.g., notifications count) */
  badge?: number | null;
  /** Optional accent icon for AI-powered features */
  hasAiAccent?: boolean;
}

interface NavigationGroup {
  label: string;
  items: NavigationItem[];
  /** If true, this group is only visible to owners and admins */
  adminOnly?: boolean;
}

// ========================================
// Navigation Configuration - 3 Zones
// ========================================

const navigationGroups: NavigationGroup[] = [
  // STREFA 1: KLINIKA (Codzienna praca - 90% czasu)
  {
    label: "Klinika",
    items: [
      { name: "Panel", href: "/", icon: LayoutDashboard, testId: "nav-link-dashboard" },
      { name: "Pacjenci", href: "/patients", icon: Users, testId: "nav-link-patients" },
      { name: "Zestawy", href: "/exercise-sets", icon: FolderKanban, testId: "nav-link-exercise-sets" },
      { name: "Ćwiczenia", href: "/exercises", icon: Dumbbell, testId: "nav-link-exercises" },
    ],
  },
  // STREFA 2: SMART TOOLS (AI & Import)
  {
    label: "Smart Tools",
    items: [
      { 
        name: "Import Dokumentów", 
        href: "/import", 
        icon: FileText, 
        testId: "nav-link-import",
        hasAiAccent: true,
      },
    ],
  },
  // STREFA 3: ORGANIZACJA (Admin - rzadziej używane)
  {
    label: "Organizacja",
    adminOnly: true,
    items: [
      { name: "Zespół", href: "/organization", icon: Building2, testId: "nav-link-organization" },
      { name: "Rozliczenia", href: "/billing", icon: CreditCard, testId: "nav-link-billing" },
      { name: "Ustawienia", href: "/settings", icon: Settings, testId: "nav-link-settings" },
    ],
  },
];

interface SidebarProps {
  readonly isCollapsed: boolean;
  readonly onToggleCollapse: () => void;
}

export function Sidebar({ isCollapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const { canManageOrganization } = useRoleAccess();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  // Filter navigation groups based on user role
  const filteredNavigationGroups = useMemo(() => {
    return navigationGroups.filter((group) => {
      if (group.adminOnly) {
        return canManageOrganization;
      }
      return true;
    });
  }, [canManageOrganization]);

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        data-testid="nav-sidebar"
        className={cn(
          "hidden lg:flex h-screen flex-col border-r border-border/60 bg-surface transition-all duration-300 ease-in-out",
          isCollapsed ? "w-[72px]" : "w-64"
        )}
      >
        {/* Header with logo and toggle */}
        <div
          className={cn(
            "flex h-16 items-center border-b border-border/60 transition-all duration-300",
            isCollapsed ? "justify-center px-3" : "justify-between px-4"
          )}
        >
          <Logo
            variant={isCollapsed ? "icon" : "full"}
            size="md"
            asLink
            href="/"
          />

          {!isCollapsed && (
            <button
              onClick={onToggleCollapse}
              data-testid="nav-collapse-btn"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-light hover:text-foreground transition-colors"
              aria-label="Zwiń menu"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Expand button when collapsed */}
        {isCollapsed && (
          <div className="flex justify-center py-3 border-b border-border">
            <button
              onClick={onToggleCollapse}
              data-testid="nav-expand-btn"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-light hover:text-foreground transition-colors"
              aria-label="Rozwiń menu"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Organization Switcher */}
        <OrganizationSwitcher isCollapsed={isCollapsed} />

        {/* Navigation groups */}
        <nav className="flex-1 overflow-y-auto py-4">
          {filteredNavigationGroups.map((group, groupIndex) => (
            <div key={group.label} className={cn(groupIndex > 0 && "mt-6")}>
              {/* Group label */}
              {!isCollapsed && (
                <p className="px-4 mb-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {group.label}
                </p>
              )}
              {isCollapsed && groupIndex > 0 && <div className="mx-3 mb-2 border-t border-border" />}

              {/* Navigation items */}
              <div className={cn("space-y-1", isCollapsed ? "flex flex-col items-center" : "px-3")}>
                {group.items.map((item) => {
                  const active = isActive(item.href);
                  const Icon = item.icon;

                  const linkContent = (
                    <Link
                      href={item.href}
                      data-testid={item.testId}
                      className={cn(
                        "group relative flex items-center rounded-xl text-sm font-medium transition-all duration-200",
                        isCollapsed ? "h-10 w-10 justify-center" : "gap-3 px-3 py-2.5",
                        active
                          ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                          : "text-muted-foreground hover:bg-surface-light hover:text-foreground"
                      )}
                    >
                      <div className="relative">
                        <Icon
                          className={cn(
                            "h-5 w-5 shrink-0 transition-transform duration-200",
                            !active && "group-hover:scale-110"
                          )}
                        />
                        {/* AI Accent - small sparkle indicator */}
                        {item.hasAiAccent && !active && (
                          <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-primary" />
                        )}
                      </div>

                      {!isCollapsed && (
                        <>
                          <span className="flex-1 truncate">{item.name}</span>
                          
                          {/* Badge indicator */}
                          {item.badge && item.badge > 0 && (
                            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-white">
                              {item.badge > 99 ? "99+" : item.badge}
                            </span>
                          )}
                          
                          {/* AI accent indicator in expanded mode */}
                          {item.hasAiAccent && !active && (
                            <Sparkles className="h-3.5 w-3.5 text-primary opacity-60" />
                          )}
                        </>
                      )}
                    </Link>
                  );

                  // Wrap with tooltip when collapsed
                  if (isCollapsed) {
                    return (
                      <Tooltip key={item.name}>
                        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                        <TooltipContent side="right" className="font-medium">
                          <div className="flex items-center gap-2">
                            {item.name}
                            {item.hasAiAccent && (
                              <Sparkles className="h-3 w-3 text-primary" />
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  }

                  return <div key={item.name}>{linkContent}</div>;
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User Profile Footer */}
        <UserProfileFooter isCollapsed={isCollapsed} />
      </aside>
    </TooltipProvider>
  );
}
