# AGENTS.md — Komponenty współdzielone

## Zakres

Komponenty reużywalne używane w wielu modułach. Preferuj import z `@/components/shared` przed tworzeniem nowych.

## Kluczowe komponenty

### DataTable

Główna tabela z danymi. Używaj dla list (ćwiczenia, pacjenci, zestawy).

### ExerciseSetBuilder

Builder zestawu ćwiczeń — listowanie, dodawanie, edycja, usuwanie ćwiczeń w zestawie. Współdzielony przez CreateSetWizard i Assignment Wizard.

### ExerciseExecutionCard

Jedyny bazowy komponent poziomego kafelka/paska ćwiczenia (miniatura + nazwa + dawkowanie + akcje). Używaj go we wszystkich flow wymagających listy ćwiczeń zamiast tworzyć lokalne warianty.

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
- Dla pasków/kafelków ćwiczeń obowiązuje `ExerciseExecutionCard` + adaptery z `shared/exercise`
- Nie wprowadzaj terminów „ćwiczenie czasowe/powtórzeniowe” w UI; używaj modelu `executionTime` i komunikatów o timerze

## Standaryzacja active / selected

- Używaj jednego contractu stanów `active/selected` przez wspólne komponenty (`@/components/ui/*`) zamiast lokalnych klas `data-[state=active]` w feature'ach
- Dla zakładek używaj wariantów `TabsTrigger` (`activeVariant`: `surface`, `subtle`, `accent`, `success`, `warning`, `destructive`)
- Nawigacja (sidebar, pionowe menu sekcyjne) używa stylu subtelnego (`subtle`) — aktywny element ma być czytelny, ale nie dominujący
- Główne CTA (hero actions) muszą mieć wyższy priorytet wizualny niż stany `active` nawigacji i filtrów
- Jeśli potrzebny jest nowy styl zaznaczenia, dodaj go centralnie w UI primitive, nie jako ad-hoc wyjątek na pojedynczej stronie
