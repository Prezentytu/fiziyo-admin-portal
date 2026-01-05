"use client";

import { useState, useMemo } from "react";
import { Users, UserPlus, Search, X, Crown, ShieldCheck, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { MemberCard, OrganizationMember } from "./MemberCard";
import { SubscriptionBanner } from "@/components/subscription/SubscriptionBanner";
import { matchesSearchQuery } from "@/utils/textUtils";
import { cn } from "@/lib/utils";

type RoleFilter = "all" | "admin" | "therapist";

interface SubscriptionLimits {
  maxTherapists?: number;
  maxPatients?: number;
  maxClinics?: number;
}

interface CurrentUsage {
  therapists?: number;
  patients?: number;
}

interface TeamSectionProps {
  members: OrganizationMember[];
  organizationId: string;
  currentUserId?: string;
  currentUserRole?: string;
  isLoading?: boolean;
  canInvite?: boolean;
  onInviteClick: () => void;
  onRefresh?: () => void;
  // Subscription limits for pre-emptive check
  limits?: SubscriptionLimits;
  currentUsage?: CurrentUsage;
  planName?: string;
}

const roleConfig = {
  owner: { label: "Właściciel", icon: Crown, color: "text-amber-500", priority: 0 },
  admin: { label: "Administratorzy", icon: ShieldCheck, color: "text-blue-500", priority: 1 },
  therapist: { label: "Fizjoterapeuci", icon: User, color: "text-primary", priority: 2 },
  member: { label: "Członkowie", icon: User, color: "text-muted-foreground", priority: 3 },
};

// Filter out patients - only show staff members
const STAFF_ROLES = ["owner", "admin", "therapist", "member"];

export function TeamSection({
  members,
  organizationId,
  currentUserId,
  currentUserRole,
  isLoading = false,
  canInvite = false,
  onInviteClick,
  onRefresh,
  limits,
  currentUsage,
  planName = "Free",
}: TeamSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");

  // Pre-emptive limit check for therapists
  const maxTherapists = limits?.maxTherapists;
  const currentTherapists = currentUsage?.therapists ?? 0;
  const isAtTherapistLimit = maxTherapists != null && currentTherapists >= maxTherapists;

  // Filter to staff only (exclude patients)
  const staffMembers = useMemo(() => {
    return members.filter((m) =>
      STAFF_ROLES.includes(m.role.toLowerCase())
    );
  }, [members]);

  // Apply search and role filter
  const filteredMembers = useMemo(() => {
    return staffMembers.filter((member) => {
      // Role filter
      if (roleFilter !== "all") {
        const memberRole = member.role.toLowerCase();
        if (roleFilter === "admin" && memberRole !== "owner" && memberRole !== "admin") {
          return false;
        }
        if (roleFilter === "therapist" && memberRole !== "therapist") {
          return false;
        }
      }

      // Search filter
      if (searchQuery) {
        const fullName = member.user?.fullname || "";
        const email = member.user?.email || "";
        return (
          matchesSearchQuery(fullName, searchQuery) ||
          matchesSearchQuery(email, searchQuery)
        );
      }

      return true;
    });
  }, [staffMembers, roleFilter, searchQuery]);

  // Group and sort by role
  const groupedMembers = useMemo(() => {
    const groups: Record<string, OrganizationMember[]> = {
      owner: [],
      admin: [],
      therapist: [],
      member: [],
    };

    filteredMembers.forEach((m) => {
      const role = m.role.toLowerCase();
      if (groups[role]) {
        groups[role].push(m);
      }
    });

    return groups;
  }, [filteredMembers]);

  const hasActiveFilters = searchQuery || roleFilter !== "all";

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 flex-1 max-w-sm" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <section className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Zespół</h3>
            <p className="text-sm text-muted-foreground">
              {staffMembers.length} {staffMembers.length === 1 ? "osoba" : "osób"} w organizacji
            </p>
          </div>
        </div>
        {canInvite && !isAtTherapistLimit && (
          <Button onClick={onInviteClick} className="gap-2 shadow-lg shadow-primary/20">
            <UserPlus className="h-4 w-4" />
            Zaproś
          </Button>
        )}
      </div>

      {/* Limit reached banner */}
      {canInvite && isAtTherapistLimit && (
        <SubscriptionBanner
          variant="urgent"
          limitType="therapists"
          currentUsage={currentTherapists}
          maxLimit={maxTherapists}
          planName={planName}
        />
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Szukaj w zespole..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 bg-surface border-border/60"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
              onClick={() => setSearchQuery("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          {(["all", "admin", "therapist"] as RoleFilter[]).map((filter) => (
            <Button
              key={filter}
              variant={roleFilter === filter ? "default" : "outline"}
              size="sm"
              onClick={() => setRoleFilter(filter)}
              className={cn(
                "h-9 transition-all",
                roleFilter === filter
                  ? "shadow-lg shadow-primary/20"
                  : "border-border/60 hover:border-border"
              )}
            >
              {filter === "all" && "Wszyscy"}
              {filter === "admin" && "Administratorzy"}
              {filter === "therapist" && "Fizjoterapeuci"}
            </Button>
          ))}
        </div>
      </div>

      {/* Results info */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Znaleziono{" "}
            <span className="font-medium text-foreground">{filteredMembers.length}</span> z{" "}
            <span className="font-medium text-foreground">{staffMembers.length}</span>
          </span>
          <Badge variant="secondary" className="gap-1.5">
            Aktywne filtry
            <button
              onClick={() => {
                setSearchQuery("");
                setRoleFilter("all");
              }}
              className="ml-1 hover:text-foreground transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        </div>
      )}

      {/* Members grouped by role */}
      {filteredMembers.length === 0 ? (
        <EmptyState
          icon={Users}
          title={hasActiveFilters ? "Nie znaleziono osób" : "Brak członków zespołu"}
          description={
            hasActiveFilters
              ? "Spróbuj zmienić kryteria wyszukiwania"
              : "Zaproś pierwszą osobę do zespołu"
          }
          actionLabel={!hasActiveFilters && canInvite && !isAtTherapistLimit ? "Zaproś do zespołu" : undefined}
          onAction={!hasActiveFilters && canInvite && !isAtTherapistLimit ? onInviteClick : undefined}
        />
      ) : (
        <div className="space-y-6">
          {(["owner", "admin", "therapist", "member"] as const).map((role) => {
            const roleMembers = groupedMembers[role];
            if (roleMembers.length === 0) return null;

            const config = roleConfig[role];
            const Icon = config.icon;

            return (
              <div key={role} className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <Icon className={cn("h-4 w-4", config.color)} />
                  <span className="text-sm font-medium text-muted-foreground">
                    {config.label}
                  </span>
                  <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                    {roleMembers.length}
                  </Badge>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {roleMembers.map((member) => (
                    <MemberCard
                      key={member.id}
                      member={member}
                      organizationId={organizationId}
                      currentUserId={currentUserId}
                      currentUserRole={currentUserRole}
                      onRefresh={onRefresh}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
