"use client";

import { useState } from "react";
import { Search, Users, Check, Wrench, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Patient } from "./types";

interface SelectPatientsStepProps {
  patients: Patient[];
  selectedPatients: Patient[];
  onSelectPatients: (patients: Patient[]) => void;
  assignedPatientIds?: string[];
  loading?: boolean;
}

export function SelectPatientsStep({
  patients,
  selectedPatients,
  onSelectPatients,
  assignedPatientIds = [],
  loading = false,
}: SelectPatientsStepProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter out already assigned patients
  const availablePatients = patients.filter(
    (p) => !assignedPatientIds.includes(p.id)
  );

  const filteredPatients = availablePatients.filter(
    (patient) =>
      patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedIds = new Set(selectedPatients.map((p) => p.id));

  const togglePatient = (patient: Patient) => {
    if (selectedIds.has(patient.id)) {
      onSelectPatients(selectedPatients.filter((p) => p.id !== patient.id));
    } else {
      onSelectPatients([...selectedPatients, patient]);
    }
  };

  const selectAll = () => {
    onSelectPatients(filteredPatients);
  };

  const clearSelection = () => {
    onSelectPatients([]);
  };

  const removePatient = (patientId: string) => {
    onSelectPatients(selectedPatients.filter((p) => p.id !== patientId));
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
              {availablePatients.length} dostępnych pacjentów
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
          ) : filteredPatients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <Users className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">
                {searchQuery
                  ? "Nie znaleziono pacjentów"
                  : availablePatients.length === 0
                  ? "Wszyscy pacjenci mają już ten zestaw"
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
              {filteredPatients.map((patient) => {
                const isSelected = selectedIds.has(patient.id);

                return (
                  <div
                    key={patient.id}
                    className={cn(
                      "flex items-center gap-3 rounded-xl p-3 cursor-pointer transition-all",
                      isSelected
                        ? "bg-primary/10 border-2 border-primary/30"
                        : "hover:bg-surface-light border-2 border-transparent"
                    )}
                    onClick={() => togglePatient(patient)}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => togglePatient(patient)}
                      className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <div className="relative">
                      <div
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold",
                          patient.isShadowUser
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
                      <p className="font-medium truncate">{patient.name}</p>
                      {patient.email && (
                        <p className="text-xs text-muted-foreground truncate">
                          {patient.email}
                        </p>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="h-5 w-5 text-primary shrink-0" />
                    )}
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
            {selectedPatients.length === 0
              ? "Wybierz pacjentów z listy po lewej"
              : `${selectedPatients.length} pacjent${selectedPatients.length === 1 ? "" : selectedPatients.length < 5 ? "ów" : "ów"}`}
          </p>
        </div>

        {selectedPatients.length > 0 ? (
          <ScrollArea className="flex-1">
            <div className="space-y-2">
              {selectedPatients.map((patient) => (
                <div
                  key={patient.id}
                  className="flex items-center gap-3 rounded-lg p-3 bg-surface-light/50 group"
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

        {selectedPatients.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Łącznie:</span>
              <Badge variant="default" className="font-semibold">
                {selectedPatients.length} pacjent
                {selectedPatients.length === 1 ? "" : selectedPatients.length < 5 ? "ów" : "ów"}
              </Badge>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

