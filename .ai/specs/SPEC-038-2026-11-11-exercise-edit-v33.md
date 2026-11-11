---
spec: SPEC-038
repo: fiziyo-admin-portal
issues: []
prs: []
board:
---

# Edycja ćwiczenia w kontrakcie v3.3

## Cel biznesowy

Fizjoterapeuta, który poprawia ćwiczenie zapisane w kontrakcie v3.3 (FR-007, `KONTRAKT-v3.3.md` w `fiziyo-research`), zmienia tylko to, co zmienił, i nie może wpisać treści w pole wycofane. Dziś formularz podmienia cały dokument po przycięciu pustych wartości i pozwala wypełnić stare kolumny, więc po edycji rekord 3.3 ma dwie wersje prawdy (ryzyka 1 i 4 w `STRATEGIA-ZMIANY-SCHEMATU.md` §5).

To zmiana zapisu danych: drzwi jednokierunkowe. Rekord stary (bez `schemaVersion` 3.3) ma formularz i zapis bez zmian.

## Decyzje

1. **Wersję rozstrzyga czytnik.** `readExerciseContent(source).version` (kolumna `schemaVersion`, potem `enrichmentData.schemaVersion`, próg 3.3). Hook `useExerciseEditorForm` ustala wersję przy wczytaniu rekordu razem z bazą do porównań i oddaje ją jako `contentVersion`.
2. **Dokument 3.3 nie przechodzi przez `toV3` ani `compactEnrichment`.** `toV3` bez znacznika `$schema` buduje dokument z pięciu sekcji i gubi resztę, `compactEnrichment` przycina puste klucze. Szkic 3.3 to kopia tego, co przyszło z bazy (`loadV33Document`).
3. **Jedna funkcja zapisu.** `collectV33Edits(wczytany, szkic)` zwraca zmienione ścieżki, `buildV33Document(wczytany, zmiany)` nakłada je na kopię wczytanego dokumentu (`utils/enrichmentV33Document.ts`). Zmienić da się tylko ścieżki z `V33_EDITABLE_PATHS`. Skutki:
   - klucz, którego fizjoterapeuta nie ruszył, wraca do bazy bez zmian, także pusty (`null`, `[]`, `{}`, `""`) i spoza kontraktu; kolejność kluczy zostaje;
   - `schemaVersion` i `$schema` nie są na liście, więc nie mogą się zmienić; dokument bez `$schema` dostaje znacznik przy pierwszym zapisie zmiany, bo normalizator backendu bez niego przycina dokument;
   - sekcje zespołu (`provenance`, `lifecycle`, `classification`, `relations`, `media`, `prescription`, `ai`, `side`, `safety.pain_rule`, `safety.flags`) nie mają edytorów i przetrwają nawet wtedy, gdy szkic je zgubił;
   - pole wycofane dopisane do szkicu (AI, panel JSON, widok weryfikacji) nie jest zmianą i nie trafia do zapisu.
4. **Co jest przycinane.** Tylko to, co fizjoterapeuta edytował: tekst opróżniony usuwa swój klucz (sekcja nadrzędna zostaje, nawet pusta), lista opróżniona usuwa swój klucz, z edytowanej listy odpadają puste wiersze, teksty są przycinane z białych znaków. Biały znak na końcu tekstu i pusty wiersz dodany w formularzu nie są zmianą. W edytowanej liście wiersz nieruszony wraca w zapisanej postaci.
5. **Wiersze bogatsze niż tekst.** Punkt kontrolny i przeciwwskazanie edytują sam `text`, reszta kluczy wiersza (`evidence`, `view`) zostaje. Pozycja sprzętu edytuje `label`, `qty`, `required`, `substitutes`; `code` zostaje. Nowa pozycja sprzętu nie ma `code`.
6. **Kroki i wskazówki.** Usunięcie kroku albo wskazówki przesuwa zdjęcia (`step_images`) i fazy (`cue_phases`) przypięte po indeksie, tak jak dotąd `realignMediaForBlankEntries`.
7. **Kolumny wycofane.** Dla rekordu 3.3 `buildChangedCoreVariables` nie wysyła `description`, `clinicalDescription`, `notes`, `audioCue`, ani nowej wartości, ani `null`. Stare wartości zostają w bazie nietknięte. Guard jest w hooku, więc obowiązuje stronę ćwiczenia, dialog i workspace weryfikacji.
8. **Formularz 3.3** (`ExerciseContentSections` z `contentVersion="3.3"`): nie renderuje opisu dla pacjenta, opisu klinicznego, notatki, polecenia audio, `therapist.clinical_notes`, starych wskazań i przeciwwskazań, faz rehabilitacji, korzyści, notatek o progresji, starej listy `equipment`, `safety.intensity_guide` ani list `ai.*`. Dochodzą edytory: `patient.easier`, `patient.harder`, `breathing.text`, `safety.contraindications[]`, `therapist.checkpoints[]`, `therapist.note` (600 znaków, licznik), `equipment_items[]`.
9. **„Uzupełnij przez AI” zostaje włączone.** Z odpowiedzi generatora bierzemy tylko pola, które w 3.3 leżą w tym samym miejscu: podsumowanie, kroki, wskazówki, błędy, „po co”, „kiedy”, odczucia, „Przerwij, gdy”. Reszta odpowiedzi jest odrzucana. AI wypełnia wyłącznie puste pola, a zapis i tak przechodzi przez regułę z pkt 3.
10. **Panel „Zaawansowane (JSON)”** pokazuje dokument 3.3 bez szkieletu starych kluczy i odrzuca z komunikatem dokument, który nie niesie `schemaVersion` 3.3 lub wyższej. Zastosowany dokument zmienia tylko pola z pkt 3.

## Poza zakresem

- Kreator (`utils/createExerciseSubmit.ts`) dalej tworzy rekordy starego kształtu; o tym, kiedy nowe rekordy mogą być 3.3, decyduje przełącznik backendu.
- Parametry wykonania, media, tagi, link do filmu i kolumna sprzętu w parametrach: bez zmian. Kolumnę `Equipment` backend liczy z `equipment_items`, a `VideoUrl` dubluje `enrichment.media[]` (kontrakt §4); pola formularza dla tych kolumn zostają do decyzji po stronie backendu.
- Edytory sekcji zespołu i pól, które macierz (`golden-matrix.json`, widok `edycja`) oznacza jako edytowalne, ale wymagają słownika: `classification.*`, `prescription.*`, `side.*`, `safety.pain_rule`, `safety.flags`, `relations`.
- Widok odczytu ćwiczenia i etapy weryfikacji dla 3.3. Workspace weryfikacji nadal pokazuje pola wycofane; wpis w takim polu na rekordzie 3.3 nie jest zapisywany.

## Interfejsy

| Element                                                                               | Lokalizacja                                                                                      | Opis                                           |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| `collectV33Edits`, `buildV33Document`, `V33_EDITABLE_PATHS`                           | `src/features/exercises/utils/enrichmentV33Document.ts`                                          | reguła zapisu dokumentu 3.3                    |
| `pickV33AiFill`, `mergeV33AiFill`, `parseV33JsonDocument`, `acceptTherapistNoteInput` | jw.                                                                                              | AI, panel JSON, limit uwag                     |
| `useExerciseEditorForm` → `contentVersion`                                            | `src/features/exercises/useExerciseEditorForm.ts`                                                | wersja ustalona przy wczytaniu; zapis 3.3      |
| `buildChangedCoreVariables(initial, current, contentVersion)`                         | jw.                                                                                              | bez kolumn wycofanych dla 3.3                  |
| `TextItemsEditor`, `TherapistNoteField`, `EquipmentItemsEditor`                       | `src/features/exercises/ExerciseV33Editors.tsx`                                                  | edytory pól 3.3                                |
| prop `contentVersion`                                                                 | `ExerciseContentSections`, `ExercisePatientContentFields`, sekcje w `ExerciseDetailSections.tsx` | domyślnie `legacy`, czyli dzisiejszy formularz |

Mutacja bez zmian: `updateExercise` z `enrichmentDataJson` (cały dokument). Kontrakt GraphQL nietknięty.

## Ryzyka

- Zapis nadal podmienia cały dokument w bazie. Gdy ktoś inny zmieni rekord między wczytaniem a zapisem (import paczki, „podnieś”), jego zmiana zostanie nadpisana wczytaną wersją. Tak jest też dziś; naprawa wymaga zapisu ścieżek albo wersjonowania po stronie backendu.
- Normalizator backendu nie był sprawdzany w tej zmianie. Jeżeli przycina dokument na zapisie, reguła z portalu tego nie zatrzyma (ryzyko 2 strategii).
- Nowa pozycja sprzętu bez `code`: do potwierdzenia, czy walidator i wyliczanie kolumny `Equipment` to przyjmują.

## Verification plan

- Unit: `utils/__tests__/enrichmentV33Document.test.ts` (każda ścieżka edytowalna, opróżnione teksty i listy, klucze nieruszone i puste, klucze wiersza, `code`, wersja, AI, panel JSON, limit uwag).
- Hook i formularz: `__tests__/exerciseEditorV33.test.tsx` (zmienne mutacji, kolumny wycofane, pola formularza 3.3, AI, panel JSON), `__tests__/exerciseEditorLegacyPin.test.tsx` (rekord stary bez zmian).
- Ręcznie przed merge: zapis rekordu z paczki p001 na lokalnej instancji i porównanie dokumentu w bazie przed i po (przeglądarka + baza).
- E2E (`fiziyo-tests`): edycja ćwiczenia 3.3 na DEV, sprawdzenie w bazie, że klucze spoza formularza zostały; nowe `data-testid` w `docs/testing/data-testid-map.md`.

## Changelog

### 2026-11-11

- Pierwsza wersja: reguła zapisu 3.3, formularz 3.3, AI i panel JSON, testy.
