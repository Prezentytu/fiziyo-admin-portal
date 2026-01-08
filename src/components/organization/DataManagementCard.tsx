"use client";

import { useState } from "react";
import {
  Database,
  Download,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Package,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDataManagement } from "@/hooks/useDataManagement";

interface DataManagementCardProps {
  organizationId: string;
  canEdit?: boolean;
  onRefresh?: () => void;
}

/**
 * Karta zarządzania danymi organizacji - import przykładowych zestawów i usuwanie danych.
 * Wyświetlana w zakładce Ustawienia organizacji.
 */
export function DataManagementCard({
  organizationId,
  canEdit = false,
  onRefresh,
}: DataManagementCardProps) {
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const [clearPassword, setClearPassword] = useState("");

  const {
    hasImportedExamples,
    isImporting,
    isClearing,
    importExampleSets,
    clearAllData,
  } = useDataManagement({
    organizationId,
    onImportSuccess: onRefresh,
    onClearSuccess: () => {
      setIsClearDialogOpen(false);
      setClearPassword("");
      onRefresh?.();
    },
  });

  const handleClearData = async () => {
    const success = await clearAllData(clearPassword);
    if (success) {
      setIsClearDialogOpen(false);
      setClearPassword("");
    }
  };

  const handleCloseClearDialog = () => {
    setIsClearDialogOpen(false);
    setClearPassword("");
  };

  if (!canEdit) {
    return null;
  }

  return (
    <>
      {/* Import Example Sets Card */}
      <Card className="border-border/60">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Przykładowe dane</CardTitle>
              <CardDescription>
                Zaimportuj gotowe zestawy ćwiczeń do Twojej biblioteki
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Importuj przykładowe zestawy ćwiczeń dla różnych schorzeń i
            przypadków. Obejmuje gotowe programy rehabilitacyjne z ćwiczeniami,
            kategoriami i tagami.
          </p>

          <div className="flex items-center gap-4">
            <Button
              onClick={importExampleSets}
              disabled={isImporting || hasImportedExamples}
              className="gap-2"
            >
              {isImporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : hasImportedExamples ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {isImporting
                ? "Importowanie..."
                : hasImportedExamples
                  ? "Zaimportowano"
                  : "Importuj przykładowe zestawy"}
            </Button>

            {hasImportedExamples && (
              <span className="text-sm text-muted-foreground">
                Przykładowe dane zostały już zaimportowane
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone Card */}
      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <CardTitle className="text-lg text-destructive">
                Strefa niebezpieczna
              </CardTitle>
              <CardDescription className="text-destructive/80">
                Nieodwracalne operacje na danych organizacji
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-destructive/20 bg-background p-4">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
                <Database className="h-5 w-5 text-destructive" />
              </div>
              <div className="flex-1 space-y-2">
                <h4 className="font-medium text-foreground">
                  Usuń wszystkie dane
                </h4>
                <p className="text-sm text-muted-foreground">
                  Ta operacja nieodwracalnie usunie WSZYSTKIE ćwiczenia,
                  zestawy, tagi i kategorie z Twojej organizacji. Przypisania
                  pacjentów również zostaną usunięte.
                </p>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setIsClearDialogOpen(true)}
                  className="mt-2 gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Usuń wszystkie dane
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Clear Data Confirmation Dialog */}
      <Dialog open={isClearDialogOpen} onOpenChange={handleCloseClearDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Potwierdź usunięcie wszystkich danych
            </DialogTitle>
            <DialogDescription>
              Ta operacja jest <strong>nieodwracalna</strong>. Wszystkie
              ćwiczenia, zestawy, tagi i kategorie zostaną trwale usunięte.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <strong>UWAGA:</strong> Ta operacja usunie wszystkie dane
              związane z ćwiczeniami w Twojej organizacji. Upewnij się, że
              masz kopię zapasową, jeśli jest potrzebna.
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">
                Wprowadź hasło aby potwierdzić
              </Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Hasło potwierdzające"
                value={clearPassword}
                onChange={(e) => setClearPassword(e.target.value)}
                autoComplete="off"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleCloseClearDialog}>
              Anuluj
            </Button>
            <Button
              variant="destructive"
              onClick={handleClearData}
              disabled={isClearing || !clearPassword}
              className="gap-2"
            >
              {isClearing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              {isClearing ? "Usuwanie..." : "Usuń wszystko"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}










