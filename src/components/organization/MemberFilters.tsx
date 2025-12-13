"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type RoleFilter = "all" | "owner" | "admin" | "member" | "therapist";

interface MemberFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  roleFilter: RoleFilter;
  onRoleFilterChange: (role: RoleFilter) => void;
  resultCount: number;
  totalCount: number;
}

const roleFilterOptions: { value: RoleFilter; label: string }[] = [
  { value: "all", label: "Wszyscy" },
  { value: "owner", label: "Właściciele" },
  { value: "admin", label: "Administratorzy" },
  { value: "therapist", label: "Fizjoterapeuci" },
  { value: "member", label: "Członkowie" },
];

export function MemberFilters({
  searchQuery,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  resultCount,
  totalCount,
}: MemberFiltersProps) {
  const hasActiveFilters = searchQuery || roleFilter !== "all";

  const clearFilters = () => {
    onSearchChange("");
    onRoleFilterChange("all");
  };

  return (
    <div className="space-y-4">
      {/* Search and filters row */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Szukaj po imieniu lub emailu..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 h-11 bg-surface border-border/60"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
              onClick={() => onSearchChange("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Role filter buttons */}
        <div className="flex flex-wrap gap-2">
          {roleFilterOptions.map((option) => (
            <Button
              key={option.value}
              variant={roleFilter === option.value ? "default" : "outline"}
              size="sm"
              onClick={() => onRoleFilterChange(option.value)}
              className={cn(
                "h-9 transition-all",
                roleFilter === option.value
                  ? "shadow-lg shadow-primary/20"
                  : "border-border/60 hover:border-border"
              )}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Results info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {hasActiveFilters ? (
              <>
                Znaleziono{" "}
                <span className="font-medium text-foreground">{resultCount}</span> z{" "}
                <span className="font-medium text-foreground">{totalCount}</span> członków
              </>
            ) : (
              <>
                Łącznie{" "}
                <span className="font-medium text-foreground">{totalCount}</span> członków
              </>
            )}
          </span>
          {hasActiveFilters && (
            <Badge variant="secondary" className="gap-1.5">
              Aktywne filtry
              <button
                onClick={clearFilters}
                className="ml-1 hover:text-foreground transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}


