"use client";

import { useState } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { User, Settings, HelpCircle, LogOut, ChevronUp } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganization } from "@/contexts/OrganizationContext";

// ========================================
// Types
// ========================================

interface UserProfileFooterProps {
  readonly isCollapsed: boolean;
}

// ========================================
// Helpers
// ========================================

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function truncateEmail(email: string, maxLength: number = 20): string {
  if (email.length <= maxLength) return email;
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const truncatedLocal = local.slice(0, 3) + "...";
  return `${truncatedLocal}@${domain}`;
}

// ========================================
// Component
// ========================================

export function UserProfileFooter({ isCollapsed }: UserProfileFooterProps) {
  const { user, isLoaded } = useUser();
  const { signOut, openUserProfile } = useClerk();
  const { hasMultipleOrganizations, currentOrganization, organizations, switchOrganization, isSwitching } = useOrganization();
  const [isOpen, setIsOpen] = useState(false);

  const avatarUrl = user?.imageUrl;
  const fullName = user?.fullName || user?.firstName || "Użytkownik";
  const email = user?.primaryEmailAddress?.emailAddress || "";
  const initials = getInitials(fullName);

  // Loading state
  if (!isLoaded) {
    return (
      <div className={cn("border-t border-border/60", isCollapsed ? "p-2" : "p-3")}>
        {isCollapsed ? (
          <Skeleton className="h-10 w-10 rounded-full mx-auto" />
        ) : (
          <div className="flex items-center gap-3 p-2">
            <Skeleton className="h-9 w-9 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        )}
      </div>
    );
  }

  const menuContent = (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          data-testid="nav-user-footer-trigger"
          className={cn(
            "group flex items-center rounded-xl transition-all duration-200 cursor-pointer w-full",
            isCollapsed
              ? "h-10 w-10 justify-center hover:bg-surface-light mx-auto"
              : "gap-3 p-2.5 hover:bg-surface-light"
          )}
        >
          {/* Avatar */}
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarImage src={avatarUrl} alt={fullName} />
            <AvatarFallback className="bg-linear-to-br from-primary to-primary-dark text-white text-sm font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>

          {/* User Info (expanded only) */}
          {!isCollapsed && (
            <>
              <div className="flex-1 min-w-0 text-left">
                <div className="text-sm font-medium text-foreground truncate">
                  {fullName}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {truncateEmail(email)}
                </div>
              </div>

              {/* Menu Icon - changes on hover/open */}
              <ChevronUp 
                className={cn(
                  "h-4 w-4 text-muted-foreground transition-all shrink-0",
                  isOpen ? "opacity-100 rotate-0" : "opacity-0 group-hover:opacity-100 -rotate-180"
                )} 
              />
            </>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align={isCollapsed ? "start" : "end"}
        side={isCollapsed ? "right" : "top"}
        sideOffset={8}
        className="w-72"
      >
        {/* User info header - "Zalogowany jako" */}
        <DropdownMenuLabel className="p-3 pb-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
            Zalogowany jako
          </p>
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={avatarUrl} alt={fullName} />
              <AvatarFallback className="bg-linear-to-br from-primary to-primary-dark text-white text-sm font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground truncate">{fullName}</p>
              <p className="text-xs text-muted-foreground truncate">{email}</p>
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* Organization switch - only if multiple orgs */}
        {hasMultipleOrganizations && (
          <>
            <DropdownMenuLabel className="px-3 py-1.5 text-[10px] text-muted-foreground uppercase tracking-wider">
              Przełącz organizację
            </DropdownMenuLabel>
            {organizations.map((org) => {
              const isActive = org.organizationId === currentOrganization?.organizationId;
              return (
                <DropdownMenuItem
                  key={org.organizationId}
                  onClick={() => {
                    if (!isActive && !isSwitching) {
                      switchOrganization(org.organizationId);
                      setIsOpen(false);
                    }
                  }}
                  data-testid={`nav-user-footer-org-${org.organizationId}`}
                  className={cn(
                    "gap-3 px-3 py-2 cursor-pointer",
                    isActive && "bg-primary/10",
                    isSwitching && "opacity-50 pointer-events-none"
                  )}
                >
                  {org.logoUrl ? (
                    <img
                      src={org.logoUrl}
                      alt={org.organizationName}
                      className="h-6 w-6 rounded-md object-cover"
                    />
                  ) : (
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-surface-light text-[10px] font-semibold text-muted-foreground">
                      {getInitials(org.organizationName)}
                    </div>
                  )}
                  <span className={cn("flex-1 truncate", isActive && "font-medium")}>
                    {org.organizationName}
                  </span>
                  {isActive && (
                    <span className="text-[10px] text-primary">Aktywna</span>
                  )}
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
          </>
        )}

        {/* Profile settings - opens Clerk modal */}
        <DropdownMenuItem
          onClick={() => openUserProfile()}
          data-testid="nav-user-footer-profile"
          className="gap-3 px-3 py-2.5 cursor-pointer"
        >
          <User className="h-4 w-4 text-muted-foreground" />
          <span>Mój profil</span>
        </DropdownMenuItem>

        {/* Settings link */}
        <DropdownMenuItem
          asChild
          className="gap-3 px-3 py-2.5 cursor-pointer"
        >
          <Link href="/settings" data-testid="nav-user-footer-settings">
            <Settings className="h-4 w-4 text-muted-foreground" />
            <span>Ustawienia konta</span>
          </Link>
        </DropdownMenuItem>

        {/* Help / Support */}
        <DropdownMenuItem
          asChild
          className="gap-3 px-3 py-2.5 cursor-pointer"
        >
          <a
            href="mailto:support@fiziyo.app"
            data-testid="nav-user-footer-help"
            target="_blank"
            rel="noopener noreferrer"
          >
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
            <span>Pomoc / Support</span>
          </a>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Sign out */}
        <DropdownMenuItem
          onClick={() => signOut({ redirectUrl: "/sign-in" })}
          data-testid="nav-user-footer-logout"
          className="gap-3 px-3 py-2.5 cursor-pointer text-error focus:text-error focus:bg-error/10"
        >
          <LogOut className="h-4 w-4" />
          <span>Wyloguj się</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // Collapsed version with tooltip
  if (isCollapsed) {
    return (
      <div className="border-t border-border/60 p-2 bg-surface-light/30">
        <Tooltip>
          <TooltipTrigger asChild>
            <div>{menuContent}</div>
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            <div className="text-sm">{fullName}</div>
            <div className="text-xs text-muted-foreground">Kliknij dla opcji</div>
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  // Expanded version
  return (
    <div className="border-t border-border/60 p-3 bg-surface-light/30">
      {menuContent}
    </div>
  );
}
