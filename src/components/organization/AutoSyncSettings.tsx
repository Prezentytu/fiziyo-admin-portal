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
import { cn } from "@/lib/utils";

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
    <Card className="rounded-xl border border-border/50 bg-card/30">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10">
            <Github className="h-5 w-5 text-secondary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg font-semibold tracking-tight">Auto-sync ćwiczeń</CardTitle>
              <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider bg-secondary/10 text-secondary border-secondary/20">
                Beta
              </Badge>
            </div>
            <CardDescription className="text-sm text-muted-foreground">
              Automatyczny import nowych ćwiczeń z repozytorium
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-xl border border-border/50 bg-background/50 p-4 hover:border-primary/30 transition-all">
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
              isEnabled ? "bg-primary/10" : "bg-muted"
            )}>
              <RefreshCw className={cn("h-5 w-5 transition-all", isEnabled ? "text-primary animate-spin-slow" : "text-muted-foreground")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="auto-sync" className="text-sm font-semibold cursor-pointer">
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
        <div className="flex items-start gap-3 rounded-xl border border-info/30 bg-info/5 p-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-info/10">
            <Info className="h-4 w-4 text-info" />
          </div>
          <div className="text-sm text-muted-foreground space-y-1">
            <p className="font-bold text-foreground text-xs uppercase tracking-wider">
              Jak to działa?
            </p>
            <ul className="space-y-1.5 text-sm">
              <li className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-info/40" />
                Nowe ćwiczenia są automatycznie dodawane do Twojej biblioteki
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-info/40" />
                Tagi są generowane automatycznie na podstawie kategorii
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-info/40" />
                Zdjęcia i opisy są pobierane bezpośrednio z bazy ćwiczeń
              </li>
            </ul>
          </div>
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-2 pt-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          <div className={cn("h-2 w-2 rounded-full", isEnabled ? "bg-success animate-pulse" : "bg-muted")} />
          <span>
            Status: {isEnabled ? "Aktywna synchronizacja" : "Wyłączona"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}









