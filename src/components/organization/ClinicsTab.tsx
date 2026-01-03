"use client";

import { useState } from "react";
import { MapPin, Plus, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { ClinicExpandableCard, Clinic } from "./ClinicExpandableCard";
import { matchesSearchQuery } from "@/utils/textUtils";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "active" | "inactive";

interface AssignedPerson {
  id: string;
  fullname?: string;
  email?: string;
  image?: string;
}

interface ClinicWithAssignments extends Clinic {
  assignedTherapists?: AssignedPerson[];
  assignedPatients?: AssignedPerson[];
}

interface ClinicsTabProps {
  clinics: ClinicWithAssignments[];
  organizationId: string;
  isLoading?: boolean;
  canEdit?: boolean;
  onAddClick: () => void;
  onEditClinic: (clinic: Clinic) => void;
  onAssignPeople: (clinic: Clinic) => void;
  onRefresh?: () => void;
}

export function ClinicsTab({
  clinics,
  organizationId,
  isLoading = false,
  canEdit = false,
  onAddClick,
  onEditClinic,
  onAssignPeople,
  onRefresh,
}: ClinicsTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Filter clinics
  const filteredClinics = clinics.filter((clinic) => {
    // Status filter
    if (statusFilter !== "all") {
      const isActive = clinic.isActive ?? true;
      if (statusFilter === "active" && !isActive) return false;
      if (statusFilter === "inactive" && isActive) return false;
    }

    // Search filter
    if (searchQuery) {
      return (
        matchesSearchQuery(clinic.name, searchQuery) ||
        matchesSearchQuery(clinic.address, searchQuery)
      );
    }

    return true;
  });

  const hasActiveFilters = searchQuery || statusFilter !== "all";

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
  };

  if (isLoading) {
    return (
      <Card className="border-border/60">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Gabinety</CardTitle>
            <CardDescription>Lokalizacje prowadzenia działalności</CardDescription>
          </div>
          <Skeleton className="h-10 w-36" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Skeleton className="h-11 flex-1 max-w-md" />
            <div className="flex gap-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-9 w-24" />
              ))}
            </div>
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border-border/60">
                <CardContent className="p-5">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-14 w-14 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-4 w-64" />
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
          <CardTitle className="text-xl">Gabinety</CardTitle>
          <CardDescription>
            Lokalizacje prowadzenia działalności fizjoterapeutycznej
          </CardDescription>
        </div>
        {canEdit && (
          <Button onClick={onAddClick} className="gap-2 shadow-lg shadow-primary/20">
            <Plus className="h-4 w-4" />
            Dodaj gabinet
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filters */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Szukaj po nazwie lub adresie..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 bg-surface border-border/60"
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

            {/* Status filters */}
            <div className="flex gap-2">
              {(["all", "active", "inactive"] as StatusFilter[]).map((status) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(status)}
                  className={cn(
                    "h-9 transition-all",
                    statusFilter === status
                      ? "shadow-lg shadow-primary/20"
                      : "border-border/60 hover:border-border"
                  )}
                >
                  {status === "all" && "Wszystkie"}
                  {status === "active" && "Aktywne"}
                  {status === "inactive" && "Nieaktywne"}
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
                    <span className="font-medium text-foreground">
                      {filteredClinics.length}
                    </span>{" "}
                    z{" "}
                    <span className="font-medium text-foreground">
                      {clinics.length}
                    </span>{" "}
                    gabinetów
                  </>
                ) : (
                  <>
                    Łącznie{" "}
                    <span className="font-medium text-foreground">
                      {clinics.length}
                    </span>{" "}
                    gabinetów
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

        {/* Clinics list */}
        {filteredClinics.length === 0 ? (
          <EmptyState
            icon={MapPin}
            title={
              hasActiveFilters ? "Nie znaleziono gabinetów" : "Brak gabinetów"
            }
            description={
              hasActiveFilters
                ? "Spróbuj zmienić kryteria wyszukiwania lub filtry"
                : "Dodaj pierwszy gabinet do organizacji"
            }
            actionLabel={!hasActiveFilters && canEdit ? "Dodaj gabinet" : undefined}
            onAction={!hasActiveFilters && canEdit ? onAddClick : undefined}
          />
        ) : (
          <div className="space-y-3">
            {filteredClinics.map((clinic) => (
              <ClinicExpandableCard
                key={clinic.id}
                clinic={clinic}
                organizationId={organizationId}
                canEdit={canEdit}
                assignedTherapists={clinic.assignedTherapists}
                assignedPatients={clinic.assignedPatients}
                onEdit={onEditClinic}
                onAssignPeople={onAssignPeople}
                onRefresh={onRefresh}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}









