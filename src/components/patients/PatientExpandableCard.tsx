"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Mail, Phone, FolderKanban, Activity } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ColorBadge } from "@/components/shared/ColorBadge";
import { PatientExpandedContent } from "./PatientExpandedContent";
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
  assignedAt?: string;
}

interface PatientExpandableCardProps {
  patient: Patient;
  onAssignSet: (patient: Patient) => void;
  onViewReport: (patient: Patient) => void;
  onToggleStatus: (patient: Patient) => void;
  onRemove: (patient: Patient) => void;
  organizationId: string;
}

export function PatientExpandableCard({
  patient,
  onAssignSet,
  onViewReport,
  onToggleStatus,
  onRemove,
  organizationId,
}: PatientExpandableCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

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

  const isActive = patient.assignmentStatus !== "inactive";

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  const handleAction = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  return (
    <div
      className={cn(
        "group rounded-xl border border-border/60 bg-surface transition-all",
        "hover:bg-surface-light hover:border-border",
        isExpanded && "bg-surface-light border-border"
      )}
    >
      {/* Collapsed State */}
      <div
        className="flex items-center gap-4 p-4 cursor-pointer"
        onClick={handleToggle}
      >
        {/* Avatar */}
        <Avatar className="h-12 w-12 shrink-0 ring-2 ring-border/30 group-hover:ring-primary/20 transition-all">
          <AvatarImage src={patient.image} alt={displayName} />
          <AvatarFallback className="bg-gradient-to-br from-info to-blue-600 text-white font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-foreground truncate">{displayName}</h3>
            {patient.isShadowUser && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                Tymczasowy
              </Badge>
            )}
            <Badge
              variant={isActive ? "default" : "secondary"}
              className="text-[10px] px-1.5 py-0"
            >
              {isActive ? "Aktywny" : "Nieaktywny"}
            </Badge>
            {patient.contextLabel && (
              <ColorBadge color={patient.contextColor || "#888888"} size="sm">
                {patient.contextLabel}
              </ColorBadge>
            )}
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {patient.email && (
              <span className="flex items-center gap-1 truncate">
                <Mail className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{patient.email}</span>
              </span>
            )}
            {patient.contactData?.phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3 flex-shrink-0" />
                {patient.contactData.phone}
              </span>
            )}
          </div>
        </div>

        {/* Hover Actions */}
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => handleAction(e, () => onAssignSet(patient))}
            title="Przypisz zestaw"
          >
            <FolderKanban className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => handleAction(e, () => onViewReport(patient))}
            title="Raport aktywności"
          >
            <Activity className="h-4 w-4" />
          </Button>
        </div>

        {/* Expand Icon */}
        <button
          className="shrink-0 p-1 rounded-lg hover:bg-surface transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            handleToggle();
          }}
        >
          {isExpanded ? (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          )}
        </button>
      </div>

      {/* Expanded State */}
      {isExpanded && (
        <div className="px-4 pb-4">
          <PatientExpandedContent
            patient={patient}
            onAssignSet={() => onAssignSet(patient)}
            onViewReport={() => onViewReport(patient)}
            onToggleStatus={() => onToggleStatus(patient)}
            onRemove={() => onRemove(patient)}
            organizationId={organizationId}
          />
        </div>
      )}
    </div>
  );
}

