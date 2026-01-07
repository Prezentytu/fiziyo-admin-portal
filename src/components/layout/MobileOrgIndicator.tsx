"use client";

import { Building2, ChevronDown } from "lucide-react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

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

export function MobileOrgIndicator() {
  const {
    currentOrganization,
    organizations,
    isLoading,
    isSwitching,
    switchOrganization,
    hasMultipleOrganizations,
  } = useOrganization();

  // Loading state
  if (isLoading) {
    return <Skeleton className="h-8 w-28 rounded-lg" />;
  }

  // No organization
  if (!currentOrganization) {
    return null;
  }

  // Trigger content
  const triggerContent = (
    <button
      className={cn(
        "flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors",
        "hover:bg-surface-light",
        "text-sm font-medium text-foreground",
        isSwitching && "opacity-60 pointer-events-none"
      )}
      disabled={isSwitching}
    >
      {/* Avatar */}
      {currentOrganization.logoUrl ? (
        <img
          src={currentOrganization.logoUrl}
          alt={currentOrganization.organizationName}
          className="h-6 w-6 rounded-md object-cover"
        />
      ) : (
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/20 text-primary text-[10px] font-bold">
          {getInitials(currentOrganization.organizationName)}
        </div>
      )}

      {/* Name (truncated) */}
      <span className="max-w-[100px] truncate">
        {currentOrganization.organizationName}
      </span>

      {/* Chevron or loader */}
      {isSwitching ? (
        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
      ) : hasMultipleOrganizations ? (
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      ) : null}
    </button>
  );

  // Single organization - no dropdown
  if (!hasMultipleOrganizations) {
    return triggerContent;
  }

  // Multiple organizations - with dropdown
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{triggerContent}</DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
          Przełącz organizację
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {organizations.map((org) => {
          const isActive =
            org.organizationId === currentOrganization.organizationId;

          return (
            <DropdownMenuItem
              key={org.organizationId}
              onClick={() => {
                if (!isActive) {
                  switchOrganization(org.organizationId);
                }
              }}
              className={cn(
                "flex items-center gap-3 p-2 cursor-pointer",
                isActive && "bg-primary/10"
              )}
            >
              {/* Avatar */}
              {org.logoUrl ? (
                <img
                  src={org.logoUrl}
                  alt={org.organizationName}
                  className="h-7 w-7 rounded-md object-cover shrink-0"
                />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-surface-light text-[10px] font-semibold text-muted-foreground shrink-0">
                  {getInitials(org.organizationName)}
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">
                  {org.organizationName}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {roleLabels[org.role] || org.role}
                </div>
              </div>

              {/* Check mark */}
              {isActive && <Check className="h-4 w-4 text-primary shrink-0" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}



