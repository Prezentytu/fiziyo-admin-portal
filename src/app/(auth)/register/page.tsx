"use client";

import Link from "next/link";
import {
  ArrowLeft,
  User,
  Users,
  Building2,
  Check,
  ArrowRight,
} from "lucide-react";

type OrganizationType = {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  features: string[];
};

const organizationTypes: OrganizationType[] = [
  {
    id: "individual",
    icon: <User className="h-8 w-8 text-primary" />,
    title: "Praktyka Indywidualna",
    description: "Rozpocznij bezpłatnie",
    features: [
      "Do 5 aktywnych pacjentów",
      "Podstawowe funkcje",
      "Zestawy ćwiczeń",
      "Upgrade w każdej chwili",
    ],
  },
  {
    id: "small",
    icon: <Users className="h-8 w-8 text-primary" />,
    title: "Mały Gabinet",
    description: "Zespół 2-5 fizjoterapeutów",
    features: [
      "Bezpłatny start",
      "Możliwość dodania zespołu",
      "Współdzielone zestawy",
      "Elastyczny rozwój",
    ],
  },
  {
    id: "large",
    icon: <Building2 className="h-8 w-8 text-primary" />,
    title: "Duża Klinika",
    description: "Centrum rehabilitacji, 6+ osób",
    features: [
      "Bezpłatny start",
      "Gotowe na skalowanie",
      "Pełna kontrola",
      "Zaawansowane funkcje",
    ],
  },
];

export default function RegisterSelectPlanPage() {
  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/login"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Powrót
      </Link>

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Jaki typ organizacji?
        </h1>
        <p className="text-muted-foreground">
          Wybierz opcję najlepiej opisującą Twoją działalność
        </p>
      </div>

      {/* Organization types */}
      <div className="space-y-4">
        {organizationTypes.map((type) => (
          <Link
            key={type.id}
            href={`/register/${type.id}`}
            className="group block rounded-xl border border-border bg-surface p-5 transition-all hover:border-primary hover:bg-surface-light"
          >
            <div className="mb-4 flex items-start gap-4">
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                {type.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">{type.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {type.description}
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </div>

            <ul className="space-y-2">
              {type.features.map((feature, index) => (
                <li
                  key={index}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <Check className="h-4 w-4 text-primary" />
                  {feature}
                </li>
              ))}
            </ul>
          </Link>
        ))}
      </div>

      {/* Info box */}
      <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
        <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
        <p className="text-sm text-muted-foreground">
          Wszyscy zaczynają bezpłatnie — bez karty kredytowej. Rozszerz plan gdy
          będziesz gotowy!
        </p>
      </div>

      {/* Login link */}
      <p className="text-center text-sm text-muted-foreground">
        Masz już konto?{" "}
        <Link
          href="/sign-in"
          className="font-semibold text-primary hover:text-primary-light"
        >
          Zaloguj się
        </Link>
      </p>
    </div>
  );
}
