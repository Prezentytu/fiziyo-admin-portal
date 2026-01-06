"use client";

import { useState } from "react";
import { useMutation } from "@apollo/client/react";
import {
  Building2,
  FileText,
  Image,
  Loader2,
  Pencil,
  Save,
  Trash2,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { ExerciseVisibilitySettings } from "./ExerciseVisibilitySettings";
import { AutoSyncSettings } from "./AutoSyncSettings";
import { DataManagementCard } from "./DataManagementCard";
import {
  UPDATE_ORGANIZATION_NAME_MUTATION,
  UPDATE_ORGANIZATION_LOGO_MUTATION,
  REMOVE_ORGANIZATION_LOGO_MUTATION,
} from "@/graphql/mutations/organizations.mutations";
import { GET_ORGANIZATION_BY_ID_QUERY } from "@/graphql/queries/organizations.queries";

interface Organization {
  id: string;
  name: string;
  description?: string;
  logoUrl?: string;
  isActive?: boolean;
  subscriptionPlan?: string;
  subscriptionExpiresAt?: string;
  allowPersonalExercises?: boolean;
  sharedExercisesByDefault?: boolean;
  autoSyncExampleExercises?: boolean;
}

interface SettingsTabProps {
  organization: Organization;
  currentUserRole?: string;
  isLoading?: boolean;
  onRefresh?: () => void;
}

// Collapsible section component - Linear/Notion style
interface SettingsSectionProps {
  title: string;
  description?: string;
  icon: React.ElementType;
  gradient: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function SettingsSection({
  title,
  description,
  icon: Icon,
  gradient,
  defaultOpen = true,
  children
}: SettingsSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="space-y-4">
        <CollapsibleTrigger asChild>
          <button className="w-full group">
            <div className="flex items-center justify-between p-4 rounded-xl bg-surface-light/30 hover:bg-surface-light/50 border border-border/40 transition-colors cursor-pointer">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg",
                  gradient
                )}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-foreground">{title}</h3>
                  {description && (
                    <p className="text-sm text-muted-foreground">{description}</p>
                  )}
                </div>
              </div>
              <ChevronDown className={cn(
                "h-5 w-5 text-muted-foreground transition-transform duration-200",
                isOpen && "rotate-180"
              )} />
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4">
          {children}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export function SettingsTab({
  organization,
  currentUserRole,
  isLoading = false,
  onRefresh,
}: SettingsTabProps) {
  const [isEditingBasic, setIsEditingBasic] = useState(false);
  const [editedName, setEditedName] = useState(organization.name);
  const [editedDescription, setEditedDescription] = useState(
    organization.description || ""
  );

  const canEdit = currentUserRole === "owner" || currentUserRole === "admin";

  const [updateName, { loading: updatingName }] = useMutation(
    UPDATE_ORGANIZATION_NAME_MUTATION,
    {
      refetchQueries: [
        { query: GET_ORGANIZATION_BY_ID_QUERY, variables: { id: organization.id } },
      ],
    }
  );

  const [updateLogo, { loading: updatingLogo }] = useMutation(
    UPDATE_ORGANIZATION_LOGO_MUTATION,
    {
      refetchQueries: [
        { query: GET_ORGANIZATION_BY_ID_QUERY, variables: { id: organization.id } },
      ],
    }
  );

  const [removeLogo, { loading: removingLogo }] = useMutation(
    REMOVE_ORGANIZATION_LOGO_MUTATION,
    {
      refetchQueries: [
        { query: GET_ORGANIZATION_BY_ID_QUERY, variables: { id: organization.id } },
      ],
    }
  );

  const isUpdating = updatingName || updatingLogo || removingLogo;

  const handleSaveBasicInfo = async () => {
    if (!editedName.trim()) {
      toast.error("Nazwa organizacji jest wymagana");
      return;
    }

    try {
      await updateName({
        variables: {
          organizationId: organization.id,
          name: editedName.trim(),
        },
      });
      toast.success("Informacje zostały zaktualizowane");
      setIsEditingBasic(false);
      onRefresh?.();
    } catch (error) {
      console.error("Błąd podczas aktualizacji:", error);
      toast.error("Nie udało się zaktualizować informacji");
    }
  };

  const handleCancelEdit = () => {
    setEditedName(organization.name);
    setEditedDescription(organization.description || "");
    setIsEditingBasic(false);
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Proszę wybrać plik obrazu");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Plik jest zbyt duży. Maksymalny rozmiar to 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      try {
        await updateLogo({
          variables: { organizationId: organization.id, logoUrl: dataUrl },
        });
        toast.success("Logo zostało zaktualizowane");
        onRefresh?.();
      } catch (error) {
        console.error("Błąd podczas aktualizacji logo:", error);
        toast.error("Nie udało się zaktualizować logo");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = async () => {
    try {
      await removeLogo({
        variables: { organizationId: organization.id },
      });
      toast.success("Logo zostało usunięte");
      onRefresh?.();
    } catch (error) {
      console.error("Błąd podczas usuwania logo:", error);
      toast.error("Nie udało się usunąć logo");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2].map((i) => (
          <Card key={i} className="border-border/60">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-64" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Section 1: Organization Profile */}
      <SettingsSection
        title="Profil organizacji"
        description="Nazwa, opis i logo Twojej organizacji"
        icon={Building2}
        gradient="from-primary to-emerald-600"
        defaultOpen={true}
      >
        <Card className="border-border/60">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Informacje podstawowe</CardTitle>
                  <CardDescription>
                    Nazwa, opis i logo organizacji
                  </CardDescription>
                </div>
              </div>
              {canEdit && !isEditingBasic && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditingBasic(true)}
                  className="gap-2"
                >
                  <Pencil className="h-4 w-4" />
                  Edytuj
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Logo section */}
            <div className="flex items-start gap-6">
              <Avatar className="h-20 w-20 border-2 border-surface-light">
                <AvatarImage src={organization.logoUrl} alt={organization.name} />
                <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary-dark/80 text-primary-foreground text-2xl font-bold">
                  {organization.name?.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {canEdit && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Label
                      htmlFor="logo-upload"
                      className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-surface hover:bg-surface-light transition-colors text-sm font-medium"
                    >
                      {updatingLogo ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Image className="h-4 w-4" />
                      )}
                      {organization.logoUrl ? "Zmień logo" : "Dodaj logo"}
                    </Label>
                    <input
                      id="logo-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoUpload}
                      disabled={updatingLogo}
                    />
                    {organization.logoUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRemoveLogo}
                        disabled={removingLogo}
                        className="gap-2 text-destructive hover:text-destructive"
                      >
                        {removingLogo ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                        Usuń
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Zalecany rozmiar: 200x200px. Maksymalnie 2MB.
                  </p>
                </div>
              )}
            </div>

            {/* Name and description */}
            {isEditingBasic ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="org-name">Nazwa organizacji *</Label>
                  <Input
                    id="org-name"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="max-w-md"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="org-description">Opis</Label>
                  <Textarea
                    id="org-description"
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    placeholder="Krótki opis organizacji..."
                    className="max-w-md resize-none"
                    rows={3}
                  />
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    onClick={handleSaveBasicInfo}
                    disabled={isUpdating}
                    className="gap-2"
                  >
                    {updatingName ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Zapisz
                  </Button>
                  <Button variant="outline" onClick={handleCancelEdit}>
                    Anuluj
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Nazwa</Label>
                  <p className="font-medium">{organization.name}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Opis</Label>
                  <p className="text-muted-foreground">
                    {organization.description || "Brak opisu"}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Exercise visibility settings */}
        <ExerciseVisibilitySettings
          organizationId={organization.id}
          allowPersonalExercises={organization.allowPersonalExercises}
          sharedExercisesByDefault={organization.sharedExercisesByDefault}
          canEdit={canEdit}
          onSuccess={onRefresh}
        />

        {/* Auto-sync settings */}
        <AutoSyncSettings
          organizationId={organization.id}
          autoSyncEnabled={organization.autoSyncExampleExercises}
          canEdit={canEdit}
          onSuccess={onRefresh}
        />
      </SettingsSection>

      {/* Section 2: Data Management */}
      <SettingsSection
        title="Zarządzanie danymi"
        description="Import, eksport i usuwanie danych"
        icon={FileText}
        gradient="from-amber-500 to-orange-600"
        defaultOpen={false}
      >
        <DataManagementCard
          organizationId={organization.id}
          canEdit={canEdit}
          onRefresh={onRefresh}
        />
      </SettingsSection>
    </div>
  );
}
