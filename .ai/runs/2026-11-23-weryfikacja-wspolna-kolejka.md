# Wspólna kolejka weryfikacji dla dwóch weryfikatorów

- Issue / spec: `.ai/specs/SPEC-041-2026-11-23-verification-shared-queue.md`
- Owning repo: fiziyo-admin-portal (+ backend w fizjo-app)
- Status runu: waiting (PR-y otwarte, merge i wdrożenie DEV po stronie Adama)
- Upoważnienie: Adam 2026-11-23: „otwieraj pry, backend też można zmieniać”; merge i PROD tylko człowiek
- Writer: Claude Code (jedna sesja)
- Dozwolone pliki: `src/features/verification/**`, `src/app/(dashboard)/verification/page.tsx`, `src/graphql/**` (operacje weryfikacji), SPEC-041, `docs/`; backend `ExerciseReviewNoteMutation.cs`, `ExerciseQuery.cs`, testy, `schema.graphql`, `scripts/rehearse-database.sh`, `ci.yml` (krok testów PostgreSQL)
- Wykluczenia: kolejki organizacji (polityka autoryzacji), zawieszone przypisania (decyzja Adama), auto-branie przy otwarciu detalu
- Acceptance: dwóch weryfikatorów bierze paczki 10–100 z przeciwnych końców, listy „Moje” są rozłączne, „Dziś zrobione” rośnie z decyzjami

## Repo i baseline

- Panel: `main` = `fe875c17`; A `feat/weryfikacja-zapamietana-kolejka` (#360), B `feat/weryfikacja-wez-n` (#361, stos na A, worktree `fiziyo-admin-portal-wez-n`).
- Backend: fizjo-app `main` = `89f63c0c`; `feat/weryfikacja-wez-n` (Prezentytu/fizjo-app#722, worktree `fizjo-app-wez-n`).

## Progress

- [x] Analiza i spec (pamięć kolejki, „Weź N”, „Moje i wolne”, postęp dnia)
- [x] Backend: mutacja `claimNextExercisesForReview`, warunkowe `assignExercisesForReview`, `assignee: available`, `verificationProgress`
- [x] Panel A: pamięć kolejki per użytkownik
- [x] Panel B: pasek „Weź N” i liczniki
- [ ] #722 na DEV, potem #361 gotowy do review i retarget na `main`
- [ ] E2E w `fiziyo-tests` (dwa konta weryfikatorów)

## Decyzje

- Postęp jako osobne zapytanie, nie pola `VerificationStats`: nieznane pole psuje cały dokument w panelu na starszym backendzie.
- Zapis warunkowy `ExecuteUpdate` tylko na `ReviewAssigneeId`; dowód wyścigu deterministyczny (`RunBeforeFirstUpdate`), bo `Task.WhenAll` przechodził mimo mutacji.
- Klucz pamięci kolejki z id użytkownika: dwóch weryfikatorów na jednym komputerze.

## Dowody

- Backend: pełny `dotnet test` 3837/0; `ExerciseReviewNoteTests` na PostgreSQL 17 16/16 ×3; mutacja (bez warunku) → oba testy równoległe czerwone; `rehearse-database.sh` EXIT=0 (lokalnie `PATH` postgresql@17, `LC_ALL=en_US.UTF-8`).
- Panel: `npm run validate` exit 0 na B (384 pliki, 3788 testów, build); `GRAPHQL_SCHEMA_PATH=<fizjo-app-wez-n>/backend/schema.graphql node scripts/validate-graphql-documents.mjs --require-schema` → 233 dokumenty zgodne.
- Reviewer: brak niezależnego; testy z tej samej sesji nie zamykają bramki.

## Handoff

- Następny krok: Adam merguje #722, backend na DEV; potem #361 → ready, baza `main` po merge'u #360.
- Blokady: decyzja o zawieszonych przypisaniach (limit / „Przejmij” / wygasanie).
- Transfer kodu: gałęzie wypchnięte.
- Źródło: zlecenie Adama 2026-11-23, SPEC-041
