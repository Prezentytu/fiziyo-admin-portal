---
spec: SPEC-035
repo: fiziyo-admin-portal
issues: []
prs: []
board:
---

# Centrum weryfikacji dla ćwiczeń w kontrakcie v3.3

## Cel biznesowy

Weryfikator ogląda ćwiczenie w kontrakcie v3.3 (FR-007, paczka p001) i widzi każdy fakt tam, gdzie go szuka, a jego poprawka trafia w jedno miejsce z kontraktu. Bez tej zmiany etap Bezpieczeństwo pokazuje puste przeciwwskazania, bramki żądają wycofanych opisów, a zapis dopisuje kopie w wycofanych polach.

Kontrakt i macierz są poza repo: `fiziyo-research/feature-requests/FR-007-schemat-v3/` (`KONTRAKT-v3.3.md`, `golden-matrix.json`, `PLAN-BRAMKI-2026-11-11.md` §G1). Zmiana stoi na wspólnym czytniku z PR #220 (`readExerciseContent`).

## Decyzje

- **Wersję rozstrzyga `readExerciseContent`.** Rekord stary (bez `schemaVersion` albo poniżej 3.3) zachowuje dotychczasowe zachowanie co do pola; przypina je `VerificationWorkspace.legacyContent.test.tsx`.
- **Etap dla faktu bierzemy z macierzy** (`golden-matrix.json`, pole `etap`): Materiał, Parametry, Instrukcja, Bezpieczeństwo, Decyzja.
- **Edycja jest wąska.** Weryfikator edytuje to, co dotąd (nazwa, kroki, wskazówki z fazą, błędy, podsumowanie, odczucia, „dlaczego”, „kiedy”, „Przerwij, gdy”, nadzór, słowa kluczowe, parametry w kolumnach), oraz przeciwwskazania w `safety.contraindications`. Reszta faktów kontraktu jest tylko do odczytu z podpowiedzią, że zmienia się je w formularzu ćwiczenia. Macierz oczekuje edycji każdego pola; brakujące komórki są w sekcji „Poza zakresem”.
- **Zapis nie gubi kluczy.** Dla 3.3 ładunek to głęboka kopia wczytanego dokumentu z podmienionymi tylko edytowanymi ścieżkami (`utils/contentV33.ts`, `V33_EDITABLE_PATHS`). Ścieżka jest edytowana, gdy jej oczyszczona wartość różni się od wczytanej; wyczyszczone pole traci klucz. `schemaVersion`, `$schema`, `null` i puste listy zostają jak były. Zapis nigdy nie pisze do `therapist.*` ani `equipment`.
- **Wycofane kolumny opisu nie wychodzą z panelu.** Dla 3.3 `updateExercise` nie dostaje `description` ani `clinicalDescription`; pól tych nie ma na ekranie, także gdy kolumna została wypełniona po mechanicznym podniesieniu rekordu. Podpowiedzi dla AI (propozycja instrukcji, zdjęcie) dostają `patient.summary`.
- **Bramki 3.3** (`listContentGaps` z `v33`): materiał (nagranie albo zdjęcie), nazwa, co najmniej jeden krok w `patient.steps`. `safety.stop_if` jest w kontrakcie opcjonalne, opisy są wycofane, więc nie blokują. Bramka parametrów zostaje bez zmian.
- **Kompletność 3.3** (`ENRICHMENT_SECTIONS_V33`): podsumowanie, kroki, wskazówki, błędy, odczucia, dlaczego i kiedy, łatwiej i trudniej, oddech, „Przerwij, gdy”, reguła bólu, przeciwwskazania, punkty kontrolne, wskazania, sprzęt, słowa kluczowe. `therapist.note` nie wchodzi do licznika (kontrakt: domyślnie puste).
- **Widoczność.** Klasyfikację, klucz i powiązania widzi każdy weryfikator; źródła, zakres użycia mediów, dostępność, status i wynik audytu tylko zespół FiziYo (`useSystemRole().canReviewExercises`, jak notatki robocze).
- **Kody ze słownika pokazujemy jak zapisane** (wskazania, flagi, klasyfikacja, reguła bólu): panel nie ma jeszcze ich nazw.
- **Parametry.** Lista parametrów i zakresy zostają osobnym zadaniem. Gdy `side.per_side_dose` jest prawdą, etap mówi „Serie i powtórzenia podane na jedną stronę”, a podsumowanie decyzji „na każdą stronę”. Gdy kolumna strony rozjedzie się z `side.mode`, etap pokazuje ostrzeżenie.

## Założenia (kontrakt nie rozstrzyga)

- Wymagane w bramce są tylko nazwa, materiał i kroki. Walidator puli (`export_v33.py`) wymaga więcej (wskazówki, punkty kontrolne, oddech, sprzęt), ale to reguła naszej puli, nie każdego rekordu gabinetu.
- Wyczyszczone pole usuwa klucz zamiast zapisywać pusty tekst albo pustą listę.
- `patient.step_images` zostaje edytowalne (wymiana zdjęć w weryfikacji), choć kontrakt opisuje media w `media[]`.
- Kolumny `notes` i `audioCue` są wycofane (§2), więc dla 3.3 nie mają pól.

## Poza zakresem

- Edycja w weryfikacji: `patient.easier`, `harder`, `breathing`, `safety.pain_rule`, `flags`, `therapist.checkpoints`, `therapist.note`, `classification.*`, `equipment_items`, `side.*`, `prescription.*`, `media[]`, `relations`, `lifecycle`, `provenance`, aliasy, trudność, typ.
- `media[]` nie zmienia się, gdy weryfikator wymienia zdjęcie albo film (fakt zapisany dwa razy, kontrakt §4 pkt 1).
- Zmiana strony w etapie Parametry pisze tylko kolumnę; `side.mode` zostaje.
- Czas ćwiczenia „naprzemiennie” z dawką na stronę jest liczony jak dawka łączna (o połowę za krótko); wzór jest wspólny z kartą ćwiczenia i odtwarzaczem.
- Uwaga „zwykle 2–6 s” przy czasie powtórzenia 7 s zatrzymuje wszystkie rekordy p001 do kliknięcia „OK”; zakresy nie czytają jeszcze `prescription.params`.
- Karta ćwiczenia (`exercises/[id]`) liczy braki treści po staremu.

## Data-testid

`verification-fact-{id}` (fakt tylko do odczytu), `verification-instruction-facts`, `verification-safety-facts`, `verification-safety-therapist-facts`, `verification-param-facts`, `verification-param-per-side-note`, `verification-param-side-mismatch-note`, `verification-material-facts`, `verification-contract-facts`. Dla 3.3 pola `verification-extra-{summary|should-feel|should-not-feel|why|when-to-do}-input` są w etapie Instrukcja. Mapa: `docs/testing/data-testid-map.md`.

## Verification plan

- Unit: `utils/__tests__/contentV33.test.ts` (zapis co do klucza na rekordzie wzorcowym, kompletność), `verificationFacts.test.ts`, przypadki 3.3 w `verificationStages.test.ts`, `changeSummary.test.ts`, `extraContent.test.ts`, `parameterRules.test.ts`.
- Komponent: `VerificationWorkspace.v33.test.tsx` (fakty w etapach, bramki, zmienne zapisu, rekord podniesiony mechanicznie, tor organizacji), `VerificationWorkspace.legacyContent.test.tsx` (rekord stary).
- E2E: zestaw `golden-portal` (G1) w `fiziyo-tests`, wiersz „centrum weryfikacji”; lokatory z tabeli wyżej.

## Changelog

### 2026-11-11

- Utworzenie specyfikacji razem z implementacją (stos na PR #220).
