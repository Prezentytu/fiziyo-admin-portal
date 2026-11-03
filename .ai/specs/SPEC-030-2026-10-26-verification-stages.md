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

W etapie Instrukcja panel nagrania i zdjęć podąża za czytanym tekstem: fokus w polu kroku pokazuje duże zdjęcie przypięte do tego kroku (gdy jest), a fokus w opisie wraca do nagrania. Wybrane medium wylicza się z bieżącego stanu przy każdym renderze (`resolveFocusedMedia`), także od razu po wejściu w etap; ręczna zmiana w galerii w etapie Instrukcja wyłącza podążanie do następnego fokusu w tekście; przeglądanie galerii w innych etapach go nie rusza, a każde wejście w Instrukcję włącza je z powrotem. Krok bez zdjęcia pokazuje nagranie, a gdy go nie ma, pusty stan galerii zamiast zdjęcia innego kroku. Opis bez nagrania zostawia zdjęcia do przeglądania. Pod panelem stoi tekst kroku i akcja „Zdjęcie nie pasuje do opisu”, która otwiera wymianę tego zdjęcia w etapie Materiał. Kroki to prosta numerowana lista pól bez miniatur i bez przypinania zdjęć (iteracja 4: zdjęć kroków nie mamy); istniejące piny z danych nadal działają w panelu. Logika: `describeReadingFocus` (`utils/stepMedia.ts`); `MediaGallery` przyjmuje opcjonalne `selectedIndex` / `onSelectedIndexChange`.

### Logika (czyste funkcje, testy Vitest)

| Plik                           | Co liczy                                                                                                       |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `utils/parameterRules.ts`      | Limity i typowe zakresy, poziom każdego pola, czas całego ćwiczenia, strona ciała ×2, liczby w opisie pacjenta |
| `utils/verificationStages.ts`  | Uwagi per etap, które etapy są otwarte, czy można opublikować (zawiera dotychczasowe minima opisów)            |
| `utils/stepMedia.ts`           | Przypięcie zdjęć do kroków i faz do wskazówek, przesuwanie indeksów po usunięciu                               |
| `utils/instructionProposal.ts` | Propozycja agenta jako blok do „Wstaw / Pomiń” zamiast cichego scalania                                        |
| `utils/changeSummary.ts`       | „Twoja zmiana” w podsumowaniu decyzji; liczniki pomijają puste pozycje                                         |
| `utils/extraContent.ts`        | Pola karty ćwiczenia spoza etapów (test pilnuje, że każde pole schematu enrichment ma miejsce)                 |

### Zakresy parametrów (założenia produktu, do strojenia przez fizjoterapeutów)

| Pole                   | Limit | Typowo   | „Ustaw” |
| ---------------------- | ----- | -------- | ------- |
| Serie                  | 20    | 2–5      | 3       |
| Powtórzenia            | 200   | 6–20     | 12      |
| Czas powtórzenia       | 60 s  | 2–6 s    | 3 s     |
| Czas utrzymania        | 300 s | 10–60 s  | 30 s    |
| Przerwa między seriami | 600 s | 30–120 s | 60 s    |

Czas ćwiczenia liczy `calculateExerciseTotalSeconds` (`src/utils/exerciseTime.ts`), ten sam wzór co katalog i player: czas powtórzenia → `duration` jako czas serii → tempo → 3 s, plus mikroprzerwy między powtórzeniami, przerwy między seriami, czas przygotowania i ×2 przy „Na każdą stronę”. Licznik „Czas ćwiczenia ≈ N min” stoi w prawym górnym rogu karty parametrów. Powyżej 15 min ostrzeżenie („OK” wiąże się z liczbą sekund; każda zmiana czasu otwiera je ponownie), powyżej 60 min blokada.

Poziomy: powyżej limitu albo brak wymaganej wartości = „Błąd” (czerwony, blokuje, bez „OK”); poza typowym zakresem = „Sugestia” (miękki pomarańcz pod polem, krótko „Mało/Dużo, zwykle a–b”, z „Ustaw N” albo „OK”; potwierdzenie żyje w sesji). Nie ma przełącznika trybu: zawsze są pola seria, powtórzenia w serii, czas jednego powtórzenia, przerwa. Tryb wynika z wartości (`deriveExecutionMode`): 1 powtórzenie i czas ≥ 10 s to utrzymanie pozycji, z typowym zakresem czasu 10–60 s (albo legacy `duration` bez `executionTime`). Kontrakt danych się nie zmienia.

### Decyzje

| Decyzja                                                                       | Dlaczego                                                                                                       |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Brak „Odrzuć” na ekranie globalnym                                            | Ćwiczenie się poprawia, nie odrzuca. Wyjścia: publikacja, „Odłóż na później”, „To duplikat”.                   |
| „To duplikat” = `rejectExercise(POTENTIAL_DUPLICATE)` z notatką o celu        | Backend nie ma scalania ćwiczeń; copy mówi uczciwie, że ćwiczenie znika z listy, a autor dostaje wskazanie.    |
| Publikacja z paska, bez dialogu                                               | Etapy są potwierdzeniem; dialog dublował decyzję. Publikacja zablokowana, dopóki jakiś etap ma uwagi.          |
| Bez checkboxów „sprawdziłem” i bez `⌘D`, `Esc` nie pomija                     | Przycisk etapu jest potwierdzeniem; `Esc` zamyka dialogi, a pomijanie ćwiczenia jednym klawiszem gubiło pracę. |
| Wymiana zdjęcia w miejscu: `UpdateExercise(images)` z data URL na indeksie    | Backend zapisuje data URL jako nowy blob i zachowuje kolejność; stary blob usuwany `DeleteExerciseImage`.      |
| Nowe zdjęcie od agenta wymaga „Przyjmij”                                      | Fizjoterapeuta porównuje je z nagraniem przed zapisem.                                                         |
| Okładki nie zmieniamy                                                         | `imageUrl`/`thumbnailUrl` nie są edytowalne bez backendu.                                                      |
| „Opis dla fizjoterapeuty” w etapie Bezpieczeństwo                             | To pole (`clinicalDescription`, min. 20 znaków) było wymagane do publikacji, a canvas go nie miał.             |
| Bez słowa „kliniczny” w copy weryfikacji                                      | Decyzja Adama.                                                                                                 |
| Pozostałe treści karty edytowalne w etapie Decyzja, bez wpływu na bramkę      | Weryfikator nie może zatwierdzić treści, której nie widział; te pola nie blokują publikacji.                   |
| Przerwa między powtórzeniami i czas przygotowania w etapie Parametry          | Wchodzą do czasu ćwiczenia, więc weryfikator musi je widzieć obok licznika.                                    |
| „Przerwij, gdy…” jako tekst, nie chipy                                        | Aplikacja pacjenta pokazuje tekst z nagłówkami grup i pustymi liniami; chipy gubiły puste linie przy zapisie.  |
| Bramka liczy objawy (`countStopIfSymptoms`), bez nagłówków kończących się „:” | Nagłówek grupy to nie objaw.                                                                                   |
| Braki treści z `listContentGaps`, tak samo na karcie ćwiczenia                | Karta i bramka publikacji mają jedną listę wymagań.                                                            |
| Czas ćwiczenia formatem karty (`formatExerciseDuration`)                      | Weryfikacja i karta pokazują ten sam czas, np. „6 min 38 s”, a szacunek z „~”.                                 |
| Zapisane obciążenie spoza kilogramów pokazane przy polu kg                    | Mobile zapisuje gumę, RPE czy funty; pole kg tego nie pokaże, a wpis kg je zastępuje.                          |
| Materiał w bramce: tylko nagranie albo zdjęcie widoczne dla pacjenta          | Player pacjenta nie pokazuje `gifUrl`, więc sam GIF nie zdejmuje braku (`hasPatientVideo`).                    |
| Serie i powtórzenia tylko całkowite, ułamek blokuje publikację                | Player pacjenta liczy całe powtórzenia, a zegar weryfikacji obcina ułamek.                                     |

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
| `ExtraContentSection` (pod podsumowaniem decyzji)                                        | `src/features/verification/stages/` |
| `RequestChangesDialog` (tor organizacji)                                                 | `src/features/verification/stages/` |
| `Button` wariant `plain`                                                                 | `src/components/ui/button.tsx`      |

## Data-testid

Pełna lista w `docs/testing/data-testid-map.md` (sekcja 15, „Etapy weryfikacji globalnej”). Zachowane: `verification-back-btn`. Tor organizacji i moderacja cross-org renderują ten sam `VerificationWorkspace` z propem `organizationDecision` (zatwierdź w gabinecie, odeślij do poprawek z notatką w `RequestChangesDialog`, archiwizuj zweryfikowane); stary detal z `VerdictPanel` i `MasterVideoPlayer` usunięty.

Zdjęcie przy czytanym kroku ma test integracyjny `VerificationWorkspace.readingFocus.test.tsx` (cały workspace, bez backendu) i E2E VER01–VER04 w `fiziyo-tests` (`tests/logged/verification/step-photos.spec.ts`, tylko odczyt na DEV). Duże medium w panelu ma `verification-media-stage-{image|video}`.

## Poza zakresem (następne kroki)

- Ekran „Paczka sprawdzona” po ostatnim ćwiczeniu (dziś powrót do listy).
- Prawdziwe scalanie duplikatów i podobieństwo w backendzie.
- Automatyczne wykrywanie błędów na zdjęciach (dziś fizjoterapeuta ocenia sam).
- Liczba planów pacjentów w banerze zgłoszenia (brak pola w API).
- Zakresy parametrów zależne od typu ćwiczenia, ustalone z fizjoterapeutami.

## Changelog

- 2026-10-26: Pierwsza wersja (etapy, ocena parametrów, zdjęcia przy krokach, fazy wskazówek, duplikat).
- 2026-10-27: Testy zdjęć przy krokach (integracyjne i E2E), test ID dużego medium w panelu.
- 2026-11-03: Pozostałe treści karty w etapie Decyzja, przerwa między powtórzeniami i czas przygotowania w Parametrach, liczniki bez pustych pozycji, „Przerwij, gdy…” jako tekst, wspólne braki treści z kartą ćwiczenia, jeden format czasu, zapisane obciążenie spoza kg, wspólne etykiety pól (`enrichmentFieldLabels.ts`); sam GIF nie spełnia wymogu materiału, pola liczb w Parametrach trzymają wpisany ułamek, serie i powtórzenia tylko całkowite.
