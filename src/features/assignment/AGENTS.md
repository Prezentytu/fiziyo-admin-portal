# AGENTS.md — Assignment Wizard

## Zakres

5-krokowy wizard przypisywania zestawów ćwiczeń pacjentom. Główny flow pracy fizjoterapeuty.

## Architektura — 5 kroków

```
KROK 1        KROK 2         KROK 3           KROK 4        KROK 5
●─────────────○─────────────○───────────────○─────────────○
Zestaw       Pacjenci    Personalizacja   Harmonogram   Podsumowanie
```

## Kluczowe wzorce

### Template vs Draft Mode (Krok 1)

- **Template Mode** — wybrano szablon: nazwa tylko do odczytu, ćwiczenia można ukrywać, przycisk "Dostosuj" tworzy kopię
- **Draft Mode** — nowy zestaw lub po "Dostosuj": pełny CRUD, Rapid Builder, checkbox "Zapisz jako szablon"

### Phantom Set

Przycisk "Stwórz nowy" natychmiast tworzy pusty zestaw:

- `"Terapia dla {Pacjent} - {Data}"` (gdy pacjent predefiniowany)
- `"Nowy zestaw - {Data}"` (bez pacjenta)

**Smart Draft Logic**: Jeśli pusty szkic z dzisiaj istnieje → otwórz go zamiast duplikatu.

### Rapid Builder

Wyszukiwarka ćwiczeń + Enter dodaje ćwiczenie do zestawu. Szybkie budowanie bez wychodzenia z wizarda.

### Punkty wejścia

| Miejsce                               | Tryb         | Predefiniowane |
| ------------------------------------- | ------------ | -------------- |
| Strona pacjenta → "Przypisz zestaw"   | from-patient | Pacjent        |
| Strona zestawu → "Przypisz pacjentom" | from-set     | Zestaw         |
| Dashboard → "Przypisz zestaw"         | -            | Nic            |

## Struktura folderów (zgodna z .ai/STRUCTURE.md)

- **utils/** — logika czysta: `assignmentWizardUtils.ts` (canProceed), `selectSetStepUtils.ts` (filter/sort). Testy w **utils/**tests**/**.
- **types.ts** — typy domenowe i `getWizardSteps`; test: `types.test.ts` obok.
- **Komponenty** i testy komponentów (`.test.tsx`) — w korzeniu folderu obok plików.

## Komponenty

- `AssignmentWizard.tsx` — główny wizard
- `SelectSetStep.tsx`, `CustomizeSetStep.tsx` — krok 1
- `ScheduleStep.tsx` — harmonogram
- `SummaryStep.tsx` — podsumowanie
- `RapidExerciseBuilder.tsx` — szybkie dodawanie ćwiczeń

## Referencje

- Specyfikacja: [SPEC-001 Assignment Wizard](../../../.ai/specs/SPEC-001-2026-02-04-assignment-wizard.md)
- Dokumentacja: `docs/assignment-wizard-overview.md`
- Mapa data-testid: `docs/testing/data-testid-map.md`

## Konwencje data-testid

Prefiks: `assignment-`, `set-`
Przykłady: `assignment-wizard`, `assignment-step-1`, `assignment-submit-btn`, `set-rapid-builder-search`
