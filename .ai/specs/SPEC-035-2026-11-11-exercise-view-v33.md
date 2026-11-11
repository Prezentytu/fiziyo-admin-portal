---
spec: SPEC-035
repo: fiziyo-admin-portal
issues: []
prs: []
board:
---

# Widok ćwiczenia czyta treść v3.3

## Cel biznesowy

Fizjoterapeuta otwiera ćwiczenie zapisane w kontrakcie v3.3 (FR-007) i widzi całą treść, którą wolno mu widzieć: instrukcję raz, a nie dwa razy, oraz oddech, „Łatwiej”/„Trudniej”, przeciwwskazania, regułę bólu, punkty kontrolne, uwagi kliniczne i sprzęt z liczbą sztuk. Rekord stary wygląda tak jak dotąd.

## Decyzje

- Tryb odczytu sekcji w `src/features/exercises/ExerciseDetailSections.tsx` bierze treść z `readExerciseContent` (`src/components/shared/exercise/readExerciseContent.ts`). O tym, czy rekord jest stary, czy 3.3, decyduje wyłącznie czytnik (`schemaVersion`).
- Rekord 3.3: nie pokazujemy kolumn `patientDescription` i `clinicalDescription`, nawet gdy są wypełnione (rekord podniesiony mechanicznie). Nie czytamy też kluczy, które kontrakt wycofał: `therapist.indications`, `therapist.contraindications`, `therapist.clinical_notes`, `therapist.progression_notes`, `safety.intensity_guide`, lista `equipment`.
- `therapist.rehab_phases` i `therapist.clinical_benefits` nie są na liście wycofanych w kontrakcie, więc zostają widoczne w obu wersjach.
- Nowe bloki, tylko gdy pole ma treść (bez pustych nagłówków):
  - „Odczucia i typowe błędy”: Oddech (`breathing.text`), Łatwiej, Trudniej (`patient.easier`, `patient.harder`).
  - „Bezpieczeństwo”: Przeciwwskazania (`safety.contraindications`), Reguła bólu (`safety.pain_rule`, kod bez tłumaczenia).
  - „Dla fizjoterapeuty”: Uwagi kliniczne (`therapist.note`), Punkty kontrolne (sam tekst, bez kodów `evidence` i `view`), Wskazania (`classification.indications`).
  - „Metadane i wyszukiwanie”: sprzęt z `equipment_items` jako lista: nazwa, „× n” powyżej jednej sztuki, „wymagany” albo „opcjonalny”, „Zamienniki: …” (`utils/equipmentItemText.ts`).
- Wskazania i reguła bólu to kody ze słownika. Portal nie ma jeszcze etykiet słownika, więc pokazuje kod bez zmian.
- Kroki i wskazówki z fazą (`ExerciseExecutionSteps`, `ExerciseAudioCues`) zostają bez zmian: leżą w tym samym miejscu w obu wersjach, a zdjęcia kroków i fazy wskazówek wiążą się z pozycją na zapisanej liście, którą czytnik po odsianiu pustych wpisów by przesunął.
- Pola zespołu (`provenance`, `lifecycle`, wyniki audytu, zakres użycia mediów) nie są pokazywane; notatki wewnętrzne zostają w istniejącym `InternalNotesPanel`.
- Edycja bez zmian. Gałęzie `editable` w sekcjach nie są dotknięte.

## Poza zakresem

Edycja pól v3.3, etykiety słownika (wskazania, reguła bólu, flagi), flagi bezpieczeństwa, zakresy parametrów i progresja z `prescription`, klasyfikacja, strona w mediach, wydruk i podglądy w zestawach (osobna zmiana).

## Verification plan

- Unit: `src/features/exercises/__tests__/exerciseDetailReadContent.test.tsx` (rekord stary: tekst każdej sekcji przypięty przed zmianą; rekord 3.3: każdy nowy blok, brak starych opisów, brak pól zespołu; rekord podniesiony mechanicznie), `src/features/exercises/utils/__tests__/equipmentItemText.test.ts`.
- E2E (`fiziyo-tests`): brak nowych scenariuszy krytycznych; istniejące `data-testid` zachowane, nowe opisane w `docs/testing/data-testid-map.md`.

## Changelog

### 2026-11-11

- Tryb odczytu widoku ćwiczenia przez wspólny czytnik treści; nowe bloki dla rekordu 3.3.
