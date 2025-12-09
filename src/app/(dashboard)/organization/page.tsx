"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2 } from "lucide-react";

export default function OrganizationPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Organizacja</h1>
        <p className="text-muted-foreground">
          Zarządzaj ustawieniami organizacji
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Building2 className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">Ustawienia organizacji - w przygotowaniu</p>
        </CardContent>
      </Card>
    </div>
  );
}
