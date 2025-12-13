"use client";

import { useState } from "react";
import { useQuery } from "@apollo/client/react";
import { Mail, Phone, MapPin, Calendar, FolderKanban, Activity, UserX, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { GET_PATIENT_ASSIGNMENTS_BY_USER_QUERY } from "@/graphql/queries/patientAssignments.queries";
import { cn } from "@/lib/utils";

interface Patient {
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
  assignedAt?: string;
  contextLabel?: string;
  contextColor?: string;
}

interface PatientExpandedContentProps {
  patient: Patient;
  onAssignSet: () => void;
  onViewReport: () => void;
  onToggleStatus: () => void;
  onRemove: () => void;
  organizationId: string;
}

interface PatientAssignment {
  id: string;
  exerciseSetId?: string;
  exerciseSet?: {
    id: string;
    name: string;
    description?: string;
  };
  assignedAt?: string;
  status?: string;
}

export function PatientExpandedContent({
  patient,
  onAssignSet,
  onViewReport,
  onToggleStatus,
  onRemove,
  organizationId,
}: PatientExpandedContentProps) {
  const { data, loading } = useQuery(GET_PATIENT_ASSIGNMENTS_BY_USER_QUERY, {
    variables: { userId: patient.id },
    skip: !patient.id,
  });

  const assignments: PatientAssignment[] =
    (data as { patientAssignments?: PatientAssignment[] })?.patientAssignments || [];

  const exerciseSetAssignments = assignments.filter((a) => a.exerciseSetId);

  const displayName =
    patient.fullname ||
    `${patient.personalData?.firstName || ""} ${patient.personalData?.lastName || ""}`.trim() ||
    "Nieznany pacjent";

  const isActive = patient.assignmentStatus !== "inactive";

  return (
    <div className="pt-4 space-y-6">
      <Separator />

      {/* Contact Information */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-foreground">Informacje kontaktowe</h4>
        <div className="space-y-2">
          {patient.email && (
            <a
              href={`mailto:${patient.email}`}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Mail className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{patient.email}</span>
            </a>
          )}
          {patient.contactData?.phone && (
            <a
              href={`tel:${patient.contactData.phone}`}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Phone className="h-4 w-4 flex-shrink-0" />
              <span>{patient.contactData.phone}</span>
            </a>
          )}
          {patient.contactData?.address && (
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{patient.contactData.address}</span>
            </div>
          )}
        </div>
      </div>

      {/* Assigned Exercise Sets */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-foreground">Przypisane zestawy</h4>
          <Badge variant="secondary" className="text-xs">
            {exerciseSetAssignments.length}
          </Badge>
        </div>
        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : exerciseSetAssignments.length > 0 ? (
          <div className="space-y-2">
            {exerciseSetAssignments.map((assignment) => (
              <Link
                key={assignment.id}
                href={`/patients/${patient.id}?assignment=${assignment.id}`}
                className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-surface hover:bg-surface-light hover:border-secondary/20 transition-all group"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-secondary/80 to-teal-600/80">
                  <FolderKanban className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate text-foreground group-hover:text-secondary transition-colors">
                    {assignment.exerciseSet?.name || "Nieznany zestaw"}
                  </p>
                  {assignment.assignedAt && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Przypisano {format(new Date(assignment.assignedAt), "d MMM yyyy", { locale: pl })}
                    </p>
                  )}
                </div>
                {assignment.status && (
                  <Badge
                    variant={assignment.status === "active" ? "default" : "secondary"}
                    className="text-[10px]"
                  >
                    {assignment.status === "active" ? "Aktywny" : "Nieaktywny"}
                  </Badge>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-sm text-muted-foreground">
            <FolderKanban className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Brak przypisanych zestawów</p>
          </div>
        )}
      </div>

      {/* Assignment Info */}
      {patient.assignedAt && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-foreground">Informacje o przypisaniu</h4>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 flex-shrink-0" />
            <span>
              Przypisano {format(new Date(patient.assignedAt), "d MMM yyyy", { locale: pl })}
            </span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2 pt-2">
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="default"
            onClick={onAssignSet}
            className="gap-2"
          >
            <FolderKanban className="h-4 w-4" />
            Przypisz zestaw
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onViewReport}
            className="gap-2"
          >
            <Activity className="h-4 w-4" />
            Raport aktywności
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onToggleStatus}
            className="gap-2"
          >
            <Power className="h-4 w-4" />
            {isActive ? "Dezaktywuj" : "Aktywuj"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onRemove}
            className="gap-2 text-destructive hover:text-destructive"
          >
            <UserX className="h-4 w-4" />
            Odepnij
          </Button>
        </div>
      </div>
    </div>
  );
}


