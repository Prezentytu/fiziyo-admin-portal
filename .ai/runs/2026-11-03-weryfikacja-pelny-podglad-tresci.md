# Weryfikacja widzi wszystkie treści karty ćwiczenia

- Issue / spec: feedback kolegi (porównanie widoku ćwiczenia i weryfikacji, D-M-036, plik poza repo); SPEC-030
- Owning repo: fiziyo-admin-portal
- Status runu: working (PR)
- Upoważnienie: Adam, „zbadaj i napraw, jeśli uznasz za zasadne”; bez commitu, pusha i PR
- Writer: agent (Claude Code)
- Dozwolone pliki: `src/features/verification/**`, `src/features/exercises/ExerciseDetailSections.tsx`, `src/features/exercises/ExerciseExecutionSteps.tsx`, testy, SPEC-030, `docs/testing/data-testid-map.md`
- Wykluczenia: kontrakt GraphQL, przepływ `notes` do planu pacjenta (zmieniona tylko etykieta)
- Acceptance: weryfikator widzi i edytuje każde pole enrichment spoza etapów; widok ćwiczenia pokazuje zdjęcia kroków i listy zamiast sklejonego akapitu; liczniki decyzji bez pustych pozycji

## Repo i baseline

- Repo / checkout / branch / HEAD: fiziyo-admin-portal, `fix/weryfikacja-pelny-podglad-tresci` z `origin/main` 23a9188
- Zastane zmiany i ich tożsamość: tylko nieśledzony `.claude/`
- Wymagany zakres i kontrole: `npx vitest run` dotkniętych plików, `npm run validate`

## Progress

- [x] Ustalenia z feedbacku sprawdzone w kodzie `main` (oba tory weryfikacji renderują `VerificationWorkspace`)
- [x] Zapis z weryfikacji nie gubi pól spoza etapów: `enrichmentSchema` ma `.passthrough()` na każdym poziomie
- [x] Liczniki: test pada na `main`, potem `countFilledTexts` / `countFilledMistakes`
- [x] Pozostałe treści w etapie Decyzja (`utils/extraContent.ts`, `stages/ExtraContentSection.tsx`) z testem zgodności ze schematem
- [x] Przerwa między powtórzeniami i czas przygotowania w etapie Parametry
- [x] Widok ćwiczenia: „Przerwij gdy” i listy terapeuty jako listy, zdjęcia przypięte do kroków (testy padają bez zmiany)
- [x] Druga tura po decyzji Adama („zarekomenduj, zaimplementuj, zrób PR”): `notes` jako „Wskazówka fizjoterapeuty”, wspólne etykiety, `stop_if` jako tekst, wspólne braki treści, jeden format czasu, zapisane obciążenie spoza kg, „Popraw w weryfikacji” dla weryfikatora na karcie ćwiczenia globalnego
- [ ] Zrzuty przed i po w obu motywach na koncie testowym

## Decyzje

- Pozostałe treści są edytowalne przez ten sam `useExerciseEditorForm` i nie wpływają na bramkę publikacji (SPEC-030, Decyzje).
- `notes`: etykieta „niewidoczne dla pacjenta” była nieprawdziwa (dziedziczenie do mappingu, mobile pokazuje jako „Wskazówka fizjoterapeuty”). Wybrana etykieta zgodna z zachowaniem, bez zmiany przepływu danych z mobile.

## Dowody

- Kontrola: 2026-11-03, `npm run validate`, exit 0 (209 plików testów, 1102 testy, build OK) po `npm ci` (lokalne `node_modules` miały `react-avatar-editor` 14 zamiast ^16)
- Reviewer: unverified

## Handoff

- Następny krok: zrzuty w obu motywach na koncie testowym, review PR, `E2E Dev Full` po merge'u
- Źródło: feedback kolegi z porównania 5878 na DEV
