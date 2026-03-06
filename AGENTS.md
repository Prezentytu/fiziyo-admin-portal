# AGENTS.md - FiziYo Admin Portal

WAŻNE: Preferuj wnioskowanie oparte na dokumentacji (retrieval-led) zamiast wnioskowania opartego na danych treningowych dla zadań Next.js/React.

## Task Router

Przed rozpoczęciem pracy dopasuj zadanie do tabeli i przeczytaj WSZYSTKIE pasujące guide'y:

| Zadanie                          | Guide                                             |
| -------------------------------- | ------------------------------------------------- |
| Tworzenie/edycja ćwiczeń         | `src/features/exercises/AGENTS.md`                |
| Assignment Wizard                | `src/features/assignment/AGENTS.md`               |
| Praca z pacjentami               | `src/features/patients/AGENTS.md`                 |
| Zapytania/mutacje GraphQL        | `src/graphql/AGENTS.md`                           |
| Komponenty współdzielone         | `src/components/shared/AGENTS.md`                 |
| Zestawy ćwiczeń                  | `src/features/exercise-sets/AGENTS.md`            |
| Nowa specyfikacja                | `.ai/specs/AGENTS.md`, `.ai/skills/spec-writing/` |
| Analiza spec przed implementacją | `.ai/skills/pre-implement-spec/`                  |
| Implementacja ze specyfikacji    | `.ai/skills/implement-spec/`                      |
| Testy regresyjne / integracyjne  | `.ai/skills/integration-tests/`                   |
| Code review                      | `.ai/skills/code-review/`                         |
| UI/UX / design / accessibility   | `.ai/skills/product-designer/SKILL.md`            |
| Ustawienia/organizacja           | `src/components/settings/AGENTS.md`               |
| Kontekst cross-repo / backend    | `.ai/ECOSYSTEM.md`                                |
| Encje / enumy / relacje          | `.ai/DOMAIN_MODEL.md`                             |
| Flow biznesowe / auth / AI       | `.ai/DATA_FLOWS.md`                               |
| Struktura modułów (utils, testy) | `.ai/STRUCTURE.md`                                |

## Workflow Orchestration

1. **Spec-first**: Wejdź w plan mode dla nietrywialnych zadań (3+ kroki). Sprawdź `.ai/specs/` przed kodowaniem; utwórz SPEC jeśli nie istnieje.
2. **Task Router**: Dopasuj zadanie do tabeli i przeczytaj odpowiednie guide'y.
   - Jeśli zadanie dotyczy UI/UX/designu (np. redesign, layout, komponenty wizualne, dostępność, audit UI), zawsze przeczytaj `.ai/skills/product-designer/SKILL.md`.
3. **Lessons-first**: Przed implementacją przeczytaj `.ai/lessons.md` i sprawdź, czy zadanie nie powtarza znanego błędu.
4. **Self-improvement**: Po korekcie zaktualizuj `.ai/lessons.md`.
5. **Verification**: Uruchom build, sprawdź lint. Zapytaj: "Czy senior developer zaakceptowałby ten kod?"
6. **Elegance**: Dla nietrywialnych zmian, zatrzymaj się i zapytaj "czy istnieje bardziej eleganckie rozwiązanie?"

### Backward compatibility

- Przed zmianami kontraktowymi przeczytaj `BACKWARD_COMPATIBILITY.md`.
- Przy zmianach GraphQL/typow/test IDs stosuj podejscie additive-first i plan deprecacji.

## Core Principles

- **Simplicity First**: Każda zmiana tak prosta jak to możliwe. Minimalny wpływ na kod.
- **No Laziness**: Szukaj root cause. Zero tymczasowych fixów. Standardy senior developera.
- **Minimal Impact**: Zmiana dotyka tylko to co konieczne. Unikaj wprowadzania błędów.

## Komendy

- Instalacja: `npm install`
- Serwer dev: `npm run dev` (HTTPS)
- Build: `npm run build`
- Lint: `npm run lint`, `npm run lint:fix`
- Type-check: `npm run type-check`
- Formatowanie: `npm run format`, `npm run format:check`
- Walidacja pełna: `npm run validate` (lint + type-check + build)
- Testy: `npm run test`, `npm run test:run`, `npm run test:coverage`

## Testowanie

- **Logika biznesowa** (filtry, reguły widoczności, walidacja): testy jednostkowe obowiązkowe. Wyciągaj czyste funkcje do helperów i testuj je (Vitest). Zobacz `docs/testing/testing-guidelines.md`.
- Przed zakończeniem zadania uruchom `npm run test:run` i `npm run lint`; w razie potrzeby `npm run validate`.
- Przy zmianie warunków lub filtrów: dodać/aktualizować testy dla tej logiki, żeby regresje były wykrywane.

## Opis projektu

Panel administracyjny FiziYo dla fizjoterapeutów - zarządzanie ćwiczeniami, zestawami, pacjentami, gabinetami.
Integracja z fizjo-app (React Native) przez wspólny backend GraphQL (.NET Core).

## Stack technologiczny

| Warstwa     | Technologia                                       |
| ----------- | ------------------------------------------------- |
| Framework   | Next.js 16 (App Router)                           |
| Język       | TypeScript 5 (strict mode)                        |
| UI          | React 19 + Tailwind CSS 4 + shadcn/ui             |
| Dane        | Apollo Client 4.0 (GraphQL)                       |
| Formularze  | react-hook-form + zod                             |
| Tabele      | TanStack React Table                              |
| Autoryzacja | Clerk (NextJS SDK) → Token Exchange → Własny JWT  |
| Backend     | .NET Core 9.0 + HotChocolate GraphQL + PostgreSQL |

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
├── features/                 # Moduły domenowe (zobacz .ai/STRUCTURE.md)
│   ├── assignment/           # Wizard przypisań (utils/, utils/__tests__/)
│   ├── exercises/            # Ćwiczenia
│   ├── exercise-sets/        # Zestawy ćwiczeń
│   ├── patients/             # Pacjenci
│   ├── verification/         # Weryfikacja treści
│   └── import/               # Import dokumentów
├── components/               # Komponenty współdzielone
│   ├── shared/               # DataTable, EmptyState, etc.
│   ├── ui/                   # shadcn/ui
│   ├── layout/               # Sidebar, Header, etc.
│   └── ...                   # auth, organization, settings, finances, ...
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
function handleError(error: any) {}

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
'use client';

import { useState } from 'react';
```

### GraphQL - useQuery z skip (NIE useLazyQuery)

```typescript
// ✅ Poprawnie: useQuery z skip
const { data, loading } = useQuery(GET_EXERCISES_QUERY, {
  variables: { organizationId: orgId || '' },
  skip: !orgId,
  fetchPolicy: 'cache-first',
});

// ❌ Zakazane: useLazyQuery (deprecated w Apollo 4.0)
const [fetch] = useLazyQuery(GET_EXERCISES_QUERY);
```

### Formularze - react-hook-form + zod

```typescript
const schema = z.object({
  name: z.string().min(2, 'Min 2 znaki'),
  type: z.enum(['reps', 'time', 'hold']),
});

type FormValues = z.infer<typeof schema>;

const form = useForm<FormValues>({
  resolver: zodResolver(schema),
  defaultValues: { name: '', type: 'reps' },
});
```

### Etykiety pól formularza

- **Pola opcjonalne**: tylko nazwa pola, bez gwiazdki i bez słowa „opcjonalnie” / „(opcjonalnie)” w etykiecie.

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
import { useState, useCallback } from 'react';
import { useQuery, useMutation } from '@apollo/client';

// 2. Komponenty UI (shadcn/ui)
import { Button } from '@/components/ui/button';

// 3. Komponenty wewnętrzne
import { ExerciseCard } from '@/features/exercises/ExerciseCard';

// 4. GraphQL
import { GET_EXERCISES_QUERY } from '@/graphql/queries';

// 5. Utils i typy
import { cn } from '@/lib/utils';
import type { Exercise } from '@/types';
```

## Konwencje nazewnictwa

| Typ               | Konwencja   | Przykład              |
| ----------------- | ----------- | --------------------- |
| Komponenty        | PascalCase  | `ExerciseCard.tsx`    |
| Utils             | camelCase   | `dateUtils.ts`        |
| Stałe             | UPPER_SNAKE | `MAX_RETRY_COUNT`     |
| Zapytania GraphQL | UPPER_SNAKE | `GET_EXERCISES_QUERY` |
| Foldery           | kebab-case  | `exercise-sets/`      |

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
- Dla poziomych pasków/kafelków ćwiczeń obowiązuje reużycie `src/components/shared/exercise/ExerciseExecutionCard.tsx` + adapterów (bez lokalnych klonów layoutu)
- Unikaj etykiet „ćwiczenie czasowe/powtórzeniowe” w UI; semantyka ma wynikać z `executionTime` (timer pacjenta)

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

### Theme-safe UI (LIGHT + DARK) - OBOWIĄZKOWE

- Każda nowa lub edytowana część UI MUSI być czytelna w obu motywach od pierwszej wersji.
- Bazowe style buduj na tokenach semantycznych: `bg-surface`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`.
- Unikaj hardcoded baz kolorów (`zinc`, `gray`, `slate`, `white`, `black`) dla kontenerów i typografii; wyjątki status/media tylko z poprawnym wariantem `dark:`.
- Hover/focus nie mogą obniżać kontrastu tekstu; stan interakcji ma utrzymać lub poprawić czytelność.
- Dla kart z overlayami i pływającymi akcjami stosuj tła i bordery theme-aware (np. `bg-background/90 dark:bg-black/40`, `border-border` + `dark:` override).
- Przed zakończeniem zmian UI uruchom lint dla zmienionych plików i popraw problemy dodane w tej iteracji.

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

## Wiedza domenowa (.ai/)

Pełna dokumentacja ekosystemu dla agentów AI:

| Plik                  | Opis                                                                           | Kiedy czytać                                                 |
| --------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| `.ai/ECOSYSTEM.md`    | Mapa cross-repo: admin ↔ mobile ↔ backend, GraphQL contract, gdzie szukać kodu | Zmiana dotykająca więcej niż jeden klient; praca z backendem |
| `.ai/DOMAIN_MODEL.md` | Encje, enumy (pełne wartości), state machines, JSONB, relacje                  | Praca z danymi; nowe pola/encje; walidacja                   |
| `.ai/DATA_FLOWS.md`   | Diagramy: auth, assignment, billing, AI, rejestracja, real-time, media         | Implementacja lub debugowanie flow wielowarstwowego          |
| `.ai/specs/`          | Specyfikacje modułów (SPEC-001…005)                                            | Przed implementacją nowej funkcjonalności                    |
| `.ai/lessons.md`      | Dziennik wniosków z pracy AI                                                   | Po korekcie — dodaj wpis                                     |
| `.ai/skills/`         | Umiejętności: spec-writing, code-review, create-agents-md, product-designer    | Tworzenie specyfikacji, przegląd kodu, zadania UI/UX         |

## Schemat backendu i wzorce domenowe

Szczegóły encji i enumów → `.ai/DOMAIN_MODEL.md`. Wzorce modułowe:

- **Exercise, parametry, UI**: `src/features/exercises/AGENTS.md`
- **ExerciseSetMapping, ExerciseSet, PatientAssignment**: `src/features/exercise-sets/AGENTS.md`

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
