"use client";

import { useState } from "react";
import { MapPin, Plus, Search, X, Phone, Users, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useMutation } from "@apollo/client/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DELETE_CLINIC_MUTATION } from "@/graphql/mutations/clinics.mutations";
import { GET_ORGANIZATION_CLINICS_QUERY } from "@/graphql/queries/clinics.queries";
import { matchesSearchQuery } from "@/utils/textUtils";
import { cn } from "@/lib/utils";

export interface Clinic {
  id: string;
  name: string;
  address?: string;
  contactInfo?: string;
  isActive?: boolean;
  organizationId?: string;
}

interface ClinicsSectionProps {
  clinics: Clinic[];
  organizationId: string;
  isLoading?: boolean;
  canEdit?: boolean;
  onAddClick: () => void;
  onEditClinic: (clinic: Clinic) => void;
  onAssignPeople: (clinic: Clinic) => void;
  onRefresh?: () => void;
}

export function ClinicsSection({
  clinics,
  organizationId,
  isLoading = false,
  canEdit = false,
  onAddClick,
  onEditClinic,
  onAssignPeople,
  onRefresh,
}: ClinicsSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingClinic, setDeletingClinic] = useState<Clinic | null>(null);

  const [deleteClinic, { loading: deleting }] = useMutation(DELETE_CLINIC_MUTATION, {
    refetchQueries: [
      { query: GET_ORGANIZATION_CLINICS_QUERY, variables: { organizationId } },
    ],
  });

  // Filter clinics
  const filteredClinics = clinics.filter((clinic) => {
    if (!searchQuery) return true;
    return (
      matchesSearchQuery(clinic.name, searchQuery) ||
      matchesSearchQuery(clinic.address, searchQuery)
    );
  });

  // Sort: active first
  const sortedClinics = [...filteredClinics].sort((a, b) => {
    if (a.isActive === b.isActive) return 0;
    return a.isActive ? -1 : 1;
  });

  const handleDelete = async () => {
    if (!deletingClinic) return;

    try {
      await deleteClinic({
        variables: { id: deletingClinic.id },
      });
      toast.success("Gabinet został usunięty");
      setDeletingClinic(null);
      onRefresh?.();
    } catch (err) {
      console.error("Błąd podczas usuwania:", err);
      toast.error("Nie udało się usunąć gabinetu");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
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
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary/10">
            <MapPin className="h-5 w-5 text-secondary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Gabinety</h3>
            <p className="text-sm text-muted-foreground">
              {clinics.length} {clinics.length === 1 ? "lokalizacja" : "lokalizacji"}
            </p>
          </div>
        </div>
        {canEdit && (
          <Button onClick={onAddClick} variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            Dodaj gabinet
          </Button>
        )}
      </div>

      {/* Search (only if more than 3 clinics) */}
      {clinics.length > 3 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Szukaj gabinetu..."
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
      )}

      {/* Clinics Grid */}
      {sortedClinics.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title={searchQuery ? "Nie znaleziono gabinetów" : "Brak gabinetów"}
          description={
            searchQuery
              ? "Spróbuj zmienić kryteria wyszukiwania"
              : "Dodaj pierwszy gabinet do organizacji"
          }
          actionLabel={!searchQuery && canEdit ? "Dodaj gabinet" : undefined}
          onAction={!searchQuery && canEdit ? onAddClick : undefined}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sortedClinics.map((clinic) => (
            <div
              key={clinic.id}
              className={cn(
                "group relative rounded-xl border bg-surface p-4 transition-all duration-200",
                clinic.isActive
                  ? "border-border/40 hover:border-border hover:shadow-md"
                  : "border-border/20 opacity-60"
              )}
            >
              {/* Clinic info */}
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/10 shrink-0">
                      <MapPin className="h-4 w-4 text-secondary" />
                    </div>
                    <h4 className="font-semibold text-foreground truncate">
                      {clinic.name}
                    </h4>
                  </div>
                  {!clinic.isActive && (
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      Nieaktywny
                    </Badge>
                  )}
                </div>

                {clinic.address && (
                  <p className="text-sm text-muted-foreground line-clamp-2 pl-10">
                    {clinic.address}
                  </p>
                )}

                {clinic.contactInfo && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground pl-10">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{clinic.contactInfo}</span>
                  </div>
                )}
              </div>

              {/* Hover actions */}
              {canEdit && (
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEditClinic(clinic)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edytuj
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onAssignPeople(clinic)}>
                        <Users className="mr-2 h-4 w-4" />
                        Przypisz osoby
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setDeletingClinic(clinic)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Usuń
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deletingClinic}
        onOpenChange={(open) => !open && setDeletingClinic(null)}
        title="Usuń gabinet"
        description={`Czy na pewno chcesz usunąć gabinet "${deletingClinic?.name}"? Ta operacja jest nieodwracalna.`}
        confirmText="Usuń"
        variant="destructive"
        onConfirm={handleDelete}
        isLoading={deleting}
      />
    </section>
  );
}

