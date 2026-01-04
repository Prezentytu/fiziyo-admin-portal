"use client";

import { useState, useEffect } from "react";
import { Building2, Check, ChevronDown, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import Link from "next/link";

// ========================================
// Types
// ========================================

interface OrganizationSwitcherProps {
  isCollapsed?: boolean;
}

// ========================================
// Helpers
// ========================================

const roleLabels: Record<string, string> = {
  OWNER: "Właściciel",
  owner: "Właściciel",
  ADMIN: "Admin",
  admin: "Admin",
  THERAPIST: "Fizjo",
  therapist: "Fizjo",
  MEMBER: "Członek",
  member: "Członek",
  STAFF: "Staff",
  staff: "Staff",
};

const roleColors: Record<string, string> = {
  OWNER: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  owner: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  ADMIN: "bg-primary/20 text-primary border-primary/30",
  admin: "bg-primary/20 text-primary border-primary/30",
  THERAPIST: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  therapist: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  MEMBER: "bg-muted text-muted-foreground border-border",
  member: "bg-muted text-muted-foreground border-border",
  STAFF: "bg-muted text-muted-foreground border-border",
  staff: "bg-muted text-muted-foreground border-border",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ========================================
// Component
// ========================================

export function OrganizationSwitcher({
  isCollapsed = false,
}: OrganizationSwitcherProps) {
  const {
    currentOrganization,
    organizations,
    isLoading,
    isSwitching,
    switchOrganization,
    hasMultipleOrganizations,
  } = useOrganization();

  const [isOpen, setIsOpen] = useState(false);

  // Keyboard shortcut: Cmd+O / Ctrl+O
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "o") {
        e.preventDefault();
        if (hasMultipleOrganizations) {
          setIsOpen((prev) => !prev);
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasMultipleOrganizations]);

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("border-b border-border/60", isCollapsed ? "p-2" : "p-3")}>
        {isCollapsed ? (
          <Skeleton className="h-10 w-10 rounded-xl mx-auto" />
        ) : (
          <div className="flex items-center gap-3 p-2">
            <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        )}
      </div>
    );
  }

  // No organization
  if (!currentOrganization) {
    return null;
  }

  const triggerContent = (
    <div
      className={cn(
        "group flex items-center rounded-xl transition-all duration-200 cursor-pointer",
        isCollapsed
          ? "h-10 w-10 justify-center hover:bg-surface-light"
          : "gap-3 p-2 hover:bg-surface-light w-full",
        isSwitching && "opacity-60 pointer-events-none"
      )}
    >
      {/* Organization Avatar */}
      {currentOrganization.logoUrl ? (
        <img
          src={currentOrganization.logoUrl}
          alt={currentOrganization.organizationName}
          className={cn(
            "rounded-xl object-cover shrink-0",
            isCollapsed ? "h-9 w-9" : "h-9 w-9"
          )}
        />
      ) : (
        <div
          className={cn(
            "flex items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold shrink-0",
            isCollapsed ? "h-9 w-9 text-sm" : "h-9 w-9 text-sm"
          )}
        >
          {getInitials(currentOrganization.organizationName)}
        </div>
      )}

      {/* Organization Info (expanded only) */}
      {!isCollapsed && (
        <>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground truncate">
                {currentOrganization.organizationName}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  "text-[10px] font-medium px-1.5 py-0.5 rounded",
                  roleColors[currentOrganization.role] ||
                    "bg-muted text-muted-foreground"
                )}
              >
                {roleLabels[currentOrganization.role] || currentOrganization.role}
              </span>
              {hasMultipleOrganizations && (
                <span className="text-[10px] text-muted-foreground">
                  +{organizations.length - 1}
                </span>
              )}
            </div>
          </div>

          {/* Chevron or Loader */}
          {isSwitching ? (
            <Loader2 className="h-4 w-4 text-muted-foreground animate-spin shrink-0" />
          ) : hasMultipleOrganizations ? (
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform duration-200 shrink-0",
                isOpen && "rotate-180"
              )}
            />
          ) : null}
        </>
      )}
    </div>
  );

  // Single organization - no dropdown
  if (!hasMultipleOrganizations) {
    if (isCollapsed) {
      return (
        <div className="border-b border-border/60 p-2">
          <Tooltip>
            <TooltipTrigger asChild>{triggerContent}</TooltipTrigger>
            <TooltipContent side="right" className="font-medium">
              <div className="text-sm">{currentOrganization.organizationName}</div>
              <div className="text-xs text-muted-foreground">
                {roleLabels[currentOrganization.role] || currentOrganization.role}
              </div>
            </TooltipContent>
          </Tooltip>
        </div>
      );
    }

    return (
      <div className="border-b border-border/60 p-3">{triggerContent}</div>
    );
  }

  // Multiple organizations - with dropdown
  const dropdownContent = (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild disabled={isSwitching}>
        {triggerContent}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align={isCollapsed ? "start" : "start"}
        side={isCollapsed ? "right" : "bottom"}
        sideOffset={isCollapsed ? 8 : 4}
        className="w-72"
      >
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
          Przełącz organizację
          <span className="ml-2 text-[10px] text-muted-foreground/60">
            ⌘O
          </span>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {organizations.map((org) => {
          const isActive = org.organizationId === currentOrganization.organizationId;

          return (
            <DropdownMenuItem
              key={org.organizationId}
              onClick={() => {
                if (!isActive) {
                  switchOrganization(org.organizationId);
                  setIsOpen(false);
                }
              }}
              className={cn(
                "flex items-center gap-3 p-2.5 cursor-pointer",
                isActive && "bg-primary/10"
              )}
            >
              {/* Avatar */}
              {org.logoUrl ? (
                <img
                  src={org.logoUrl}
                  alt={org.organizationName}
                  className="h-8 w-8 rounded-lg object-cover shrink-0"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-surface-light to-surface text-xs font-semibold text-muted-foreground shrink-0">
                  {getInitials(org.organizationName)}
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">
                  {org.organizationName}
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "text-[10px] font-medium px-1.5 py-0.5 rounded",
                      roleColors[org.role] || "bg-muted text-muted-foreground"
                    )}
                  >
                    {roleLabels[org.role] || org.role}
                  </span>
                </div>
              </div>

              {/* Check mark for active */}
              {isActive && (
                <Check className="h-4 w-4 text-primary shrink-0" />
              )}
            </DropdownMenuItem>
          );
        })}

        <DropdownMenuSeparator />

        {/* Create new organization link */}
        <DropdownMenuItem asChild>
          <Link
            href="/onboarding"
            className="flex items-center gap-3 p-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-dashed border-border">
              <Plus className="h-4 w-4" />
            </div>
            <span className="text-sm">Utwórz nową organizację</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  if (isCollapsed) {
    return (
      <div className="border-b border-border/60 p-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <div>{dropdownContent}</div>
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            <div className="text-sm">{currentOrganization.organizationName}</div>
            <div className="text-xs text-muted-foreground">
              Kliknij aby przełączyć • ⌘O
            </div>
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className="border-b border-border/60 p-3">{dropdownContent}</div>
  );
}


