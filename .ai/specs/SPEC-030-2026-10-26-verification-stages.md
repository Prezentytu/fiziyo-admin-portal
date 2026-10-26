---
spec: SPEC-030
repo: fiziyo-admin-portal
issues: []
prs: []
board:
---

# Weryfikacja ćwiczeń: etapy i ocena parametrów

## Cel biznesowy

Fizjoterapeuci weryfikują, poprawiają i zatwierdzają ćwiczenia, zanim trafią do bazy globalnej. Do bazy ma trafiać tylko ćwiczenie poprawione do końca, a nie odrzucone z uwagami. Dotychczasowy ekran sprawdzał tylko obecność pól, więc „Przysiad 100 serii × 1000 powtórzeń” świecił na zielono.

Źródło wyglądu: canvas „Weryfikacja ćwiczeń” (https://claude.ai/artifact/QEymT1yHPTQasny1NCNRLu), zatwierdzony przez Adama 2026-10-26. Bez zmian backendu.

## Architektura

Ekran `src/app/(dashboard)/verification/[id]/page.tsx` ładuje dane i adresy kolejki, a całą pracę robi `VerificationWorkspace` (klucz = id ćwiczenia, więc stan etapów resetuje się przy kolejnym ćwiczeniu). Autosave bez zmian: `useExerciseEditorForm` (900 ms), `UpdateExercise` dla pól ćwiczenia i `UpdateExerciseField(enrichmentData)` dla danych v3.

Pięć etapów w stałej kolejności: **Materiał → Parametry → Instrukcja → Bezpieczeństwo → Decyzja**. Lewa kolumna to przyklejony panel nagrania i zdjęć (`MediaGallery`), prawa to bieżący etap, na dole pływający pasek z jedną akcją główną (`⌘↵`).

### Logika (czyste funkcje, testy Vitest)

| Plik                           | Co liczy                                                                                                       |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `utils/parameterRules.ts`      | Limity i typowe zakresy, poziom każdego pola, czas całego ćwiczenia, strona ciała ×2, liczby w opisie pacjenta |
| `utils/verificationStages.ts`  | Uwagi per etap, które etapy są otwarte, czy można opublikować (zawiera dotychczasowe minima opisów)            |
| `utils/stepMedia.ts`           | Przypięcie zdjęć do kroków i faz do wskazówek, przesuwanie indeksów po usunięciu                               |
| `utils/instructionProposal.ts` | Propozycja agenta jako blok do „Wstaw / Pomiń” zamiast cichego scalania                                        |
| `utils/changeSummary.ts`       | „Twoja zmiana” w podsumowaniu decyzji                                                                          |

### Zakresy parametrów (założenia produktu, do strojenia przez fizjoterapeutów)

| Pole                   | Limit | Typowo   | „Ustaw” |
| ---------------------- | ----- | -------- | ------- |
| Serie                  | 20    | 2–5      | 3       |
| Powtórzenia            | 200   | 6–20     | 12      |
| Czas powtórzenia       | 60 s  | 2–6 s    | 3 s     |
| Czas utrzymania        | 300 s | 10–60 s  | 30 s    |
| Przerwa między seriami | 600 s | 30–120 s | 60 s    |

Czas ćwiczenia liczy `calculateExerciseTotalSeconds` (`src/utils/exerciseTime.ts`), ten sam wzór co katalog i player: czas powtórzenia → `duration` jako czas serii → tempo → 3 s, plus mikroprzerwy między powtórzeniami, przerwy między seriami, czas przygotowania i ×2 przy „Na każdą stronę”. Powyżej 15 min ostrzeżenie („Tak ma być” wiąże się z liczbą sekund; każda zmiana czasu otwiera je ponownie), powyżej 60 min blokada.

Poziomy: powyżej limitu albo brak wymaganej wartości = „Do poprawy” (blokuje, bez „Tak ma być”); poza typowym zakresem = „Sprawdź” (popraw albo „Tak ma być”, potwierdzenie żyje w sesji). Tryb „Utrzymanie pozycji” = 1 powtórzenie + `executionTime` jako czas utrzymania (albo legacy `duration` bez `executionTime`); puste powtórzenia z czasem powtórzenia to tryb powtórzeń. Przełączenie trybu nie zapisuje połowicznych wartości i da się je cofnąć.

### Decyzje

| Decyzja                                                                    | Dlaczego                                                                                                       |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Brak „Odrzuć” na ekranie globalnym                                         | Ćwiczenie się poprawia, nie odrzuca. Wyjścia: publikacja, „Odłóż na później”, „To duplikat”.                   |
| „To duplikat” = `rejectExercise(POTENTIAL_DUPLICATE)` z notatką o celu     | Backend nie ma scalania ćwiczeń; copy mówi uczciwie, że ćwiczenie znika z listy, a autor dostaje wskazanie.    |
| Publikacja z paska, bez dialogu                                            | Etapy są potwierdzeniem; dialog dublował decyzję. Publikacja zablokowana, dopóki jakiś etap ma uwagi.          |
| Bez checkboxów „sprawdziłem” i bez `⌘D`, `Esc` nie pomija                  | Przycisk etapu jest potwierdzeniem; `Esc` zamyka dialogi, a pomijanie ćwiczenia jednym klawiszem gubiło pracę. |
| Wymiana zdjęcia w miejscu: `UpdateExercise(images)` z data URL na indeksie | Backend zapisuje data URL jako nowy blob i zachowuje kolejność; stary blob usuwany `DeleteExerciseImage`.      |
| Nowe zdjęcie od agenta wymaga „Przyjmij”                                   | Fizjoterapeuta porównuje je z nagraniem przed zapisem.                                                         |
| Okładki nie zmieniamy                                                      | `imageUrl`/`thumbnailUrl` nie są edytowalne bez backendu.                                                      |
| „Opis dla fizjoterapeuty” w etapie Bezpieczeństwo                          | To pole (`clinicalDescription`, min. 20 znaków) było wymagane do publikacji, a canvas go nie miał.             |
| Bez słowa „kliniczny” w copy weryfikacji                                   | Decyzja Adama.                                                                                                 |

## Interfejsy

### GraphQL

Bez zmian kontraktu. Używane: `GetExerciseByIdForAdmin`, `GetVerificationQueueNavigator`, `GetVerificationQueuePage(filter: "published")` (szukanie duplikatu), `ApproveExercise`, `RejectExercise`, `UpdateExercise`, `UpdateExerciseField`, `UploadExerciseImage`, `DeleteExerciseImage`.

### enrichmentData v3 (additive)

Nowe, opcjonalne klucze w `patient` (backend zostawia v3 bez zmian, klienci bez obsługi je ignorują):

```json
{
  "patient": {
    "step_images": [{ "step": 1, "url": "https://…/a.jpg" }],
    "cue_phases": [{ "cue": 0, "phase": "preparation" }]
  }
}
```

- `step` liczony od 1 (numer kroku, który widzi pacjent), `url` = wpis z `Exercise.images`.
- `cue` = indeks w `patient.cues`, `phase` ∈ `preparation | work | rest`; brak wpisu = `work`.
- Puste kroki i wskazówki są usuwane przy opuszczeniu pola, żeby indeksy nie rozjechały się z zapisem (`cleanupEnrichment` wycina puste stringi z tablic).

Mobile: do obsługi w `fizjo-app` (handoff), do tego czasu bez zmian dla pacjenta.

## Komponenty UI

| Komponent                                                                                | Lokalizacja                         |
| ---------------------------------------------------------------------------------------- | ----------------------------------- |
| `VerificationWorkspace`                                                                  | `src/features/verification/`        |
| `VerificationStageNav`, `VerificationFloatingBar`, `StageSection`, `ChipListEditor`      | `src/features/verification/stages/` |
| `MaterialStage`, `PhotoReplaceDialog`                                                    | `src/features/verification/stages/` |
| `ParametersStage`, `InstructionStage`, `SafetyStage`, `DecisionStage`, `DuplicateDialog` | `src/features/verification/stages/` |
| `Button` wariant `plain`                                                                 | `src/components/ui/button.tsx`      |

## Data-testid

Pełna lista w `docs/testing/data-testid-map.md` (sekcja 15, „Etapy weryfikacji globalnej”). Zachowane: `verification-back-btn`. Ścieżki organizacji (`VerdictPanel`, `MasterVideoPlayer`, dialogi approve/reject) bez zmian.

## Poza zakresem (następne kroki)

- Ekran „Paczka sprawdzona” po ostatnim ćwiczeniu (dziś powrót do listy).
- Prawdziwe scalanie duplikatów i podobieństwo w backendzie.
- Automatyczne wykrywanie błędów na zdjęciach (dziś fizjoterapeuta ocenia sam).
- Liczba planów pacjentów w banerze zgłoszenia (brak pola w API).
- Zakresy parametrów zależne od typu ćwiczenia, ustalone z fizjoterapeutami.

## Changelog

- 2026-10-26: Pierwsza wersja (etapy, ocena parametrów, zdjęcia przy krokach, fazy wskazówek, duplikat).
