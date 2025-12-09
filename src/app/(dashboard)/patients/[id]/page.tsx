"use client";

import { use, useState } from "react";
import { useQuery } from "@apollo/client/react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  FolderKanban,
  Activity,
  User,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";

import { GET_USER_BY_ID_QUERY } from "@/graphql/queries/users.queries";
import { GET_PATIENT_ASSIGNMENTS_BY_USER_QUERY } from "@/graphql/queries/patientAssignments.queries";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import type { UserByIdResponse, PatientAssignmentsResponse } from "@/types/apollo";

interface PatientDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function PatientDetailPage({ params }: PatientDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");

  // Get patient data
  const { data: userData, loading: userLoading, error: userError } = useQuery(
    GET_USER_BY_ID_QUERY,
    {
      variables: { id },
    }
  );

  // Get patient assignments
  const { data: assignmentsData, loading: assignmentsLoading } = useQuery(
    GET_PATIENT_ASSIGNMENTS_BY_USER_QUERY,
    {
      variables: { userId: id },
    }
  );

  const patient = (userData as UserByIdResponse)?.userById;
  const assignments = (assignmentsData as PatientAssignmentsResponse)?.patientAssignments || [];

  if (userLoading) {
    return (
      <div className="space-y-6">
        <LoadingState type="text" count={3} />
      </div>
    );
  }

  if (userError || !patient) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <p className="text-destructive">
          {userError ? `Błąd: ${userError.message}` : "Nie znaleziono pacjenta"}
        </p>
        <Button variant="outline" onClick={() => router.push("/patients")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Wróć do listy
        </Button>
      </div>
    );
  }

  const displayName =
    patient.fullname ||
    `${patient.personalData?.firstName || ""} ${patient.personalData?.lastName || ""}`.trim() ||
    "Nieznany pacjent";

  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const activeAssignments = assignments.filter(
    (a: { status?: string }) => a.status === "active"
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/patients")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Avatar className="h-16 w-16">
          <AvatarImage src={patient.image} alt={displayName} />
          <AvatarFallback className="bg-primary text-primary-foreground text-xl">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-3xl font-bold">{displayName}</h1>
          <div className="flex items-center gap-2 mt-1">
            {patient.isShadowUser && (
              <Badge variant="secondary">Konto tymczasowe</Badge>
            )}
            <span className="text-muted-foreground">
              {activeAssignments.length} aktywnych zestawów
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Przegląd
          </TabsTrigger>
          <TabsTrigger value="exercises" className="flex items-center gap-2">
            <FolderKanban className="h-4 w-4" />
            Zestawy ({assignments.length})
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Aktywność
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Contact info */}
            <Card>
              <CardHeader>
                <CardTitle>Dane kontaktowe</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {patient.email && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-light">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{patient.email}</p>
                    </div>
                  </div>
                )}
                {patient.contactData?.phone && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-light">
                      <Phone className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Telefon</p>
                      <p className="font-medium">{patient.contactData.phone}</p>
                    </div>
                  </div>
                )}
                {patient.contactData?.address && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-light">
                      <MapPin className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Adres</p>
                      <p className="font-medium">{patient.contactData.address}</p>
                    </div>
                  </div>
                )}
                {patient.creationTime && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-light">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Dodano</p>
                      <p className="font-medium">
                        {format(new Date(patient.creationTime), "d MMMM yyyy", {
                          locale: pl,
                        })}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Statystyki</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border border-border p-4 text-center">
                    <p className="text-3xl font-bold text-primary">
                      {activeAssignments.length}
                    </p>
                    <p className="text-sm text-muted-foreground">Aktywne zestawy</p>
                  </div>
                  <div className="rounded-lg border border-border p-4 text-center">
                    <p className="text-3xl font-bold">{assignments.length}</p>
                    <p className="text-sm text-muted-foreground">Wszystkie zestawy</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="exercises" className="mt-6">
          {assignmentsLoading ? (
            <LoadingState type="row" count={3} />
          ) : assignments.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <EmptyState
                  icon={FolderKanban}
                  title="Brak przypisanych zestawów"
                  description="Ten pacjent nie ma jeszcze przypisanych zestawów ćwiczeń"
                  actionLabel="Przypisz zestaw"
                  onAction={() => {}}
                />
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {assignments.map((assignment: {
                id: string;
                status?: string;
                assignedAt?: string;
                startDate?: string;
                endDate?: string;
                completionCount?: number;
                exerciseSet?: {
                  id: string;
                  name: string;
                  description?: string;
                  exerciseMappings?: { id: string }[];
                };
              }) => (
                <Card key={assignment.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface-light">
                        <FolderKanban className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {assignment.exerciseSet?.name || "Nieznany zestaw"}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>
                            {assignment.exerciseSet?.exerciseMappings?.length || 0} ćwiczeń
                          </span>
                          {assignment.completionCount !== undefined &&
                            assignment.completionCount > 0 && (
                              <span>• {assignment.completionCount} ukończeń</span>
                            )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={assignment.status === "active" ? "success" : "secondary"}
                      >
                        {assignment.status === "active" ? "Aktywny" : assignment.status}
                      </Badge>
                      {assignment.assignedAt && (
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(assignment.assignedAt), "d MMM yyyy", {
                            locale: pl,
                          })}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <Card>
            <CardContent className="py-12">
              <EmptyState
                icon={Activity}
                title="Historia aktywności"
                description="Szczegółowa historia wykonanych ćwiczeń będzie dostępna wkrótce"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

