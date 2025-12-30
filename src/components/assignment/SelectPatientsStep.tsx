"use client";

import { useState } from "react";
import { Search, Users, Check, Wrench, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Patient, AssignedPatientInfo } from "./types";

interface SelectPatientsStepProps {
  patients: Patient[];
  selectedPatients: Patient[];
  onSelectPatients: (patients: Patient[]) => void;
  assignedPatients?: AssignedPatientInfo[];
  onUnassign?: (assignmentId: string, patientName: string) => void;
  loading?: boolean;
}

export function SelectPatientsStep({
  patients,
  selectedPatients,
  onSelectPatients,
  assignedPatients = [],
  onUnassign,
  loading = false,
}: SelectPatientsStepProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [patientsToUnassign, setPatientsToUnassign] = useState<Set<string>>(new Set());

  // Create a map for quick lookup of assigned patients
  const assignedPatientsMap = new Map(
    assignedPatients.map((a) => [a.patientId, a])
  );

  // Filter patients by search query (show all, including assigned)
  const filteredPatients = patients.filter(
    (patient) =>
      patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort: available first, then assigned
  const sortedPatients = [...filteredPatients].sort((a, b) => {
    const aAssigned = assignedPatientsMap.has(a.id);
    const bAssigned = assignedPatientsMap.has(b.id);
    if (aAssigned !== bAssigned) return aAssigned ? 1 : -1;
    return 0;
  });

  const availableCount = patients.filter(
    (p) => !assignedPatientsMap.has(p.id)
  ).length;

  // Filter available patients for "select all" functionality
  const availablePatients = filteredPatients.filter(
    (p) => !assignedPatientsMap.has(p.id)
  );

  const selectedIds = new Set(selectedPatients.map((p) => p.id));

  const togglePatient = (patient: Patient) => {
    const isAssigned = assignedPatientsMap.has(patient.id);
    
    if (isAssigned) {
      // Toggle unassign selection for assigned patients
      setPatientsToUnassign((prev) => {
        const next = new Set(prev);
        if (next.has(patient.id)) {
          next.delete(patient.id);
        } else {
          next.add(patient.id);
        }
        return next;
      });
    } else {
      // Normal selection for available patients
      if (selectedIds.has(patient.id)) {
        onSelectPatients(selectedPatients.filter((p) => p.id !== patient.id));
      } else {
        onSelectPatients([...selectedPatients, patient]);
      }
    }
  };

  const selectAll = () => {
    onSelectPatients(availablePatients);
  };

  const clearSelection = () => {
    onSelectPatients([]);
    setPatientsToUnassign(new Set());
  };

  const removePatient = (patientId: string) => {
    onSelectPatients(selectedPatients.filter((p) => p.id !== patientId));
  };

  const removeFromUnassign = (patientId: string) => {
    setPatientsToUnassign((prev) => {
      const next = new Set(prev);
      next.delete(patientId);
      return next;
    });
  };

  const handleUnassign = (patientId: string) => {
    const assignmentInfo = assignedPatientsMap.get(patientId);
    const patient = patients.find((p) => p.id === patientId);
    if (assignmentInfo && patient && onUnassign) {
      onUnassign(assignmentInfo.assignmentId, patient.name);
      removeFromUnassign(patientId);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      {/* Left column - Patient list */}
      <div className="flex flex-col min-h-0">
        <div className="mb-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Szukaj pacjentów..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-11"
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {availableCount} dostępnych
              {assignedPatients.length > 0 && (
                <span className="text-muted-foreground/60"> • {assignedPatients.length} przypisanych</span>
              )}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="text-xs text-primary hover:underline"
              >
                Zaznacz wszystkich
              </button>
              <span className="text-muted-foreground">·</span>
              <button
                type="button"
                onClick={clearSelection}
                className="text-xs text-muted-foreground hover:text-foreground hover:underline"
              >
                Wyczyść
              </button>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 rounded-xl border border-border">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : sortedPatients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <Users className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">
                {searchQuery
                  ? "Nie znaleziono pacjentów"
                  : "Brak pacjentów"}
              </p>
              <p className="text-xs text-muted-foreground">
                {searchQuery
                  ? "Spróbuj innej frazy"
                  : "Dodaj nowych pacjentów do listy"}
              </p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {sortedPatients.map((patient) => {
                const isAssigned = assignedPatientsMap.has(patient.id);
                const isSelectedForAssign = selectedIds.has(patient.id);
                const isSelectedForUnassign = patientsToUnassign.has(patient.id);

                return (
                  <div
                    key={patient.id}
                    className={cn(
                      "flex items-center gap-3 rounded-xl p-3 cursor-pointer transition-all",
                      isSelectedForUnassign
                        ? "bg-destructive/10 border-2 border-destructive/50"
                        : isSelectedForAssign
                        ? "bg-primary/10 border-2 border-primary/30"
                        : isAssigned
                        ? "opacity-70 hover:opacity-100 hover:bg-surface-light border-2 border-transparent"
                        : "hover:bg-surface-light border-2 border-transparent"
                    )}
                    onClick={() => togglePatient(patient)}
                  >
                    {!isAssigned ? (
                      <Checkbox
                        checked={isSelectedForAssign}
                        onCheckedChange={() => togglePatient(patient)}
                        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                    ) : (
                      <div className={cn(
                        "h-4 w-4 rounded border-2 flex items-center justify-center",
                        isSelectedForUnassign
                          ? "border-destructive bg-destructive"
                          : "border-muted-foreground/40"
                      )}>
                        {isSelectedForUnassign && <X className="h-3 w-3 text-destructive-foreground" />}
                      </div>
                    )}
                    <div className="relative">
                      <div
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold",
                          isAssigned && !isSelectedForUnassign
                            ? "bg-muted-foreground/40 text-muted-foreground grayscale"
                            : patient.isShadowUser
                            ? "bg-muted-foreground/60 text-white"
                            : "bg-gradient-to-br from-primary to-primary-dark text-primary-foreground"
                        )}
                      >
                        {patient.name[0]?.toUpperCase()}
                      </div>
                      {patient.isShadowUser && (
                        <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-muted-foreground/80 flex items-center justify-center ring-2 ring-background">
                          <Wrench className="h-2.5 w-2.5 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={cn(
                          "font-medium truncate",
                          isAssigned && !isSelectedForUnassign && "text-muted-foreground"
                        )}>
                          {patient.name}
                        </p>
                        {isAssigned && (
                          <Badge 
                            variant={isSelectedForUnassign ? "destructive" : "secondary"} 
                            className="text-[10px] shrink-0"
                          >
                            Ma ten zestaw
                          </Badge>
                        )}
                      </div>
                      {patient.email && (
                        <p className="text-xs text-muted-foreground truncate">
                          {patient.email}
                        </p>
                      )}
                    </div>
                    {isSelectedForUnassign ? (
                      <X className="h-5 w-5 text-destructive shrink-0" />
                    ) : isSelectedForAssign ? (
                      <Check className="h-5 w-5 text-primary shrink-0" />
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Right column - Selected patients */}
      <div className="flex flex-col min-h-0 rounded-xl border border-border bg-surface/50 p-4">
        <div className="mb-4">
          <h3 className="font-semibold text-lg">Wybrani pacjenci</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {selectedPatients.length === 0 && patientsToUnassign.size === 0
              ? "Wybierz pacjentów z listy po lewej"
              : selectedPatients.length > 0
              ? `${selectedPatients.length} do przypisania`
              : null}
            {patientsToUnassign.size > 0 && (
              <span className={selectedPatients.length > 0 ? "text-destructive ml-2" : "text-destructive"}>
                {selectedPatients.length > 0 && "• "}
                {patientsToUnassign.size} do odpisania
              </span>
            )}
          </p>
        </div>

        {selectedPatients.length > 0 || patientsToUnassign.size > 0 ? (
          <ScrollArea className="flex-1">
            <div className="space-y-2">
              {/* Patients to assign (green) */}
              {selectedPatients.map((patient) => (
                <div
                  key={patient.id}
                  className="flex items-center gap-3 rounded-lg p-3 bg-primary/5 border border-primary/20 group"
                >
                  <div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold shrink-0",
                      patient.isShadowUser
                        ? "bg-muted-foreground/60 text-white"
                        : "bg-gradient-to-br from-primary to-primary-dark text-primary-foreground"
                    )}
                  >
                    {patient.name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{patient.name}</p>
                    {patient.email && (
                      <p className="text-xs text-muted-foreground truncate">
                        {patient.email}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removePatient(patient.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              
              {/* Patients to unassign (red) */}
              {Array.from(patientsToUnassign).map((patientId) => {
                const patient = patients.find((p) => p.id === patientId);
                if (!patient) return null;
                
                return (
                  <div
                    key={patient.id}
                    className="flex items-center gap-3 rounded-lg p-3 bg-destructive/5 border border-destructive/20 group"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold shrink-0 bg-destructive/20 text-destructive">
                      {patient.name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{patient.name}</p>
                        <Badge variant="destructive" className="text-[10px]">
                          Odpisz
                        </Badge>
                      </div>
                      {patient.email && (
                        <p className="text-xs text-muted-foreground truncate">
                          {patient.email}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handleUnassign(patient.id)}
                      >
                        Odpisz
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => removeFromUnassign(patient.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <Users className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              Brak wybranych pacjentów
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Kliknij na pacjenta, aby go dodać do listy
            </p>
          </div>
        )}

        {(selectedPatients.length > 0 || patientsToUnassign.size > 0) && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Łącznie:</span>
              <div className="flex items-center gap-2">
                {selectedPatients.length > 0 && (
                  <Badge variant="default" className="font-semibold">
                    +{selectedPatients.length}
                  </Badge>
                )}
                {patientsToUnassign.size > 0 && (
                  <Badge variant="destructive" className="font-semibold">
                    -{patientsToUnassign.size}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}







