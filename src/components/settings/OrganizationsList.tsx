"use client";

import { Building2, Shield, ShieldCheck, User, Star, UserPlus, ArrowRight, Check, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useOrganization } from "@/contexts/OrganizationContext";
import { cn } from "@/lib/utils";

export interface UserOrganization {
  organizationId: string;
  organizationName?: string;
  logoUrl?: string;
  role: string;
  joinedAt?: string;
}

interface OrganizationsListProps {
  organizations: UserOrganization[];
  defaultOrganizationId?: string;
}

const roleLabels: Record<string, string> = {
  OWNER: "Właściciel",
  ADMIN: "Administrator",
  THERAPIST: "Fizjoterapeuta",
  MEMBER: "Członek",
  STAFF: "Personel",
};

const roleIcons: Record<string, React.ReactNode> = {
  OWNER: <ShieldCheck className="h-3 w-3" />,
  ADMIN: <Shield className="h-3 w-3" />,
  THERAPIST: <User className="h-3 w-3" />,
  MEMBER: <User className="h-3 w-3" />,
  STAFF: <User className="h-3 w-3" />,
};

export function OrganizationsList({
  organizations,
  defaultOrganizationId,
}: OrganizationsListProps) {
  const { currentOrganization, switchOrganization, isSwitching } = useOrganization();

  if (organizations.length === 0) {
    return (
      <div className="space-y-4">
        {/* Hero Action - Join Organization */}
        <button
          className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-primary-dark p-5 text-left transition-all duration-300 hover:shadow-xl hover:shadow-primary/20 hover:scale-[1.01] cursor-pointer"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-500" />
          
          <div className="relative flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm shrink-0 group-hover:scale-110 transition-transform duration-300">
              <UserPlus className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-white">Dołącz do organizacji</h3>
              <p className="text-sm text-white/80">Poproś o zaproszenie od właściciela gabinetu</p>
            </div>
            <ArrowRight className="h-5 w-5 text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all duration-300 shrink-0" />
          </div>
        </button>

        <Card className="border-border/60">
          <CardContent className="py-8 text-center">
            <div className="mx-auto h-10 w-10 rounded-full bg-surface-light flex items-center justify-center mb-3">
              <Building2 className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Nie należysz jeszcze do żadnej organizacji
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Hero Action + Stats Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-12">
        {/* Hero Action - Join Organization */}
        <button
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-primary-dark p-5 text-left transition-all duration-300 hover:shadow-xl hover:shadow-primary/20 hover:scale-[1.01] cursor-pointer lg:col-span-8"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-500" />
          
          <div className="relative flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm shrink-0 group-hover:scale-110 transition-transform duration-300">
              <UserPlus className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-white">Dołącz do organizacji</h3>
              <p className="text-sm text-white/80">Poproś o zaproszenie od właściciela gabinetu</p>
            </div>
            <ArrowRight className="h-5 w-5 text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all duration-300 shrink-0" />
          </div>
        </button>

        {/* Stat Card */}
        <Card className="border-border/60 lg:col-span-4">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{organizations.length}</p>
              <p className="text-xs text-muted-foreground">
                {organizations.length === 1 ? "Organizacja" : "Organizacje"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Organizations List - Compact with Switch Action */}
      <Card className="border-border/60">
        <CardContent className="p-3">
          <div className="space-y-2">
            {organizations.map((org) => {
              const isDefault = org.organizationId === defaultOrganizationId;
              const isActive = org.organizationId === currentOrganization?.organizationId;
              const roleKey = org.role?.toUpperCase() || "MEMBER";

              return (
                <div
                  key={org.organizationId}
                  className={cn(
                    "flex items-center justify-between rounded-lg border bg-surface p-3 transition-all duration-200",
                    isActive 
                      ? "border-primary/50 bg-primary/5" 
                      : "border-border/60 hover:bg-surface-light hover:border-border"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {/* Logo/Avatar */}
                    {org.logoUrl ? (
                      <img
                        src={org.logoUrl}
                        alt={org.organizationName || "Organizacja"}
                        className="h-9 w-9 rounded-lg object-cover shrink-0"
                      />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-light shrink-0">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-foreground truncate">
                          {org.organizationName || "Nieznana organizacja"}
                        </span>
                        {isActive && (
                          <Badge variant="default" className="gap-1 text-[10px] px-1.5 py-0 bg-primary/20 text-primary border-0">
                            <Check className="h-2.5 w-2.5" />
                            Aktywna
                          </Badge>
                        )}
                        {isDefault && !isActive && (
                          <Badge variant="outline" className="gap-1 text-[10px] px-1.5 py-0">
                            <Star className="h-2.5 w-2.5 fill-current" />
                            Domyślna
                          </Badge>
                        )}
                      </div>
                      {org.joinedAt && (
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(org.joinedAt), "d MMM yyyy", {
                            locale: pl,
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="gap-1 text-xs shrink-0">
                      {roleIcons[roleKey]}
                      {roleLabels[roleKey] || org.role}
                    </Badge>
                    {!isActive && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => switchOrganization(org.organizationId)}
                        disabled={isSwitching}
                        className="text-xs h-7"
                      >
                        {isSwitching ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          "Przełącz"
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}








