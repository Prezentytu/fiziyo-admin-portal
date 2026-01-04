"use client";

import { useState, useEffect } from "react";
import { useMutation } from "@apollo/client/react";
import { Dumbbell, Globe, Loader2, Lock, Save, Users } from "lucide-react";
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
    <Card className="border-border/60">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Dumbbell className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Ustawienia ćwiczeń</CardTitle>
            <CardDescription>
              Kontroluj widoczność i udostępnianie ćwiczeń w organizacji
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Allow personal exercises */}
        <div
          className={cn(
            "flex items-start gap-4 p-4 rounded-lg border transition-colors",
            allowPersonal
              ? "border-primary/30 bg-primary/5"
              : "border-border/60 bg-surface"
          )}
        >
          <Checkbox
            id="allowPersonal"
            checked={allowPersonal}
            onCheckedChange={(checked) =>
              canEdit && setAllowPersonal(checked === true)
            }
            disabled={!canEdit}
            className="mt-1"
          />
          <div className="flex-1 space-y-1">
            <Label
              htmlFor="allowPersonal"
              className="text-base font-medium cursor-pointer flex items-center gap-2"
            >
              <Lock className="h-4 w-4 text-muted-foreground" />
              Pozwól na tworzenie osobistych ćwiczeń
            </Label>
            <p className="text-sm text-muted-foreground">
              Członkowie organizacji mogą tworzyć ćwiczenia widoczne tylko dla
              siebie. Wyłączenie tej opcji wymusi udostępnianie wszystkich
              ćwiczeń całej organizacji.
            </p>
          </div>
        </div>

        {/* Shared by default */}
        <div
          className={cn(
            "flex items-start gap-4 p-4 rounded-lg border transition-colors",
            sharedByDefault
              ? "border-secondary/30 bg-secondary/5"
              : "border-border/60 bg-surface"
          )}
        >
          <Checkbox
            id="sharedByDefault"
            checked={sharedByDefault}
            onCheckedChange={(checked) =>
              canEdit && setSharedByDefault(checked === true)
            }
            disabled={!canEdit}
            className="mt-1"
          />
          <div className="flex-1 space-y-1">
            <Label
              htmlFor="sharedByDefault"
              className="text-base font-medium cursor-pointer flex items-center gap-2"
            >
              <Users className="h-4 w-4 text-muted-foreground" />
              Domyślnie udostępniaj ćwiczenia organizacji
            </Label>
            <p className="text-sm text-muted-foreground">
              Nowo tworzone ćwiczenia będą automatycznie udostępniane wszystkim
              członkom organizacji. Użytkownicy nadal będą mogli zmienić zakres
              widoczności ręcznie.
            </p>
          </div>
        </div>

        {/* Actions */}
        {canEdit && hasChanges && (
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-border/60">
            <Button variant="outline" onClick={handleReset} disabled={loading}>
              Anuluj zmiany
            </Button>
            <Button onClick={handleSave} disabled={loading} className="gap-2">
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













