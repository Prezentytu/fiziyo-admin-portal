"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Ustawienia</h1>
        <p className="text-muted-foreground">
          Zarządzaj ustawieniami konta
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Settings className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">Ustawienia - w przygotowaniu</p>
        </CardContent>
      </Card>
    </div>
  );
}
