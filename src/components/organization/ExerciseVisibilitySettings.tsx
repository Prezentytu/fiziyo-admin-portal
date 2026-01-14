"use client";

import { useState, useEffect } from "react";
import { useMutation } from "@apollo/client/react";
import { Dumbbell, Loader2, Lock, Save, Users } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { UPDATE_EXERCISE_VISIBILITY_SETTINGS_MUTATION } from "@/graphql/mutations/organizations.mutations";
import { GET_ORGANIZATION_BY_ID_QUERY } from "@/graphql/queries/organizations.queries";
import { cn } from "@/lib/utils";

interface ExerciseVisibilitySettingsProps {
  organizationId: string;
  allowPersonalExercises?: boolean;
  sharedExercisesByDefault?: boolean;
  canEdit?: boolean;
  onSuccess?: () => void;
}

export function ExerciseVisibilitySettings({
  organizationId,
  allowPersonalExercises: initialAllowPersonal = true,
  sharedExercisesByDefault: initialSharedByDefault = true,
  canEdit = false,
  onSuccess,
}: ExerciseVisibilitySettingsProps) {
  const [allowPersonal, setAllowPersonal] = useState(initialAllowPersonal);
  const [sharedByDefault, setSharedByDefault] = useState(initialSharedByDefault);
  const [hasChanges, setHasChanges] = useState(false);

  // Track changes
  useEffect(() => {
    const changed =
      allowPersonal !== initialAllowPersonal ||
      sharedByDefault !== initialSharedByDefault;
    setHasChanges(changed);
  }, [allowPersonal, sharedByDefault, initialAllowPersonal, initialSharedByDefault]);

  // Reset on prop changes
  useEffect(() => {
    setAllowPersonal(initialAllowPersonal);
    setSharedByDefault(initialSharedByDefault);
  }, [initialAllowPersonal, initialSharedByDefault]);

  const [updateSettings, { loading }] = useMutation(
    UPDATE_EXERCISE_VISIBILITY_SETTINGS_MUTATION,
    {
      refetchQueries: [
        { query: GET_ORGANIZATION_BY_ID_QUERY, variables: { id: organizationId } },
      ],
    }
  );

  const handleSave = async () => {
    try {
      await updateSettings({
        variables: {
          organizationId,
          allowPersonalExercises: allowPersonal,
          sharedExercisesByDefault: sharedByDefault,
        },
      });
      toast.success("Ustawienia zostały zapisane");
      setHasChanges(false);
      onSuccess?.();
    } catch (error) {
      console.error("Błąd podczas zapisywania:", error);
      toast.error("Nie udało się zapisać ustawień");
    }
  };

  const handleReset = () => {
    setAllowPersonal(initialAllowPersonal);
    setSharedByDefault(initialSharedByDefault);
  };

  return (
    <Card className="rounded-xl border border-border/50 bg-card/30">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Dumbbell className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg font-semibold tracking-tight">Ustawienia ćwiczeń</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Kontroluj widoczność i udostępnianie ćwiczeń w organizacji
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Allow personal exercises */}
        <div
          className={cn(
            "flex items-start gap-4 p-4 rounded-xl border transition-all",
            allowPersonal
              ? "border-primary/30 bg-primary/5 ring-1 ring-primary/10"
              : "border-border/50 bg-background/50 hover:bg-background hover:border-primary/30"
          )}
        >
          <Checkbox
            id="allowPersonal"
            checked={allowPersonal}
            onCheckedChange={(checked) =>
              canEdit && setAllowPersonal(checked === true)
            }
            disabled={!canEdit}
            className="mt-1 rounded-md"
          />
          <div className="flex-1 space-y-1">
            <Label
              htmlFor="allowPersonal"
              className="text-base font-semibold cursor-pointer flex items-center gap-2"
            >
              <Lock className="h-4 w-4 text-muted-foreground" />
              Pozwól na tworzenie osobistych ćwiczeń
            </Label>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Członkowie organizacji mogą tworzyć ćwiczenia widoczne tylko dla
              siebie. Wyłączenie tej opcji wymusi udostępnianie wszystkich
              ćwiczeń całej organizacji.
            </p>
          </div>
        </div>

        {/* Shared by default */}
        <div
          className={cn(
            "flex items-start gap-4 p-4 rounded-xl border transition-all",
            sharedByDefault
              ? "border-secondary/30 bg-secondary/5 ring-1 ring-secondary/10"
              : "border-border/50 bg-background/50 hover:bg-background hover:border-secondary/30"
          )}
        >
          <Checkbox
            id="sharedByDefault"
            checked={sharedByDefault}
            onCheckedChange={(checked) =>
              canEdit && setSharedByDefault(checked === true)
            }
            disabled={!canEdit}
            className="mt-1 rounded-md"
          />
          <div className="flex-1 space-y-1">
            <Label
              htmlFor="sharedByDefault"
              className="text-base font-semibold cursor-pointer flex items-center gap-2"
            >
              <Users className="h-4 w-4 text-muted-foreground" />
              Domyślnie udostępniaj ćwiczenia organizacji
            </Label>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Nowo tworzone ćwiczenia będą automatycznie udostępniane wszystkim
              członkom organizacji. Użytkownicy nadal będą mogli zmienić zakres
              widoczności ręcznie.
            </p>
          </div>
        </div>

        {/* Actions - Sticky Footer style if changes */}
        {canEdit && hasChanges && (
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/50">
            <Button variant="outline" onClick={handleReset} disabled={loading} className="rounded-xl border-border/50 h-10">
              Anuluj
            </Button>
            <Button onClick={handleSave} disabled={loading} className="gap-2 bg-primary text-white font-bold h-10 px-6 rounded-xl shadow-lg shadow-primary/20 transition-all">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Zapisz zmiany
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
















