"use client";

import { useState } from "react";
import { useMutation } from "@apollo/client/react";
import {
  ChevronDown,
  MapPin,
  MoreVertical,
  Pencil,
  Phone,
  Power,
  PowerOff,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import { cn } from "@/lib/utils";

export interface Clinic {
  id: string;
  name: string;
  address?: string;
  contactInfo?: string;
  isActive?: boolean;
  organizationId?: string;
}

interface AssignedPerson {
  id: string;
  fullname?: string;
  email?: string;
  image?: string;
  role?: "therapist" | "patient";
}

interface ClinicExpandableCardProps {
  clinic: Clinic;
  organizationId: string;
  canEdit?: boolean;
  assignedTherapists?: AssignedPerson[];
  assignedPatients?: AssignedPerson[];
  onEdit?: (clinic: Clinic) => void;
  onAssignPeople?: (clinic: Clinic) => void;
  onRefresh?: () => void;
}

export function ClinicExpandableCard({
  clinic,
  organizationId,
  canEdit = false,
  assignedTherapists = [],
  assignedPatients = [],
  onEdit,
  onAssignPeople,
  onRefresh,
}: ClinicExpandableCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isToggleStatusDialogOpen, setIsToggleStatusDialogOpen] = useState(false);

  const [updateClinic, { loading: updating }] = useMutation(UPDATE_CLINIC_MUTATION, {
    refetchQueries: [
      { query: GET_ORGANIZATION_CLINICS_QUERY, variables: { organizationId } },
    ],
  });

  const [deleteClinic, { loading: deleting }] = useMutation(DELETE_CLINIC_MUTATION, {
    refetchQueries: [
      { query: GET_ORGANIZATION_CLINICS_QUERY, variables: { organizationId } },
    ],
  });

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

  const totalAssigned = assignedTherapists.length + assignedPatients.length;

  return (
    <>
      <Card
        className={cn(
          "group border-border/60 transition-all duration-200",
          isOpen && "border-border shadow-md",
          !isOpen && "hover:border-border hover:shadow-sm"
        )}
      >
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CardContent className="p-0">
            {/* Main row */}
            <div className="flex items-center gap-4 p-5">
              {/* Icon */}
              <div
                className={cn(
                  "flex h-14 w-14 shrink-0 items-center justify-center rounded-xl transition-colors",
                  clinic.isActive
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <MapPin className="h-7 w-7" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-foreground text-lg truncate">
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
                  <p className="text-sm text-muted-foreground line-clamp-1">
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
                  {totalAssigned > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      <span>
                        {assignedTherapists.length} terapeutów,{" "}
                        {assignedPatients.length} pacjentów
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {canEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAssignPeople?.(clinic);
                    }}
                    className="gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <UserPlus className="h-4 w-4" />
                    Przypisz
                  </Button>
                )}

                {canEdit && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => onEdit?.(clinic)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edytuj
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setIsToggleStatusDialogOpen(true)}
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
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Usuń gabinet
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <ChevronDown
                      className={cn(
                        "h-5 w-5 transition-transform duration-200",
                        isOpen && "rotate-180"
                      )}
                    />
                  </Button>
                </CollapsibleTrigger>
              </div>
            </div>

            {/* Expandable content */}
            <CollapsibleContent>
              <div className="border-t border-border/60 p-5 bg-surface-light/30">
                <div className="grid gap-6 sm:grid-cols-2">
                  {/* Therapists */}
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">
                      Przypisani terapeuci ({assignedTherapists.length})
                    </h4>
                    {assignedTherapists.length > 0 ? (
                      <div className="space-y-2">
                        {assignedTherapists.map((person) => (
                          <div
                            key={person.id}
                            className="flex items-center gap-3 p-2 rounded-lg bg-surface"
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={person.image} />
                              <AvatarFallback className="text-xs">
                                {(person.fullname || person.email || "?")
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm truncate">
                              {person.fullname || person.email || "Nieznany"}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        Brak przypisanych terapeutów
                      </p>
                    )}
                  </div>

                  {/* Patients */}
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">
                      Przypisani pacjenci ({assignedPatients.length})
                    </h4>
                    {assignedPatients.length > 0 ? (
                      <div className="space-y-2">
                        {assignedPatients.slice(0, 5).map((person) => (
                          <div
                            key={person.id}
                            className="flex items-center gap-3 p-2 rounded-lg bg-surface"
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={person.image} />
                              <AvatarFallback className="text-xs">
                                {(person.fullname || person.email || "?")
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm truncate">
                              {person.fullname || person.email || "Nieznany"}
                            </span>
                          </div>
                        ))}
                        {assignedPatients.length > 5 && (
                          <p className="text-xs text-muted-foreground pl-2">
                            + {assignedPatients.length - 5} więcej
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        Brak przypisanych pacjentów
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </CardContent>
        </Collapsible>
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











