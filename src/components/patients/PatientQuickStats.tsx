'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Users, FolderKanban, TrendingUp, Clock, Wrench } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface Patient {
  id: string;
  fullname?: string;
  image?: string;
  assignmentStatus?: string;
  isShadowUser?: boolean;
}

interface PatientQuickStatsProps {
  totalPatients: number;
  activePatients: number;
  totalAssignments: number;
  recentPatients: Patient[];
  isLoading?: boolean;
}

export function PatientQuickStats({
  totalPatients,
  activePatients,
  totalAssignments,
  recentPatients,
  isLoading = false,
}: PatientQuickStatsProps) {
  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

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
      {/* Duża karta - Aktywni pacjenci */}
      <Card className="lg:col-span-2 border-border/60 bg-gradient-to-br from-surface to-surface-light">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Aktywni pacjenci</p>
              <div className="text-3xl font-bold text-foreground mt-1">{activePatients}</div>
              <p className="text-xs text-muted-foreground mt-1">z {totalPatients} wszystkich</p>
            </div>
            <div className="h-14 w-14 rounded-xl bg-info/10 flex items-center justify-center">
              <Users className="h-7 w-7 text-info" />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <Badge variant="secondary" className="text-xs">
              {Math.round((activePatients / Math.max(totalPatients, 1)) * 100)}% aktywnych
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Średnia karta - Ostatnio dodani */}
      <Card className="border-border/60 bg-gradient-to-br from-surface to-surface-light">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Ostatnio dodani</p>
            </div>
            <Clock className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="space-y-3">
            {recentPatients.length > 0 ? (
              recentPatients.slice(0, 3).map((patient) => (
                <Link
                  key={patient.id}
                  href={`/patients/${patient.id}`}
                  className="flex items-center gap-2 group hover:opacity-80 transition-opacity"
                >
                  <div className="relative">
                    <Avatar
                      className={cn(
                        'h-8 w-8 ring-2 transition-all',
                        patient.isShadowUser ? 'ring-muted-foreground/20' : 'ring-border/30'
                      )}
                    >
                      <AvatarImage src={patient.image} />
                      <AvatarFallback
                        className={cn(
                          'text-xs font-semibold',
                          patient.isShadowUser
                            ? 'bg-muted-foreground/60 text-white'
                            : 'bg-gradient-to-br from-info to-blue-600 text-white'
                        )}
                      >
                        {getInitials(patient.fullname)}
                      </AvatarFallback>
                    </Avatar>
                    {patient.isShadowUser && (
                      <div className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-muted-foreground/80 flex items-center justify-center ring-1 ring-card">
                        <Wrench className="h-2 w-2 text-white" />
                      </div>
                    )}
                  </div>
                  <span className="text-sm text-foreground truncate flex-1">{patient.fullname || 'Nieznany'}</span>
                </Link>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">Brak danych</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Mała karta - Przypisania */}
      <Card className="border-border/60 bg-gradient-to-br from-surface to-surface-light">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Przypisania</p>
              <div className="text-2xl font-bold text-foreground mt-1">{totalAssignments}</div>
              <p className="text-xs text-muted-foreground mt-1">zestawów ćwiczeń</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-secondary/10 flex items-center justify-center">
              <FolderKanban className="h-6 w-6 text-secondary" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

