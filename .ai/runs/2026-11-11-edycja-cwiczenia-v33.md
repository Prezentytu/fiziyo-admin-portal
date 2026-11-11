# Edycja ćwiczenia w kontrakcie v3.3

- Issue / spec: `.ai/specs/SPEC-038-2026-11-11-exercise-edit-v33.md`; kontrakt `fiziyo-research/feature-requests/FR-007-schemat-v3/KONTRAKT-v3.3.md`.
- Owning repo: fiziyo-admin-portal
- Status runu: review pending
- Upoważnienie: zlecenie właściciela (Przemek) z 2026-11-11 przez koordynatora: implementacja i commit lokalny. Bez push, bez PR, bez DEV i PROD.
- Writer: agent w worktree `fiziyo-admin-portal-wt-edycja`.
- Dozwolone pliki: `src/features/exercises/**`, `src/components/shared/exercise/ExercisePatientContentFields.tsx`, `src/components/shared/enrichment/enrichmentFieldLabels.ts`, `docs/testing/data-testid-map.md`, `.ai/specs/**`, `.ai/runs/**`.
- Wykluczenia: kreator ćwiczenia, parametry, media, tagi, widok odczytu, etapy weryfikacji, kontrakt GraphQL, backend.
- Acceptance: rekord 3.3 po edycji jednego pola różni się w bazie tylko tym polem; pola wycofane nie są renderowane ani wysyłane; rekord stary ma formularz i zapis bez zmian.

## Repo i baseline

- Repo / checkout / branch / HEAD: `fiziyo-admin-portal-wt-edycja`, `feat/edycja-cwiczenia-v33`, baza `origin/feat/czytnik-tresci-v33` 2fc1c820 (draft PR #220).
- Instrukcje: `AGENTS.md`, `src/features/exercises/AGENTS.md`, `.ai/specs/AGENTS.md`, `.ai/docs/smak.md`, `.ai/docs/dotknij-kazdej-powierzchni.md`.
- Zastane zmiany i ich tożsamość: czyste drzewo.
- Dostępność: available. Node 24.21.0, `npm ci` bez błędów.

## Progress

- [x] Testy przypinające formularz i zapis rekordu starego (commit 514baaac, zielone przed zmianą kodu).
- [x] Reguła zapisu 3.3 w czystej funkcji z testami.
- [x] Hook: wersja przy wczytaniu, zapis 3.3, bez kolumn wycofanych.
- [x] Formularz 3.3, AI, panel JSON.
- [x] Spec, mapa `data-testid`, kontrole.
- [ ] Zrzuty ekranu i zapis na lokalnej instancji z porównaniem dokumentu w bazie (koordynator).

## Decyzje

- Numer SPEC-038: 035 i 036 są zajęte przez gałęzie `feat/widok-cwiczenia-v33` i `feat/wydruk-i-podglady-v33`.
- Zmiany liczone z różnicy szkicu i wczytanego dokumentu na zamkniętej liście ścieżek, a nie z listy „dotkniętych pól”: AI, panel JSON i workspace weryfikacji podmieniają cały szkic albo całą sekcję `patient`, więc tylko taka reguła gwarantuje, że nic spoza listy nie wyjdzie.
- Guard kolumn wycofanych w hooku, nie w komponencie: obejmuje też workspace weryfikacji, który tych pól nie ukrywa. Skutek: wpis w polu wycofanym na rekordzie 3.3 w weryfikacji nie jest zapisywany.
- AI włączone z mapowaniem na pola o tym samym miejscu; `patient.summary` wliczone, bo ścieżka jest identyczna.
- Ukryte dodatkowo (nie ma ich w kształcie 3.3): fazy rehabilitacji, korzyści, notatki o progresji, listy `ai.*`.
- Krótsze `data-testid` (`exercise-detail-contraindications-*`, `exercise-detail-equipment-subs-*`), żeby nie przeformatować całej tabeli mapy.

## Dowody

- Kandydat: gałąź `feat/edycja-cwiczenia-v33`, commity po 2fc1c820.
- Kontrola: komendy i wyniki w opisie PR (lint, type-check, check:testids, check:design-tokens, test:run).
- Jednorazowo: wszystkie 7 dokumentów z `paczki/p001/bundle.json` przeszły „bez zmian = identyczny JSON” i „jedna zmiana = jedna różnica” (test tymczasowy, usunięty; w repo zostaje fixture fx-0073).
- `next build` pominięty: wymaga zmiennych Clerk.
- Reviewer: unverified.

## Handoff

- Następny krok: zapis rekordu p001 na lokalnej instancji (przeglądarka + baza), zrzuty w obu motywach, potem draft PR na bazę `feat/czytnik-tresci-v33`.
- Blokady: brak.
- Transfer kodu: ten sam checkout, commity lokalne, bez push.
- Źródło: spec SPEC-038.
