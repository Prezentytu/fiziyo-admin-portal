"use client";

import { MoreVertical, Pencil, Trash2, Eye, Mail, Phone, FolderKanban } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface Patient {
  id: string;
  fullname?: string;
  email?: string;
  image?: string;
  isShadowUser?: boolean;
  personalData?: {
    firstName?: string;
    lastName?: string;
  };
  contactData?: {
    phone?: string;
    address?: string;
  };
  assignmentStatus?: string;
  contextLabel?: string;
  contextColor?: string;
}

interface PatientCardProps {
  patient: Patient;
  onView?: (patient: Patient) => void;
  onEdit?: (patient: Patient) => void;
  onDelete?: (patient: Patient) => void;
  onAssignSet?: (patient: Patient) => void;
  className?: string;
  compact?: boolean;
}

export function PatientCard({
  patient,
  onView,
  onEdit,
  onDelete,
  onAssignSet,
  className,
  compact = false,
}: PatientCardProps) {
  const displayName =
    patient.fullname ||
    `${patient.personalData?.firstName || ""} ${patient.personalData?.lastName || ""}`.trim() ||
    "Nieznany pacjent";

  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg border border-border bg-surface p-3 transition-colors hover:bg-surface-light cursor-pointer",
          className
        )}
        onClick={() => onView?.(patient)}
      >
        <Avatar className="h-10 w-10">
          <AvatarImage src={patient.image} alt={displayName} />
          <AvatarFallback className="bg-primary text-primary-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium truncate">{displayName}</p>
            {patient.isShadowUser && (
              <Badge variant="secondary" className="text-xs">
                Tymczasowy
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {patient.email && (
              <span className="flex items-center gap-1 truncate">
                <Mail className="h-3 w-3" />
                {patient.email}
              </span>
            )}
            {patient.contactData?.phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {patient.contactData.phone}
              </span>
            )}
          </div>
        </div>
        {patient.contextLabel && (
          <Badge
            variant="outline"
            style={{
              borderColor: patient.contextColor || undefined,
              color: patient.contextColor || undefined,
            }}
          >
            {patient.contextLabel}
          </Badge>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onView && (
              <DropdownMenuItem onClick={() => onView(patient)}>
                <Eye className="mr-2 h-4 w-4" />
                Podgląd
              </DropdownMenuItem>
            )}
            {onEdit && (
              <DropdownMenuItem onClick={() => onEdit(patient)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edytuj
              </DropdownMenuItem>
            )}
            {onAssignSet && (
              <DropdownMenuItem onClick={() => onAssignSet(patient)}>
                <FolderKanban className="mr-2 h-4 w-4" />
                Przypisz zestaw
              </DropdownMenuItem>
            )}
            {onDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete(patient)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Usuń
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <Card
      className={cn(
        "cursor-pointer transition-colors hover:bg-surface-light",
        className
      )}
      onClick={() => onView?.(patient)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={patient.image} alt={displayName} />
              <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">{displayName}</CardTitle>
              {patient.isShadowUser && (
                <Badge variant="secondary" className="text-xs mt-1">
                  Konto tymczasowe
                </Badge>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onView && (
                <DropdownMenuItem onClick={() => onView(patient)}>
                  <Eye className="mr-2 h-4 w-4" />
                  Podgląd
                </DropdownMenuItem>
              )}
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(patient)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edytuj
                </DropdownMenuItem>
              )}
              {onAssignSet && (
                <DropdownMenuItem onClick={() => onAssignSet(patient)}>
                  <FolderKanban className="mr-2 h-4 w-4" />
                  Przypisz zestaw
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(patient)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Usuń
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm text-muted-foreground">
          {patient.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <span className="truncate">{patient.email}</span>
            </div>
          )}
          {patient.contactData?.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              <span>{patient.contactData.phone}</span>
            </div>
          )}
        </div>
        {patient.contextLabel && (
          <Badge
            variant="outline"
            className="mt-3"
            style={{
              borderColor: patient.contextColor || undefined,
              color: patient.contextColor || undefined,
            }}
          >
            {patient.contextLabel}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}

