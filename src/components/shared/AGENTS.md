# AGENTS.md — Komponenty współdzielone

## Zakres

Komponenty reużywalne używane w wielu modułach. Preferuj import z `@/components/shared` przed tworzeniem nowych.

## Kluczowe komponenty

### PageShell / PageHeader / PageHero / StatTiles

Jeden szkielet stron listowych i ustawień (`src/components/shared/page/`). Listy kliniczne: `PageHeader` + `PageHero` + `StatTiles` + `SearchInput`. Settings/org: `PageShell variant="split"`. Pełny bleed (builder): `variant="fullBleed"`.

### ExerciseSetBuilder

Builder zestawu ćwiczeń — listowanie, dodawanie, edycja, usuwanie ćwiczeń w zestawie. Współdzielony przez CreateSetWizard i Assignment Wizard.

### ExerciseExecutionCard

Jedyny bazowy komponent poziomego kafelka/paska ćwiczenia (miniatura + nazwa + podstawowe parametry + akcje). Używaj go we wszystkich flow wymagających listy ćwiczeń zamiast tworzyć lokalne warianty.

### fieldContract + displayRegistry + ExerciseParametersFields

SSOT semantyki pól ćwiczenia: etykiety (`displayRegistry.ts`), tier/surfaces/sekcje/zod (`fieldContract.ts` + `PARAMETER_SECTIONS`). Jedyna prezentacja edycji parametrów: `ExerciseParametersFields.tsx` — powierzchnie (template/mapping/patientPlan/patientOverride) derywują podzbiór, `omitFields`, `density` i `testIdFor`, nigdy lokalnych etykiet, kolejności sekcji ani reguł walidacji.

- `duration` jest w `DEPRECATED_FIELD_KEYS` — nie renderuj jako input; pokaż legacy clear gdy wartość > 0.
- `mappingOverrides.ts` — warstwa `overridesJson` na mappingu (SPEC-023/024, zawsze włączona); resolver: assignment > mapping JSON > columns > template.
- Treść pacjenta (kroki/cues/safety): `contentContract.ts` + `enrichmentOverride.ts` + `ExercisePatientContentFields` (SPEC-024). Karta ma collapsible „Instrukcje dla pacjenta”; delta leci w `overridesJson.enrichment` / `exerciseOverrides[].enrichment`.

### LabeledStepper

Krokowy wskaźnik (np. 1/5, 2/5). Używany w wizardach.

### ConfirmDialog

Dialog potwierdzenia z Cmd+Enter i Escape (`useDialogShortcuts`).

### EmptyState / ErrorState / ListSkeleton

Stan pusty, błąd z retry oraz szkielet listy. Nie używaj ad-hoc `<p className="text-destructive">`.

### LoadingState

Loader podczas ładowania.

### SearchInput

Pole wyszukiwania z debounce, `aria-label` i `data-testid` (`page-search-input` albo specyficzny testid listy).

### ScheduleSummary

Wspólny komponent read-only harmonogramu (`compact` / `card` / `inline-highlight`) dla Assignment Wizard, kart pacjenta i detali zestawów.

### Inne

- `AccessGuard` — ochrona dostępu (rola/organizacja)
- `FileUpload` — upload plików
- `ColorBadge` — badge z kolorem
- `ErrorBoundary` — montowany w `DashboardShell`

## Import

```typescript
import { EmptyState, ErrorState, ConfirmDialog, SearchInput } from '@/components/shared';
import { PageShell, PageHeader, PageHero, StatTiles } from '@/components/shared/page';
import { ExerciseSetBuilder } from '@/components/shared';
```

## Zasady

- Sprawdź `index.ts` przed tworzeniem nowego — eksportuj przez index
- Preferuj komponenty z `@/components/ui/` (shadcn) i `shared` przed nowymi
- Każdy interaktywny element: `data-testid`
- Dla pasków/kafelków ćwiczeń obowiązuje `ExerciseExecutionCard` + adaptery z `shared/exercise`
- Nie wprowadzaj terminów „ćwiczenie czasowe/powtórzeniowe” w UI; używaj modelu `executionTime` i komunikatów o timerze
- Listy kliniczne buduj kartami / siatką, nie tabelą danych

## Standaryzacja active / selected

- Używaj jednego contractu stanów `active/selected` przez wspólne komponenty (`@/components/ui/*`) zamiast lokalnych klas `data-[state=active]` w feature'ach
- Dla zakładek używaj wariantów `TabsTrigger` (`activeVariant`: `surface`, `subtle`, `accent`, `success`, `warning`, `destructive`)
- Nawigacja (sidebar, pionowe menu sekcyjne) używa stylu subtelnego (`subtle`) — aktywny element ma być czytelny, ale nie dominujący
- Główne CTA (hero actions) muszą mieć wyższy priorytet wizualny niż stany `active` nawigacji i filtrów
- Jeśli potrzebny jest nowy styl zaznaczenia, dodaj go centralnie w UI primitive, nie jako ad-hoc wyjątek na pojedynczej stronie
