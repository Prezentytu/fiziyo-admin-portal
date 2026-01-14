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
  /** Map of userId -> patient count (from billing/therapist breakdown) */
  therapistPatientCounts?: Map<string, number>;
}

const roleConfig = {
  owner: { label: "Właściciel", icon: Crown, color: "text-amber-500", priority: 0 },
  admin: { label: "Administratorzy", icon: ShieldCheck, color: "text-blue-500", priority: 1 },
  therapist: { label: "Fizjoterapeuci", icon: User, color: "text-primary", priority: 2 },
  member: { label: "Członkowie", icon: User, color: "text-muted-foreground", priority: 3 },
};

// Filter out patients - only show staff members
const STAFF_ROLES = new Set(["owner", "admin", "therapist", "member"]);

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
  therapistPatientCounts,
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
      STAFF_ROLES.has(m.role.toLowerCase())
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
    <div className="space-y-8">
      {/* Section Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">Twój Zespół</h2>
            <p className="text-sm text-muted-foreground">
              {staffMembers.length} {staffMembers.length === 1 ? "osoba" : "osób"} w organizacji
            </p>
          </div>
        </div>
        {canInvite && !isAtTherapistLimit && (
          <Button onClick={onInviteClick} className="gap-2 bg-primary text-white font-bold h-11 px-8 rounded-xl shadow-lg shadow-primary/20 transition-all hover:bg-primary/90" data-testid="org-team-invite-btn">
            <UserPlus className="h-4 w-4" />
            Zaproś do zespołu
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

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex items-center gap-2 p-1 rounded-xl bg-accent/30 border border-border/40 w-full md:w-auto overflow-x-auto">
          {(["all", "admin", "therapist"] as RoleFilter[]).map((filter) => (
            <button
              key={filter}
              onClick={() => setRoleFilter(filter)}
              className={cn(
                "px-4 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap",
                roleFilter === filter 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              )}
              data-testid={`org-team-filter-${filter}`}
            >
              {filter === "all" && "Wszyscy"}
              {filter === "admin" && "Administratorzy"}
              {filter === "therapist" && "Fizjoterapeuci"}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Szukaj pracownika..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 bg-background border-input hover:border-primary/50 focus:ring-primary rounded-xl transition-all"
            data-testid="org-team-search-input"
          />
          {searchQuery && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setSearchQuery("")}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Results info */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Znaleziono{" "}
            <span className="font-semibold text-foreground">{filteredMembers.length}</span> pracownik(ów)
          </span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              setSearchQuery("");
              setRoleFilter("all");
            }}
            className="h-7 text-xs hover:bg-accent/50 rounded-lg text-primary"
          >
            Wyczyść filtry
          </Button>
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
                      assignedPatientsCount={therapistPatientCounts?.get(member.userId)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
