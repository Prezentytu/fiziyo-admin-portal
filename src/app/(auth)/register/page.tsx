"use client";

import Link from "next/link";
import { ArrowLeft, Building2, User, ArrowRight } from "lucide-react";

interface AccountTypeCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  features: string[];
  href: string;
  recommended?: boolean;
}

function AccountTypeCard({
  icon,
  title,
  description,
  features,
  href,
  recommended,
}: AccountTypeCardProps) {
  return (
    <Link
      href={href}
      className={`group relative flex flex-col rounded-2xl border p-6 transition-all hover:border-primary hover:shadow-lg hover:shadow-primary/5 ${
        recommended ? "border-primary bg-primary/5" : "border-border bg-surface"
      }`}
    >
      {recommended && (
        <span className="absolute -top-3 left-4 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
          Zalecane
        </span>
      )}

      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15">
        {icon}
      </div>

      <h3 className="mb-2 text-lg font-semibold text-foreground">{title}</h3>
      <p className="mb-4 text-sm text-muted-foreground">{description}</p>

      <ul className="mb-6 flex-1 space-y-2">
        {features.map((feature, index) => (
          <li
            key={index}
            className="flex items-start text-sm text-muted-foreground"
          >
            <span className="mr-2 mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
            {feature}
          </li>
        ))}
      </ul>

      <div className="flex items-center text-sm font-medium text-primary group-hover:text-primary-light">
        Wybierz
        <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
}

export default function RegisterSelectPage() {
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
          Wybierz typ konta
        </h1>
        <p className="text-muted-foreground">
          Wybierz opcję, która najlepiej odpowiada Twoim potrzebom
        </p>
      </div>

      {/* Account type cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <AccountTypeCard
          icon={<Building2 className="h-6 w-6 text-primary" />}
          title="Konto firmowe"
          description="Dla fizjoterapeutów, gabinetów i klinik rehabilitacyjnych"
          features={[
            "Zarządzanie pacjentami",
            "Biblioteka ćwiczeń",
            "Tworzenie zestawów",
            "Statystyki i raporty",
          ]}
          href="/register/company"
          recommended
        />
        <AccountTypeCard
          icon={<User className="h-6 w-6 text-primary" />}
          title="Konto pacjenta"
          description="Dla pacjentów korzystających z usług fizjoterapeutycznych"
          features={[
            "Dostęp do ćwiczeń",
            "Śledzenie postępów",
            "Komunikacja z terapeutą",
            "Historia sesji",
          ]}
          href="/register/patient"
        />
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
