"use client";

import { useState } from "react";
import { ChevronDown, Settings } from "lucide-react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SettingsTab } from "./SettingsTab";
import { cn } from "@/lib/utils";

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

interface SettingsSectionProps {
  organization: Organization;
  currentUserRole?: string;
  isLoading?: boolean;
  onRefresh?: () => void;
  defaultOpen?: boolean;
}

export function SettingsSection({
  organization,
  currentUserRole,
  isLoading = false,
  onRefresh,
  defaultOpen = false,
}: SettingsSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full">
        <div
          className={cn(
            "flex items-center justify-between p-4 rounded-xl border transition-all duration-200",
            isOpen
              ? "border-border bg-surface"
              : "border-border/40 bg-surface/50 hover:bg-surface hover:border-border"
          )}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
              <Settings className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-semibold text-foreground">Ustawienia</h3>
              <p className="text-sm text-muted-foreground">
                Konfiguracja organizacji i subskrypcja
              </p>
            </div>
          </div>
          <ChevronDown
            className={cn(
              "h-5 w-5 text-muted-foreground transition-transform duration-200",
              isOpen && "rotate-180"
            )}
          />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="pt-4">
          <SettingsTab
            organization={organization}
            currentUserRole={currentUserRole}
            isLoading={isLoading}
            onRefresh={onRefresh}
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
