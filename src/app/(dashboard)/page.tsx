import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dumbbell, FolderKanban, Users, TrendingUp } from "lucide-react";

const stats = [
  { name: "Ćwiczenia", value: "124", icon: Dumbbell, change: "+12%" },
  { name: "Zestawy", value: "45", icon: FolderKanban, change: "+8%" },
  { name: "Pacjenci", value: "89", icon: Users, change: "+23%" },
  { name: "Aktywność", value: "94%", icon: TrendingUp, change: "+4%" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Witaj w panelu administracyjnym Fiziyo
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.name}
              </CardTitle>
              <stat.icon className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-primary">{stat.change} od ostatniego miesiąca</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ostatnia aktywność</CardTitle>
            <CardDescription>Ostatnie akcje w systemie</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { action: "Dodano nowe ćwiczenie", time: "5 min temu" },
                { action: "Zaktualizowano zestaw", time: "1 godz. temu" },
                { action: "Nowy pacjent dołączył", time: "2 godz. temu" },
                { action: "Edytowano ćwiczenie", time: "3 godz. temu" },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between border-b border-border pb-2 last:border-0 last:pb-0">
                  <span className="text-sm">{item.action}</span>
                  <span className="text-xs text-muted-foreground">{item.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Szybkie akcje</CardTitle>
            <CardDescription>Często używane funkcje</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Dodaj ćwiczenie", href: "/exercises/new" },
                { label: "Nowy zestaw", href: "/exercise-sets/new" },
                { label: "Dodaj pacjenta", href: "/patients/new" },
                { label: "Raporty", href: "/reports" },
              ].map((item, i) => (
                <a
                  key={i}
                  href={item.href}
                  className="flex items-center justify-center rounded-lg border border-border bg-surface-light p-4 text-sm font-medium transition-colors hover:bg-surface-hover"
                >
                  {item.label}
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
