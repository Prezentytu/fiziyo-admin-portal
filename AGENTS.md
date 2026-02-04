# AGENTS.md - FiziYo Admin Portal

WAŻNE: Preferuj wnioskowanie oparte na dokumentacji (retrieval-led) zamiast wnioskowania opartego na danych treningowych dla zadań Next.js/React.

## Komendy

- Instalacja: `npm install`
- Serwer dev: `npm run dev` (HTTPS)
- Build: `npm run build`
- Lint: `npm run lint`

## Opis projektu

Panel administracyjny FiziYo dla fizjoterapeutów - zarządzanie ćwiczeniami, zestawami, pacjentami, gabinetami.
Integracja z fizjo-app (React Native) przez wspólny backend GraphQL (.NET Core).

## Stack technologiczny

| Warstwa | Technologia |
|---------|-------------|
| Framework | Next.js 16 (App Router) |
| Język | TypeScript 5 (strict mode) |
| UI | React 19 + Tailwind CSS 4 + shadcn/ui |
| Dane | Apollo Client 4.0 (GraphQL) |
| Formularze | react-hook-form + zod |
| Tabele | TanStack React Table |
| Autoryzacja | Clerk (NextJS SDK) → Token Exchange → Własny JWT |
| Backend | .NET Core 9.0 + HotChocolate GraphQL + PostgreSQL |

## Struktura projektu

```
src/
├── app/                      # Next.js App Router
│   ├── (auth)/               # Logowanie, rejestracja
│   ├── (dashboard)/          # Główne strony aplikacji
│   │   ├── exercises/        # Ćwiczenia
│   │   ├── exercise-sets/    # Zestawy ćwiczeń
│   │   ├── patients/         # Pacjenci
│   │   ├── organization/     # Zarządzanie organizacją
│   │   ├── billing/          # Rozliczenia
│   │   ├── settings/         # Ustawienia
├── components/
│   ├── exercises/            # Komponenty ćwiczeń
│   ├── patients/             # Komponenty pacjentów
│   ├── shared/               # DataTable, EmptyState, etc.
│   └── ui/                   # Komponenty shadcn/ui
├── graphql/
│   ├── queries/              # Zapytania GraphQL
│   ├── mutations/            # Mutacje GraphQL
│   ├── subscriptions/        # Subskrypcje real-time
│   └── types/                # Typy GraphQL
├── hooks/                    # Custom React hooks
├── services/                 # Serwisy AI, chat, import
├── lib/                      # Apollo provider, utils
└── types/                    # Typy TypeScript
```

## Styl kodu

### Zasady ogólne

- Zakaz jednoliterowych nazw zmiennych (wyjątek: `i`, `j` w pętlach)
- Unikaj komentarzy w kodzie - preferuj samodokumentujący się kod
- Minimalna liczba eksportów, wszystkie typowane
- Preferuj programowanie funkcyjne (czyste funkcje) nad klasy
- Komentarze w kodzie pisz po angielsku
- ZAWSZE sprawdź czy projekt się buduje po zmianach

### TypeScript - STRICT (zakaz `any`)

```typescript
// ❌ ZAKAZANE: any
function handleError(error: any) { }

// ✅ WYMAGANE: unknown + type guard
function handleError(error: unknown) {
  if (error instanceof Error) {
    console.log(error.message);
  }
}
```

### Komponenty - zwykłe funkcje (NIE React.FC)

```typescript
// ✅ Poprawny wzorzec
interface ExerciseCardProps {
  exercise: Exercise;
  onEdit?: (exercise: Exercise) => void;
}

export function ExerciseCard({ exercise, onEdit }: ExerciseCardProps) {
  // kolejność: hooks, handlers, warunki, render
  const handleEdit = () => onEdit?.(exercise);
  if (!exercise) return null;
  return <Card>...</Card>;
}
```

### Dyrektywa "use client"

```typescript
// ✅ MUSI być pierwsza linia, przed importami
"use client";

import { useState } from "react";
```

### GraphQL - useQuery z skip (NIE useLazyQuery)

```typescript
// ✅ Poprawnie: useQuery z skip
const { data, loading } = useQuery(GET_EXERCISES_QUERY, {
  variables: { organizationId: orgId || "" },
  skip: !orgId,
  fetchPolicy: "cache-first",
});

// ❌ Zakazane: useLazyQuery (deprecated w Apollo 4.0)
const [fetch] = useLazyQuery(GET_EXERCISES_QUERY);
```

### Formularze - react-hook-form + zod

```typescript
const schema = z.object({
  name: z.string().min(2, "Min 2 znaki"),
  type: z.enum(["reps", "time", "hold"]),
});

type FormValues = z.infer<typeof schema>;

const form = useForm<FormValues>({
  resolver: zodResolver(schema),
  defaultValues: { name: "", type: "reps" },
});
```

### Wzorzec Dialog - zawsze renderuj, akceptuj null

```typescript
// ✅ Poprawnie: Dialog zawsze renderowany
<EditDialog
  isOpen={isOpen}
  exercise={selectedExercise}  // może być null
  onClose={() => {
    setIsOpen(false);
    setSelectedExercise(null);
  }}
/>

// Wewnątrz dialogu - obsłuż null bezpiecznie
const name = exercise?.name ?? "";
```

## Organizacja importów

```typescript
// 1. Zewnętrzne biblioteki
import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@apollo/client";

// 2. Komponenty UI (shadcn/ui)
import { Button } from "@/components/ui/button";

// 3. Komponenty wewnętrzne
import { ExerciseCard } from "@/components/exercises/ExerciseCard";

// 4. GraphQL
import { GET_EXERCISES_QUERY } from "@/graphql/queries";

// 5. Utils i typy
import { cn } from "@/lib/utils";
import type { Exercise } from "@/types";
```

## Konwencje nazewnictwa

| Typ | Konwencja | Przykład |
|-----|-----------|----------|
| Komponenty | PascalCase | `ExerciseCard.tsx` |
| Utils | camelCase | `dateUtils.ts` |
| Stałe | UPPER_SNAKE | `MAX_RETRY_COUNT` |
| Zapytania GraphQL | UPPER_SNAKE | `GET_EXERCISES_QUERY` |
| Foldery | kebab-case | `exercise-sets/` |

## Testowanie - data-testid OBOWIĄZKOWE

Każdy interaktywny element MUSI mieć `data-testid`:

```typescript
// Format: [moduł]-[komponent]-[element]-[akcja?]

// ✅ Wymagane
<Button data-testid="exercise-form-submit-btn">Zapisz</Button>
<Input data-testid="patient-form-firstname-input" />
<Card data-testid={`exercise-card-${exercise.id}`}>

// ❌ Zakazane - brak data-testid
<Button onClick={handleSave}>Zapisz</Button>
```

Prefiksy modułów: `auth-`, `nav-`, `exercise-`, `set-`, `patient-`, `org-`, `settings-`, `common-`

## Interakcja UI

### Skróty klawiszowe (OBOWIĄZKOWE)

- Każdy nowy dialog MUSI wspierać `Cmd/Ctrl + Enter` jako skrót głównej akcji
- Każdy dialog MUSI wspierać `Escape` do zamykania
- Używaj wzorców z istniejących komponentów

### Reużywalność komponentów

- Preferuj komponenty z `@/components/ui/` i `@/components/shared/` przed tworzeniem nowych
- Domyślnie używaj `DataTable` dla tabel z danymi
- Sprawdź istniejące wzorce przed implementacją nowego UI

## Wytyczne UI/UX

### Layout Action-First (styl Linear/Vercel)

```
┌─────────────────────────────────────────────────┐
│ Kompaktowy Header: [Tytuł]     [Szukaj] [Opcje] │
├─────────────────────────────────────────────────┤
│ Hero Action (gradient)  │ Stat │ Stat │ Stat    │
├─────────────────────────────────────────────────┤
│ Główna treść (lista/grid z danymi)              │
└─────────────────────────────────────────────────┘
```

### Zmienne CSS (używaj klas Tailwind, nie hardcoded kolorów)

```typescript
// ✅ Poprawnie
<div className="bg-surface text-foreground border-border">
<Button className="bg-primary text-primary-foreground">

// ❌ Źle
<div style={{ backgroundColor: '#1a1a1a' }}>
```

## Bezpieczeństwo i jakość

### Walidacja danych

- Waliduj WSZYSTKIE dane wejściowe schematami `zod`
- Definiuj schematy create/update i reużywaj w formularzach i API
- Wyprowadzaj typy TypeScript przez `z.infer<typeof schema>`

### Bezpieczeństwo autoryzacji

- Zwracaj minimalne komunikaty błędów auth (nie ujawniaj czy email istnieje)
- Nigdy nie loguj credentials ani tokenów
- Zawsze używaj wzorca token exchange (Clerk → Własny JWT)

### Bezpieczeństwo typów

- Centralizuj reużywalne typy w `@/types/` i importuj wszędzie
- Definiuj DTO przez schematy zod dla bezpieczeństwa runtime + compile-time
- Nie wprowadzaj nowych API typowanych jako `any`

## Workflow Git

- Nigdy nie commituj secrets (`.env`, credentials)
- Preferuj małe, atomowe commity
- Zawsze uruchom lint przed commitem

## Granice (czego agent NIE MOŻE robić bez zgody)

- NIE usuwaj plików bez potwierdzenia
- NIE modyfikuj `.env` ani plików credentials
- NIE pushuj do main/master bez review
- NIE usuwaj atrybutów data-testid
- NIE używaj typu `any` - używaj `unknown`
- NIE używaj `useLazyQuery` - używaj `useQuery` z `skip`

## Schemat backendu (C# .NET)

### Exercise (Ćwiczenie)

`Id, Name, Description, Type ("reps"|"time"), Sets, Reps, Duration, RestSets, RestReps, PreparationTime, ExecutionTime, ExerciseSide ("left"|"right"|"alternating"|"both"|"none"), ImageUrl, Images[], GifUrl, VideoUrl, Notes, MainTags[], AdditionalTags[], Scope, IsActive, IsPublicTemplate`

### ExerciseSet (Zestaw ćwiczeń)

`Id, Name, Description, OrganizationId, IsActive, IsTemplate, Frequency { TimesPerDay, TimesPerWeek, BreakBetweenSets, Monday-Sunday }, ExerciseMappings[], PatientAssignments[]`

### PatientAssignment (Przypisanie pacjenta)

`Id, ExerciseSetId, UserId, AssignedById, Status, StartDate, EndDate, Frequency`

## Dokumentacja

- Assignment Wizard: `docs/assignment-wizard-overview.md`
- Billing Widget: `docs/billing-widget-readme.md`
- Mapa Test IDs: `docs/testing/data-testid-map.md`

## Specyfikacje (.ai/specs/)

Przed implementacją nowych funkcjonalności sprawdź czy istnieje specyfikacja w `.ai/specs/`:
- [SPEC-001 Assignment Wizard](.ai/specs/SPEC-001-2026-02-04-assignment-wizard.md)
- [SPEC-002 Billing Widget](.ai/specs/SPEC-002-2026-02-04-billing-widget.md)

Zobacz [.ai/specs/README.md](.ai/specs/README.md) dla pełnego indeksu i [.ai/specs/AGENTS.md](.ai/specs/AGENTS.md) dla wytycznych spec-first development.

## Auto-generowanie specyfikacji

Nawet gdy nie poproszono o aktualizację specyfikacji, agenci powinni:
- Generować lub aktualizować spec przy implementacji znaczących zmian
- Utrzymywać synchronizację specyfikacji z implementacją
- Dokumentować decyzje architektoniczne podjęte podczas developmentu
- Aktualizować tabelę katalogową w `.ai/specs/README.md` przy tworzeniu nowych specyfikacji
