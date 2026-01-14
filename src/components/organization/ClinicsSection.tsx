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
    <div className="space-y-8">
      {/* Section Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/10">
            <MapPin className="h-5 w-5 text-secondary" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">Twoje Gabinety</h2>
            <p className="text-sm text-muted-foreground">
              {clinics.length} {clinics.length === 1 ? "lokalizacja" : "lokalizacji"} w organizacji
            </p>
          </div>
        </div>
        {canEdit && (
          <Button onClick={onAddClick} className="gap-2 bg-primary text-white font-bold h-11 px-8 rounded-xl shadow-lg shadow-primary/20 transition-all hover:bg-primary/90" data-testid="org-clinics-add-btn">
            <Plus className="h-4 w-4" />
            Dodaj gabinet
          </Button>
        )}
      </div>

      {/* Search (only if more than 3 clinics) */}
      {clinics.length > 3 && (
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Szukaj gabinetu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 bg-background border-input hover:border-primary/50 focus:ring-primary rounded-xl transition-all"
            data-testid="org-clinics-search-input"
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sortedClinics.map((clinic) => (
            <div
              key={clinic.id}
              className={cn(
                "group relative rounded-xl border p-5 transition-all duration-300",
                clinic.isActive
                  ? "border-border/50 bg-card/30 hover:bg-card/50 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
                  : "border-border/20 bg-muted/30 opacity-60"
              )}
              data-testid={`org-clinics-item-${clinic.id}`}
            >
              {/* Clinic info */}
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/10 shrink-0 group-hover:scale-110 transition-transform">
                      <MapPin className="h-5 w-5 text-secondary" />
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground truncate group-hover:text-primary transition-colors">
                        {clinic.name}
                      </h4>
                      {!clinic.isActive && (
                        <Badge variant="outline" className="mt-1 h-5 text-[10px] uppercase font-bold tracking-wider bg-background/50 border-border/50 text-muted-foreground">
                          Nieaktywny
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {clinic.address && (
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0 mt-0.5 opacity-50" />
                    <p className="line-clamp-2">{clinic.address}</p>
                  </div>
                )}

                {clinic.contactInfo && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4 shrink-0 opacity-50" />
                    <span className="truncate">{clinic.contactInfo}</span>
                  </div>
                )}
              </div>

              {/* Hover actions */}
              {canEdit && (
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-background border border-transparent hover:border-border/50 transition-all">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 rounded-xl">
                      <DropdownMenuItem onClick={() => onEditClinic(clinic)} className="rounded-lg" data-testid={`org-clinics-edit-${clinic.id}`}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edytuj dane
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onAssignPeople(clinic)} className="rounded-lg" data-testid={`org-clinics-assign-${clinic.id}`}>
                        <Users className="mr-2 h-4 w-4" />
                        Przypisz zespół
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-border/50" />
                      <DropdownMenuItem
                        onClick={() => setDeletingClinic(clinic)}
                        className="text-destructive focus:text-destructive rounded-lg"
                        data-testid={`org-clinics-delete-${clinic.id}`}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Usuń gabinet
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
    </div>
  );
}
