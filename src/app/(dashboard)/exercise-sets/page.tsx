"use client";

import { useState } from "react";
import { useQuery } from "@apollo/client/react";
import { GET_EXERCISE_SETS_QUERY } from "@/graphql/queries/exerciseSets.queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, FolderKanban, Dumbbell, Users } from "lucide-react";
import { matchesSearchQuery } from "@/utils/textUtils";

interface ExerciseSet {
  id: string;
  name: string;
  description?: string;
  exercises?: unknown[];
  assignedPatients?: number;
}

export default function ExerciseSetsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const { data, loading, error } = useQuery(GET_EXERCISE_SETS_QUERY);

  const exerciseSets: ExerciseSet[] = (data as any)?.exerciseSets || [];
  const filteredSets = exerciseSets.filter((set) =>
    matchesSearchQuery(set.name, searchQuery) ||
    matchesSearchQuery(set.description, searchQuery)
  );

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-error">Błąd ładowania zestawów: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Zestawy ćwiczeń</h1>
          <p className="text-muted-foreground">Zarządzaj zestawami ćwiczeń dla pacjentów</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nowy zestaw
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Szukaj zestawów..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader><div className="h-5 w-2/3 rounded bg-surface-light" /></CardHeader>
              <CardContent><div className="space-y-2"><div className="h-4 w-full rounded bg-surface-light" /></div></CardContent>
            </Card>
          ))}
        </div>
      ) : filteredSets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderKanban className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">{searchQuery ? "Nie znaleziono zestawów" : "Brak zestawów"}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSets.map((set) => (
            <Card key={set.id} className="cursor-pointer transition-colors hover:bg-surface-light">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FolderKanban className="h-5 w-5 text-primary" />
                  {set.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">{set.description || "Brak opisu"}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Dumbbell className="h-3 w-3" />{set.exercises?.length || 0} ćwiczeń</span>
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" />{set.assignedPatients || 0} pacjentów</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
