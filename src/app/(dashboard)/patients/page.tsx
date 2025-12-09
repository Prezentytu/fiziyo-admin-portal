"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Users } from "lucide-react";

export default function PatientsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pacjenci</h1>
          <p className="text-muted-foreground">
            Zarządzaj listą pacjentów
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Dodaj pacjenta
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Szukaj pacjentów..." className="pl-9" />
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Users className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">Lista pacjentów - w przygotowaniu</p>
        </CardContent>
      </Card>
    </div>
  );
}
