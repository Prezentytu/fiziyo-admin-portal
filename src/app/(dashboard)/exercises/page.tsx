"use client";

import { useState } from "react";
import { useQuery } from "@apollo/client/react";
import { GET_EXERCISES_QUERY } from "@/graphql/queries/exercises.queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Dumbbell, Clock, Repeat } from "lucide-react";
import { matchesSearchQuery } from "@/utils/textUtils";

interface Exercise {
  id: string;
  name: string;
  description?: string;
  sets?: number;
  reps?: number;
}

export default function ExercisesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const { data, loading, error } = useQuery(GET_EXERCISES_QUERY);

  const exercises: Exercise[] = (data as any)?.exercises || [];
  const filteredExercises = exercises.filter((exercise) =>
    matchesSearchQuery(exercise.name, searchQuery) ||
    matchesSearchQuery(exercise.description, searchQuery)
  );

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-error">Błąd ładowania ćwiczeń: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Ćwiczenia</h1>
          <p className="text-muted-foreground">Zarządzaj biblioteką ćwiczeń</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Dodaj ćwiczenie
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Szukaj ćwiczeń..."
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
      ) : filteredExercises.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Dumbbell className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">{searchQuery ? "Nie znaleziono ćwiczeń" : "Brak ćwiczeń"}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredExercises.map((exercise) => (
            <Card key={exercise.id} className="cursor-pointer transition-colors hover:bg-surface-light">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Dumbbell className="h-5 w-5 text-primary" />
                  {exercise.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">{exercise.description || "Brak opisu"}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Repeat className="h-3 w-3" />{exercise.sets || 0} serii</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{exercise.reps || 0} powt.</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
