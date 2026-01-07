"use client";

import { useState, useMemo } from "react";
import { Users, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { MemberFilters, RoleFilter } from "./MemberFilters";
import { MemberCard, OrganizationMember } from "./MemberCard";
import { matchesSearchQuery } from "@/utils/textUtils";

interface MembersTabProps {
  members: OrganizationMember[];
  organizationId: string;
  currentUserId?: string;
  currentUserRole?: string;
  isLoading?: boolean;
  canInvite?: boolean;
  onInviteClick: () => void;
  onRefresh?: () => void;
}

export function MembersTab({
  members,
  organizationId,
  currentUserId,
  currentUserRole,
  isLoading = false,
  canInvite = false,
  onInviteClick,
  onRefresh,
}: MembersTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");

  // Filter members
  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      // Role filter
      if (roleFilter !== "all") {
        const memberRole = member.role.toLowerCase();
        if (memberRole !== roleFilter) return false;
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
  }, [members, roleFilter, searchQuery]);

  // Sort members by role priority
  const sortedMembers = useMemo(() => {
    const rolePriority: Record<string, number> = {
      owner: 0,
      admin: 1,
      therapist: 2,
      member: 3,
    };

    return [...filteredMembers].sort((a, b) => {
      const priorityA = rolePriority[a.role.toLowerCase()] ?? 4;
      const priorityB = rolePriority[b.role.toLowerCase()] ?? 4;
      return priorityA - priorityB;
    });
  }, [filteredMembers]);

  if (isLoading) {
    return (
      <Card className="border-border/60">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Personel</CardTitle>
            <CardDescription>Zarządzaj użytkownikami organizacji</CardDescription>
          </div>
          <Skeleton className="h-10 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Skeleton className="h-11 flex-1 max-w-md" />
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-9 w-24" />
              ))}
            </div>
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i} className="border-border/60">
                <CardContent className="p-5">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-14 w-14 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-4 w-56" />
                      <Skeleton className="h-5 w-28" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="text-xl">Personel</CardTitle>
          <CardDescription>
            Zarządzaj użytkownikami organizacji i ich uprawnieniami
          </CardDescription>
        </div>
        {canInvite && (
          <Button onClick={onInviteClick} className="gap-2 shadow-lg shadow-primary/20">
            <UserPlus className="h-4 w-4" />
            Zaproś użytkownika
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filters */}
        <MemberFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          roleFilter={roleFilter}
          onRoleFilterChange={setRoleFilter}
          resultCount={sortedMembers.length}
          totalCount={members.length}
        />

        {/* Members list */}
        {sortedMembers.length === 0 ? (
          <EmptyState
            icon={Users}
            title={
              searchQuery || roleFilter !== "all"
                ? "Nie znaleziono członków"
                : "Brak członków"
            }
            description={
              searchQuery || roleFilter !== "all"
                ? "Spróbuj zmienić kryteria wyszukiwania lub filtry"
                : "Zaproś pierwszego użytkownika do organizacji"
            }
            actionLabel={
              !searchQuery && roleFilter === "all" && canInvite
                ? "Zaproś użytkownika"
                : undefined
            }
            onAction={
              !searchQuery && roleFilter === "all" && canInvite
                ? onInviteClick
                : undefined
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-2">
            {sortedMembers.map((member) => (
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
        )}
      </CardContent>
    </Card>
  );
}














