"use client";

import { useState } from "react";
import { useMutation } from "@apollo/client/react";
import { RefreshCw, Info, Loader2, Github } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SET_AUTO_SYNC_EXERCISES_MUTATION } from "@/graphql/mutations/organizations.mutations";
import { GET_ORGANIZATION_BY_ID_QUERY } from "@/graphql/queries/organizations.queries";

interface AutoSyncSettingsProps {
  organizationId: string;
  autoSyncEnabled?: boolean;
  canEdit?: boolean;
  onSuccess?: () => void;
}

export function AutoSyncSettings({
  organizationId,
  autoSyncEnabled = false,
  canEdit = false,
  onSuccess,
}: AutoSyncSettingsProps) {
  const [isEnabled, setIsEnabled] = useState(autoSyncEnabled);

  const [setAutoSync, { loading }] = useMutation(SET_AUTO_SYNC_EXERCISES_MUTATION, {
    refetchQueries: [
      { query: GET_ORGANIZATION_BY_ID_QUERY, variables: { id: organizationId } },
    ],
  });

  const handleToggle = async (checked: boolean) => {
    if (!canEdit) return;

    try {
      await setAutoSync({
        variables: {
          organizationId,
          enabled: checked,
        },
      });
      setIsEnabled(checked);
      toast.success(
        checked
          ? "Automatyczna synchronizacja została włączona"
          : "Automatyczna synchronizacja została wyłączona"
      );
      onSuccess?.();
    } catch (error) {
      console.error("Błąd podczas zmiany ustawień:", error);
      toast.error("Nie udało się zmienić ustawień");
    }
  };

  return (
    <Card className="border-border/60">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10">
            <Github className="h-5 w-5 text-secondary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">Auto-sync ćwiczeń</CardTitle>
              <Badge variant="outline" className="text-xs">
                Beta
              </Badge>
            </div>
            <CardDescription>
              Automatyczny import nowych ćwiczeń z repozytorium
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border border-border/60 bg-surface/50 p-4">
          <div className="flex items-center gap-3">
            <RefreshCw className={`h-5 w-5 ${isEnabled ? "text-primary" : "text-muted-foreground"}`} />
            <div className="space-y-1">
              <Label htmlFor="auto-sync" className="text-sm font-medium">
                Automatyczna synchronizacja
              </Label>
              <p className="text-xs text-muted-foreground">
                Nowe ćwiczenia będą automatycznie importowane po każdej aktualizacji bazy
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            <Switch
              id="auto-sync"
              checked={isEnabled}
              onCheckedChange={handleToggle}
              disabled={!canEdit || loading}
            />
          </div>
        </div>

        {/* Info box */}
        <div className="flex items-start gap-3 rounded-lg border border-info/30 bg-info/5 p-4">
          <Info className="h-5 w-5 text-info shrink-0 mt-0.5" />
          <div className="text-sm text-muted-foreground space-y-1">
            <p>
              <strong className="text-foreground">Jak to działa?</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Nowe ćwiczenia są automatycznie dodawane do Twojej biblioteki</li>
              <li>Tagi są generowane automatycznie na podstawie kategorii</li>
              <li>Zdjęcia i opisy są pobierane bezpośrednio z bazy ćwiczeń</li>
              <li>Możesz w każdej chwili wyłączyć tę funkcję</li>
            </ul>
          </div>
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className={`h-2 w-2 rounded-full ${isEnabled ? "bg-success animate-pulse" : "bg-muted"}`} />
          <span>
            Status: {isEnabled ? "Aktywna synchronizacja" : "Wyłączona"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}








