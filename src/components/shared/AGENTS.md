# AGENTS.md — Komponenty współdzielone

## Zakres

Komponenty reużywalne używane w wielu modułach. Preferuj import z `@/components/shared` przed tworzeniem nowych.

## Kluczowe komponenty

### DataTable

Główna tabela z danymi. Używaj dla list (ćwiczenia, pacjenci, zestawy).

### ExerciseSetBuilder

Builder zestawu ćwiczeń — listowanie, dodawanie, edycja, usuwanie ćwiczeń w zestawie. Współdzielony przez CreateSetWizard i Assignment Wizard.

### LabeledStepper

Krokowy wskaźnik (np. 1/5, 2/5). Używany w wizardach.

### ConfirmDialog

Dialog potwierdzenia z Cmd+Enter i Escape.

### EmptyState

Stan pusty z ikoną i CTA.

### LoadingState

Loader podczas ładowania.

### SearchInput

Pole wyszukiwania z debounce.

### Inne

- `AccessGuard` — ochrona dostępu (rola/organizacja)
- `StatsCard` — karta ze statystyką
- `FileUpload` — upload plików
- `SmartAccordion` — rozwijana sekcja
- `ColorBadge` — badge z kolorem
- `CompletionBar` — pasek postępu
- `GhostField` — pole ghost (np. w formularzach)

## Import

```typescript
import { DataTable, EmptyState, ConfirmDialog } from '@/components/shared';
import { ExerciseSetBuilder } from '@/components/shared';
```

## Zasady

- Sprawdź `index.ts` przed tworzeniem nowego — eksportuj przez index
- Preferuj komponenty z `@/components/ui/` (shadcn) i `shared` przed nowymi
- Każdy interaktywny element: `data-testid`
