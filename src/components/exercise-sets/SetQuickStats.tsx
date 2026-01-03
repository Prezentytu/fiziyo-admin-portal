"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { FolderKanban, Users, Dumbbell, Sparkles } from "lucide-react";
import Link from "next/link";

interface SetQuickStatsProps {
  totalSets: number;
  activeSets: number;
  templateSets: number;
  totalAssignments: number;
  isLoading?: boolean;
}

export function SetQuickStats({
  totalSets,
  activeSets,
  templateSets,
  totalAssignments,
  isLoading = false,
}: SetQuickStatsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <Card className="border-border/60">
            <CardContent className="p-6">
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        </div>
        <Card className="border-border/60">
          <CardContent className="p-6">
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-6">
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-4">
      {/* Duża karta - Aktywne zestawy */}
      <Card className="lg:col-span-2 border-border/60 bg-gradient-to-br from-surface to-surface-light">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Aktywne zestawy</p>
              <div className="text-3xl font-bold text-foreground mt-1">
                {activeSets}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                z {totalSets} wszystkich
              </p>
            </div>
            <div className="h-14 w-14 rounded-xl bg-secondary/10 flex items-center justify-center">
              <FolderKanban className="h-7 w-7 text-secondary" />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <Badge variant="secondary" className="text-xs">
              {Math.round((activeSets / Math.max(totalSets, 1)) * 100)}% aktywnych
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Średnia karta - Szablony */}
      <Card className="border-border/60 bg-gradient-to-br from-surface to-surface-light">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Szablony</p>
              <div className="text-2xl font-bold text-foreground mt-1">
                {templateSets}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                gotowych wzorców
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mała karta - Przypisania */}
      <Card className="border-border/60 bg-gradient-to-br from-surface to-surface-light">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Przypisania</p>
              <div className="text-2xl font-bold text-foreground mt-1">
                {totalAssignments}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                do pacjentów
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-info/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-info" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}











