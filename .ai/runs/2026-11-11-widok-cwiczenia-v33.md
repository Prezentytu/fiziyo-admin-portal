# Widok ćwiczenia czyta treść v3.3 przez wspólny czytnik

- Issue / spec: FR-007 (kontrakt v3.3, `fiziyo-research`, poza repo); SPEC-035
- Owning repo: fiziyo-admin-portal
- Status runu: ready-for-review
- Upoważnienie: Przemek przez prowadzącego agenta; commit lokalny tak, bez pusha, PR i wdrożenia
- Writer: agent (Claude Code)
- Dozwolone pliki: `src/features/exercises/ExerciseDetailSections.tsx`, `src/features/exercises/utils/equipmentItemText.ts`, testy, SPEC-035, `docs/testing/data-testid-map.md`
- Wykluczenia: edycja, kontrakt GraphQL, wydruk i podglądy w zestawach (osobny branch `feat/wydruk-i-podglady-v33`), DEV i PROD
- Acceptance: rekord 3.3 pokazuje instrukcję raz i nowe bloki; rekord stary renderuje ten sam tekst co przed zmianą

## Repo i baseline

- Repo / checkout / branch / HEAD: fiziyo-admin-portal, worktree `fiziyo-admin-portal-wt-widok`, `feat/widok-cwiczenia-v33` z `origin/feat/czytnik-tresci-v33` 2fc1c820 (draft PR #220)
- Zastane zmiany i ich tożsamość: brak
- Wymagany zakres i kontrole: `npx vitest run` dotkniętych plików, potem lint, type-check, `check:testids`, `check:design-tokens`, `test:run`

## Progress

- [x] Testy tekstu każdej sekcji dla rekordu starego, zielone na kodzie sprzed zmiany (commit de9f7464)
- [x] Tryb odczytu sekcji przez `readExerciseContent`; te same testy zielone bez zmiany oczekiwań
- [x] Testy rekordu 3.3 (wzorzec `fx-0073`) i rekordu podniesionego mechanicznie
- [x] Nowe `data-testid` w `docs/testing/data-testid-map.md`, SPEC-035
- [ ] Zrzuty przed i po w obu motywach z lokalnej instancji (robi prowadzący)

## Decyzje

- `page.tsx` bez zmian: sekcje same wołają czytnik ze swoich dotychczasowych propsów, więc nie da się podać im niespójnej pary dokument i model.
- Kroki i wskazówki zostają na dotychczasowym odczycie (powód w SPEC-035).
- Czytnika nie trzeba było rozszerzać.
- Różnice brzegowe dla rekordu starego, wynikające z czytnika: tekst jest przycinany z białych znaków na końcach; błąd bez treści (sama korekta albo pusty wiersz) nie jest już pokazywany jako „Błąd: Brak opisu”.
- Rekord 3.3 bez `equipment_items` nie pokazuje w metadanych sprzętu ze starej listy `equipment`; kolumna sprzętu jest nadal w panelu parametrów.

## Dowody

- Kandydat: branch `feat/widok-cwiczenia-v33`, commity lokalne na 2fc1c820
- Kontrola: 2026-11-11, `npm run lint` (bez uwag), `npm run type-check` (bez błędów), `npm run check:testids` (unexpected=0), `npm run check:design-tokens` (OK), `npm run test:run` (245 plików, 1435 testów, wszystkie zielone). `next build` pominięty: wymaga zmiennych Clerk.
- Niesprawdzone: wygląd w przeglądarce w obu motywach; DEV i PROD nietknięte.
- Reviewer: unverified

## Handoff

- Następny krok: uruchomić portal na lokalnej instancji, zrobić zrzuty rekordu 3.3 i starego w obu motywach, otworzyć PR na bazie `feat/czytnik-tresci-v33`
- Blokady: brak
- Transfer kodu: zatwierdzone commity lokalne
- Źródło: FR-007, SPEC-035
