# Centrum weryfikacji czyta i zapisuje ćwiczenie v3.3

- Issue / spec: FR-007 (kontrakt v3.3, bramka G1), SPEC-035
- Owning repo: fiziyo-admin-portal
- Status runu: working (commity lokalne, bez pusha i PR)
- Upoważnienie: zadanie koordynatora w imieniu Przemka; commit lokalny tak, push i PR nie
- Writer: agent (Claude Code)
- Dozwolone pliki: `src/features/verification/**`, SPEC-035 i indeks, `docs/testing/data-testid-map.md`, ten run
- Wykluczenia: formularz edycji ćwiczenia (`src/features/exercises/*Editor*`, `useExerciseEditorForm`, `buildEnrichmentUpdateVariables`, `useEnrichmentDraft`), ujednolicenie listy parametrów, kontrakt GraphQL, DEV i PROD
- Acceptance: rekord wzorcowy p001 pokazuje każdy fakt kontraktu w swoim etapie; bramki treści bez wycofanych pól; zapis jednej edycji nie zmienia żadnego innego klucza; rekord stary bez zmian

## Repo i baseline

- Repo / checkout / branch / HEAD: worktree `fiziyo-admin-portal-wt-weryfikacja`, `feat/weryfikacja-v33` z `origin/feat/czytnik-tresci-v33` 2fc1c820 (PR #220)
- Zastane zmiany i ich tożsamość: brak
- Wymagany zakres i kontrole: celowany vitest, `lint`, `type-check`, `check:testids`, `check:design-tokens`, `test:run`
- Dostępność: `next build` pominięty (brak zmiennych Clerk)

## Progress

- [x] Zachowanie rekordu starego przypięte testem przed zmianą (osobny commit)
- [x] Zapis 3.3: kopia dokumentu plus edytowane ścieżki; bez kolumn opisu
- [x] Bramki i kompletność z miejsc kontraktu
- [x] Fakty tylko do odczytu w etapach według macierzy; pola zespołu tylko dla zespołu
- [x] Podsumowanie zmian w ścieżkach 3.3
- [x] Etykieta dawki na stronę
- [ ] Przejście w przeglądarce na DEV (zrzuty w obu motywach)

## Decyzje

- Wymagane w bramce 3.3: materiał, nazwa, kroki. Powód: kontrakt nie wymienia innych pól wymaganych, a „Przerwij, gdy” nazywa opcjonalnym.
- Fakty spoza dzisiejszej edycji są tylko do odczytu, mimo że macierz oczekuje edycji: zakres zadania; lista w SPEC-035.
- Bramka parametrów bez zmian: 7 rekordów p001 staje na uwadze „zwykle 2–6 s” do kliknięcia „OK”. Do decyzji właściciela, czy zakres ma czytać `prescription.params`.

## Dowody

- Kontrola: 2026-11-11, wyniki w opisie PR
- Sprawdzenie jednorazowe na `fiziyo-research/hep2go-reference/paczki/p001/bundle.json` (7 rekordów, plik tymczasowy, nie w repo): kompletność bez braków, zapis bez edycji równy wczytanemu dokumentowi co do znaku, jedyna uwaga bramek to czas powtórzenia
- Reviewer: unverified

## Handoff

- Następny krok: przegląd w przeglądarce na DEV po merge'u #220 i tego PR
- Blokady: brak
- Transfer kodu: commity na `feat/weryfikacja-v33` w worktree
- Źródło: FR-007, SPEC-035
