"use client";

import { useState } from "react";
import { useMutation } from "@apollo/client/react";
import {
  MapPin,
  Phone,
  MoreVertical,
  Pencil,
  Trash2,
  Power,
  PowerOff,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  UPDATE_CLINIC_MUTATION,
  DELETE_CLINIC_MUTATION,
} from "@/graphql/mutations/clinics.mutations";
import { GET_ORGANIZATION_CLINICS_QUERY } from "@/graphql/queries/clinics.queries";
import type { Clinic } from "./ClinicDialog";

interface ClinicCardProps {
  clinic: Clinic;
  organizationId: string;
  canEdit?: boolean;
  onEdit?: (clinic: Clinic) => void;
  onRefresh?: () => void;
  patientsCount?: number;
}

export function ClinicCard({
  clinic,
  organizationId,
  canEdit = false,
  onEdit,
  onRefresh,
  patientsCount,
}: ClinicCardProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isToggleStatusDialogOpen, setIsToggleStatusDialogOpen] = useState(false);

  const [updateClinic, { loading: updating }] = useMutation(
    UPDATE_CLINIC_MUTATION,
    {
      refetchQueries: [
        { query: GET_ORGANIZATION_CLINICS_QUERY, variables: { organizationId } },
      ],
    }
  );

  const [deleteClinic, { loading: deleting }] = useMutation(
    DELETE_CLINIC_MUTATION,
    {
      refetchQueries: [
        { query: GET_ORGANIZATION_CLINICS_QUERY, variables: { organizationId } },
      ],
    }
  );

  const handleToggleStatus = async () => {
    try {
      await updateClinic({
        variables: {
          clinicId: clinic.id,
          isActive: !clinic.isActive,
        },
      });
      toast.success(
        clinic.isActive
          ? "Gabinet został dezaktywowany"
          : "Gabinet został aktywowany"
      );
      setIsToggleStatusDialogOpen(false);
      onRefresh?.();
    } catch (error) {
      console.error("Błąd podczas zmiany statusu:", error);
      toast.error("Nie udało się zmienić statusu gabinetu");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteClinic({
        variables: { clinicId: clinic.id },
      });
      toast.success("Gabinet został usunięty");
      setIsDeleteDialogOpen(false);
      onRefresh?.();
    } catch (error) {
      console.error("Błąd podczas usuwania:", error);
      toast.error("Nie udało się usunąć gabinetu");
    }
  };

  return (
    <>
      <Card data-testid={`org-clinic-card-${clinic.id}`} className="group border-border/60 transition-all duration-200 hover:border-border hover:shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 min-w-0 flex-1">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface-light group-hover:bg-primary/10 transition-colors">
                <MapPin className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-foreground truncate">
                    {clinic.name}
                  </h3>
                  <Badge
                    variant={clinic.isActive ? "success" : "secondary"}
                    className="shrink-0"
                  >
                    {clinic.isActive ? "Aktywny" : "Nieaktywny"}
                  </Badge>
                </div>
                {clinic.address && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {clinic.address}
                  </p>
                )}
                <div className="flex items-center gap-4 mt-2">
                  {clinic.contactInfo && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      <span>{clinic.contactInfo}</span>
                    </div>
                  )}
                  {patientsCount !== undefined && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      <span>{patientsCount} pacjentów</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {canEdit && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    data-testid={`org-clinic-menu-${clinic.id}`}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => onEdit?.(clinic)} data-testid={`org-clinic-edit-${clinic.id}`}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edytuj
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setIsToggleStatusDialogOpen(true)}
                    data-testid={`org-clinic-toggle-status-${clinic.id}`}
                  >
                    {clinic.isActive ? (
                      <>
                        <PowerOff className="mr-2 h-4 w-4" />
                        Dezaktywuj
                      </>
                    ) : (
                      <>
                        <Power className="mr-2 h-4 w-4" />
                        Aktywuj
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setIsDeleteDialogOpen(true)}
                    className="text-destructive focus:text-destructive"
                    data-testid={`org-clinic-delete-${clinic.id}`}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Usuń gabinet
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Toggle Status Confirmation */}
      <ConfirmDialog
        open={isToggleStatusDialogOpen}
        onOpenChange={setIsToggleStatusDialogOpen}
        title={clinic.isActive ? "Dezaktywuj gabinet" : "Aktywuj gabinet"}
        description={
          clinic.isActive
            ? `Czy na pewno chcesz dezaktywować gabinet "${clinic.name}"? Nieaktywne gabinety nie będą widoczne przy planowaniu wizyt.`
            : `Czy na pewno chcesz aktywować gabinet "${clinic.name}"?`
        }
        confirmText={clinic.isActive ? "Dezaktywuj" : "Aktywuj"}
        variant={clinic.isActive ? "destructive" : "default"}
        onConfirm={handleToggleStatus}
        isLoading={updating}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Usuń gabinet"
        description={`Czy na pewno chcesz usunąć gabinet "${clinic.name}"? Ta operacja jest nieodwracalna.`}
        confirmText="Usuń"
        variant="destructive"
        onConfirm={handleDelete}
        isLoading={deleting}
      />
    </>
  );
}
