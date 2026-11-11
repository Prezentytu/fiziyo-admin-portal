# Wydruk i podglądy pokazują instrukcję ćwiczenia v3.3

- Issue / spec: FR-007 (kontrakt v3.3, `fiziyo-research`, poza repo); SPEC-036
- Owning repo: fiziyo-admin-portal
- Status runu: ready-for-review
- Upoważnienie: Przemek przez prowadzącego agenta; commit lokalny tak, bez pusha, PR i wdrożenia
- Writer: agent (Claude Code)
- Dozwolone pliki: `src/components/shared/exercise/patientInstruction.ts`, `resolveEffectiveExerciseParams.ts`, `adapters.ts`, `types.ts`, `ExercisePreviewDialog.tsx`, `src/components/pdf/pdfExerciseUtils.ts`, `src/features/assignment/exerciseDetailsViewModel.ts`, `src/features/patients/ExercisePreviewDrawer.tsx`, `PatientAssignmentCard.tsx` (typ), `src/app/(dashboard)/exercise-sets/[id]/page.tsx`, testy, SPEC-036
- Wykluczenia: układ PDF, widok ćwiczenia (osobny branch `feat/widok-cwiczenia-v33`), kontrakt GraphQL, DEV i PROD
- Acceptance: rekord 3.3 ma instrukcję na wydruku i w trzech podglądach; „Brak opisu ćwiczenia.” tylko bez żadnej instrukcji; rekord stary z opisem bez zmian

## Repo i baseline

- Repo / checkout / branch / HEAD: fiziyo-admin-portal, worktree `fiziyo-admin-portal-wt-wydruk`, `feat/wydruk-i-podglady-v33` z `origin/feat/czytnik-tresci-v33` 2fc1c820 (draft PR #220)
- Zastane zmiany i ich tożsamość: brak
- Wymagany zakres i kontrole: `npx vitest run` dotkniętych plików, potem lint, type-check, `check:testids`, `check:design-tokens`, `test:run`

## Progress

- [x] Testy dzisiejszego zachowania czterech widoków dla rekordu starego (commit 5ea71ca6), zielone przed zmianą
- [x] `resolvePatientInstruction` z testami; podłączenie wydruku, kreatora, planu pacjenta i podglądu zestawu
- [x] Po zmianie padły dokładnie cztery testy „stary bez opisu, z krokami” (po jednym na widok); przepisane na nowe zachowanie, reszta zielona bez zmian
- [x] Testy rekordu 3.3: kroki, nadpisanie, brak treści; SPEC-036
- [ ] Wydruk prawdziwego PDF i zrzuty podglądów z lokalnej instancji (robi prowadzący)

## Decyzje

- Czytnika `readExerciseContent` nie trzeba było rozszerzać. Rozszerzone: `resolveEffectiveExerciseParams` o pole `patientDescriptionOverride` (addytywne), karta ćwiczenia o to samo pole, typ ćwiczenia w `PatientAssignmentCard` o `enrichmentData` (zapytanie już je pobiera).
- `ExercisePDFItem.tsx` bez zmian: drukuje `description`, a zdanie ogólne zostaje tylko dla rekordu bez żadnej instrukcji.
- Opis rekordu starego jest przycinany z białych znaków na końcach; środek tekstu, w tym puste linie, bez zmian.
- SPEC-035 powstaje w równoległym branchu widoku ćwiczenia; wiersze 035 i 036 w `.ai/specs/README.md` dadzą trywialny konflikt przy drugim merge'u.

## Dowody

- Kandydat: branch `feat/wydruk-i-podglady-v33`, commity lokalne na 2fc1c820
- Kontrola: 2026-11-11, `npm run lint` (bez uwag), `npm run type-check` (bez błędów), `npm run check:testids` (unexpected=0), `npm run check:design-tokens` (OK), `npm run test:run` (248 plików, 1456 testów, wszystkie zielone). `next build` pominięty: wymaga zmiennych Clerk.
- Niesprawdzone: render prawdziwego PDF (łamanie stron przy 8 krokach), wygląd podglądów w przeglądarce, czy każde zapytanie na żywo oddaje `enrichmentData`; DEV i PROD nietknięte.
- Reviewer: unverified

## Handoff

- Następny krok: na lokalnej instancji wydrukować kartę z ćwiczeniem 3.3 i starym, zrobić zrzuty podglądów, otworzyć PR na bazie `feat/czytnik-tresci-v33`
- Blokady: brak
- Transfer kodu: zatwierdzone commity lokalne
- Źródło: FR-007, SPEC-036
