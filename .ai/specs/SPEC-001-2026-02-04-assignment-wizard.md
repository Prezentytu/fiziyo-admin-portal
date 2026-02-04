# Assignment Wizard - Wizard Przypisywania Zestawów Ćwiczeń

## Cel biznesowy

Wizard służy do **przypisywania zestawów ćwiczeń pacjentom**. Jest to główny flow pracy fizjoterapeuty w aplikacji - zamiast tworzyć program ćwiczeń od zera dla każdego pacjenta, fizjoterapeuta może:

1. Wybrać gotowy szablon z biblioteki
2. Dostosować go do potrzeb konkretnego pacjenta
3. Ustawić harmonogram (częstotliwość, okres)
4. Przypisać jednocześnie do wielu pacjentów

**Efekt końcowy:** Pacjent otrzymuje spersonalizowany zestaw ćwiczeń w aplikacji mobilnej.

## Punkty wejścia

| Miejsce | Tryb | Co jest predefiniowane |
|---------|------|------------------------|
| **Strona pacjenta** → "Przypisz zestaw" | from-patient | Pacjent jest już wybrany |
| **Strona zestawu** → "Przypisz pacjentom" | from-set | Zestaw jest już wybrany |
| **Dashboard** → "Przypisz zestaw" | from-patient | Nic nie jest predefiniowane |

## Architektura - 5 kroków wizarda

```
KROK 1        KROK 2         KROK 3           KROK 4        KROK 5
●─────────────○─────────────○───────────────○─────────────○
Zestaw       Pacjenci    Personalizacja   Harmonogram   Podsumowanie
```

### Krok 1: Wybór zestawu ćwiczeń

**Layout:** Lista zestawów (lewa) + Podgląd/Builder (prawa)

**Tryby pracy:**
- **Template Mode** - wybrano szablon z ćwiczeniami
  - Nazwa: tylko do odczytu
  - Ćwiczenia: można tylko ukrywać (Eye/EyeOff)
  - Przycisk "Dostosuj" → tworzy kopię
  
- **Draft Mode** - nowy zestaw lub po "Dostosuj"
  - Nazwa: edytowalna
  - Pełny CRUD na ćwiczeniach
  - Rapid Builder (wyszukiwarka + Enter)
  - Checkbox "Zapisz jako szablon"

### Krok 2: Wybór pacjentów

- Wyszukiwanie pacjentów
- Multi-select
- Badge "Przypisany" dla już przypisanych
- Możliwość odpisania z listy

### Krok 3: Personalizacja (opcjonalny)

- Zmiana parametrów (serie, powtórzenia, czas)
- Notatki dla pacjenta
- Ukrywanie pojedynczych ćwiczeń

### Krok 4: Harmonogram

- Data rozpoczęcia/zakończenia
- Częstotliwość (ile razy dziennie)
- Dni tygodnia
- Przerwy między seriami

### Krok 5: Podsumowanie

- Przegląd wybranych opcji
- Przycisk "Przypisz do X pacjentów"
- Dialog sukcesu z QR kodem

## Kluczowe funkcjonalności

### Phantom Set (Natychmiastowe tworzenie)

Przycisk "Stwórz nowy" natychmiast tworzy pusty zestaw:
- `"Terapia dla {Pacjent} - {Data}"` (jeśli pacjent predefiniowany)
- `"Nowy zestaw - {Data}"` (bez pacjenta)

**Smart Draft Logic:** Jeśli pusty szkic z dzisiaj istnieje → otwiera go zamiast duplikatu.

### Rapid Builder

Command Bar z wyszukiwarką:
1. Wpisz nazwę ćwiczenia
2. Strzałka ↓ do nawigacji
3. Enter → ćwiczenie dodane z domyślnymi parametrami

### Template Protection

Szablony są chronione przed przypadkową edycją. "Dostosuj" tworzy kopię (Fork).

## Komponenty

| Komponent | Lokalizacja | Opis |
|-----------|-------------|------|
| AssignmentWizard | `src/components/assignment/AssignmentWizard.tsx` | Główny kontener wizarda |
| StepSetSelection | `src/components/assignment/steps/StepSetSelection.tsx` | Krok 1 |
| StepPatientSelection | `src/components/assignment/steps/StepPatientSelection.tsx` | Krok 2 |
| StepPersonalization | `src/components/assignment/steps/StepPersonalization.tsx` | Krok 3 |
| StepSchedule | `src/components/assignment/steps/StepSchedule.tsx` | Krok 4 |
| StepSummary | `src/components/assignment/steps/StepSummary.tsx` | Krok 5 |
| RapidBuilder | `src/components/assignment/RapidBuilder.tsx` | Szybkie dodawanie ćwiczeń |

## Data-testid

```
assign-wizard-container
assign-wizard-step-{1-5}
assign-wizard-next-btn
assign-wizard-back-btn
assign-wizard-submit-btn

assign-set-list
assign-set-card-{id}
assign-set-create-new-btn
assign-set-customize-btn

assign-patient-list
assign-patient-search-input
assign-patient-item-{id}
assign-patient-selected-count

assign-schedule-start-date
assign-schedule-end-date
assign-schedule-frequency-input
assign-schedule-weekday-{day}
```

## Metryki sukcesu

| Metryka | Cel |
|---------|-----|
| Czas przypisania standardowego | < 30 sekund |
| Czas tworzenia nowego zestawu | < 60 sekund |
| Liczba kliknięć do przypisania | ≤ 5 |
| Błędy "zniszczenia szablonu" | 0 |

## Changelog

### 2026-02-04
- Migracja dokumentacji do formatu SPEC
- Utworzenie specyfikacji na podstawie `docs/assignment-wizard-overview.md`
