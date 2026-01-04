"use client";

import { Calendar, Clock, Bell, Users, ArrowRight, Sparkles } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const upcomingFeatures = [
  {
    icon: Calendar,
    title: "Widok kalendarza",
    description: "Przeglądaj wizyty w wygodnym widoku miesiąca, tygodnia lub dnia",
  },
  {
    icon: Clock,
    title: "Planowanie wizyt",
    description: "Twórz i zarządzaj wizytami z wyborem pacjenta, gabinetu i godziny",
  },
  {
    icon: Bell,
    title: "Powiadomienia",
    description: "Automatyczne przypomnienia dla pacjentów o nadchodzących wizytach",
  },
  {
    icon: Users,
    title: "Prośby o wizyty",
    description: "Pacjenci mogą prosić o wizyty, a Ty zatwierdzasz lub odrzucasz",
  },
];

export default function AppointmentsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Kalendarz wizyt</h1>
        <p className="text-muted-foreground mt-1">
          Zarządzaj harmonogramem wizyt z pacjentami
        </p>
      </div>

      {/* Coming Soon Hero */}
      <Card className="relative overflow-hidden border-border/60">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
        <CardContent className="relative py-16 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20">
            <Calendar className="h-10 w-10 text-primary" />
          </div>
          <Badge variant="secondary" className="mb-4 gap-1.5">
            <Sparkles className="h-3 w-3" />
            Wkrótce dostępne
          </Badge>
          <h2 className="text-2xl font-bold text-foreground mb-3">
            Kalendarz wizyt w przygotowaniu
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto mb-8">
            Pracujemy nad funkcjonalnością kalendarza wizyt, która pozwoli Ci 
            efektywnie zarządzać harmonogramem spotkań z pacjentami.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button variant="outline" className="rounded-xl" disabled>
              <Bell className="mr-2 h-4 w-4" />
              Powiadom mnie
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Features Preview */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <ArrowRight className="h-5 w-5 text-primary" />
          Co będzie dostępne
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {upcomingFeatures.map((feature, index) => (
            <Card
              key={index}
              className="border-border/60 bg-surface/50 transition-all hover:bg-surface"
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-light">
                    <feature.icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground mb-1">
                      {feature.title}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Info box */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-1">
                Tymczasowo
              </h4>
              <p className="text-sm text-muted-foreground">
                Do czasu uruchomienia kalendarza, możesz kontaktować się z pacjentami
                bezpośrednio przez dane kontaktowe dostępne w ich profilach.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}













