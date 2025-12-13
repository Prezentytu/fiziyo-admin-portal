"use client";

import { Building2, Shield, ShieldCheck, User, Star } from "lucide-react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface UserOrganization {
  organizationId: string;
  organizationName?: string;
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
  OWNER: <ShieldCheck className="h-3.5 w-3.5" />,
  ADMIN: <Shield className="h-3.5 w-3.5" />,
  THERAPIST: <User className="h-3.5 w-3.5" />,
  MEMBER: <User className="h-3.5 w-3.5" />,
  STAFF: <User className="h-3.5 w-3.5" />,
};

export function OrganizationsList({
  organizations,
  defaultOrganizationId,
}: OrganizationsListProps) {
  if (organizations.length === 0) {
    return (
      <Card className="border-border/60">
        <CardContent className="py-12 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-surface-light flex items-center justify-center mb-4">
            <Building2 className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">
            Nie należysz do żadnej organizacji
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          Twoje organizacje
        </CardTitle>
        <CardDescription>
          Organizacje, do których należysz
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {organizations.map((org) => {
            const isDefault = org.organizationId === defaultOrganizationId;
            const roleKey = org.role?.toUpperCase() || "MEMBER";

            return (
              <div
                key={org.organizationId}
                className="flex items-center justify-between rounded-xl border border-border bg-surface p-4 transition-colors hover:bg-surface-light"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-light">
                    <Building2 className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">
                        {org.organizationName || "Nieznana organizacja"}
                      </span>
                      {isDefault && (
                        <Badge variant="outline" className="gap-1 text-xs">
                          <Star className="h-3 w-3 fill-current" />
                          Domyślna
                        </Badge>
                      )}
                    </div>
                    {org.joinedAt && (
                      <p className="text-sm text-muted-foreground">
                        Dołączono:{" "}
                        {format(new Date(org.joinedAt), "d MMMM yyyy", {
                          locale: pl,
                        })}
                      </p>
                    )}
                  </div>
                </div>
                <Badge variant="secondary" className="gap-1.5">
                  {roleIcons[roleKey]}
                  {roleLabels[roleKey] || org.role}
                </Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}




