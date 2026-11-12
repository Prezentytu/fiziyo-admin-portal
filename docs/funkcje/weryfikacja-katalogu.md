# Weryfikacja katalogu

## Rola

Ćwiczenie trafia do zewnętrznego fizjoterapeuty dopiero po naszej weryfikacji treści, parametrów i materiału. Są dwa tory z osobnymi statusami na tej samej encji `Exercise`: organizacyjny (owner i admin gabinetu zatwierdzają ćwiczenia własnego zespołu, `organizationVerificationStatus`) i globalny (backoffice publikuje do katalogu FiziYo, `status`). Obrazek z AI slopem (zlepione kończyny, mieszana sylwetka, sprzęt w złej skali) odpada przed publikacją (`AGENTS.md`, „Słownik”).

## Jak dotrzeć

- Tor organizacyjny: `fizjoterapeuta-bot` (owner, więc `canManageOrganization`, `src/hooks/useRoleAccess.ts:61`), lista `src/app/(dashboard)/organization/verification/page.tsx`, detal `src/app/(dashboard)/organization/verification/[id]/page.tsx`.
- Tor globalny `src/app/(dashboard)/verification/page.tsx` i moderacja organizacji klientów `src/app/(dashboard)/verification/organizations/page.tsx` wymagają roli `ContentManager` albo `SiteSuperAdmin`. Takiego konta nie ma w `fizjo-app:docs/testing/agent-access.md`, więc te sprawdzenia są `blocked`.
- Wszystkie tory mają jeden detal: `src/features/verification/VerificationWorkspace.tsx` z etapami w `src/features/verification/stages/`. Dostęp do kolejek: `src/features/verification/utils/verificationScopes.ts`.

## Jak sprawdzić

- Testy: `src/features/verification/utils/__tests__/orgStateMachine.test.ts`, `src/features/verification/utils/__tests__/verificationStages.test.ts`, `src/features/verification/utils/__tests__/parameterRules.test.ts`, `src/features/verification/utils/__tests__/verificationScopes.test.ts`, `src/features/verification/utils/__tests__/stepMedia.test.ts`, `src/features/verification/utils/__tests__/photoValidation.test.ts`, `src/features/verification/VerificationWorkspace.organization.test.tsx`, `src/features/verification/stages/ParametersStage.test.tsx`; backend `fizjo-app:backend/FizjoApp.Api.Tests/Types/OrganizationExerciseVerificationCrossOrgTests.cs`.
- E2E w `fiziyo-tests:TEST_PLAN.md`: VER01–VER11 (fokus kroku i zdjęcia, podmiana zdjęcia, parametry i limity, materiał, przeciwwskazania), uruchamiane `npm run test:dev:verification` z kontem roli weryfikującej; każda mutacja jest przechwycona. Stan wszystkich: nieuruchomione (brak sekretów DEV), a `fiziyo-tests:tests/logged/verification/` nie jest w `fiziyo-tests:.github/workflows/e2e.yml`, więc nie należy do E2E Dev Full. D-M-032 (paginacja kolejki, zaliczony), D-M-033 (overflow okna zgłoszenia, failed), D-M-034 (plakietka „Brak wideo” mimo filmu, failed).
- Ręcznie, tor organizacyjny: zgłoś ćwiczenie, zatwierdź, poproś o zmiany, archiwizuj; status globalny tego samego ćwiczenia ma się nie zmienić. Konto therapist bez roli owner nie widzi kolejki.
- Porażka: decyzja w jednym torze zmienia status drugiego, kolejka pokazuje ćwiczenie innej organizacji poza moderacją backoffice, publikacja globalna z otwartym etapem.

## Uważaj na

- Odsiew AI slopu jest wyłącznie ręczny. Walidacja zdjęcia sprawdza tylko typ i rozmiar do 5 MB (`src/features/verification/utils/photoValidation.ts`); wyszukanie `slop`, `zlepion` i `sylwetk` w `src/`, `docs/` i `.ai/` nie daje trafień. Ścieżka odrzucenia to „Zdjęcie nie pasuje do opisu” (VER04).
- Publikacja globalna tylko przy `canPublish` z `src/features/verification/utils/verificationStages.ts`; progi parametrów tylko w `src/features/verification/utils/parameterRules.ts`. Ekran globalny nie ma „Odrzuć” (`src/features/verification/AGENTS.md`).
- `crossOrgVerification*` i `*AsAdmin` omijają członkostwo tenantu (`AGENTS.md`, Never 2). Backend wpuszcza do nich `ContentManager` bez członkostwa (`fizjo-app:backend/FizjoApp.Api.Tests/Types/OrganizationExerciseVerificationCrossOrgTests.cs`), a panel pokazuje kolejkę organizacji klientów tylko `SiteSuperAdmin` (`src/features/verification/utils/verificationScopes.ts:49`). UI jest węższe niż backend; wyrównanie to decyzja, nie poprawka.
- Detal weryfikacji edytuje ćwiczenie tym samym hookiem co strona ćwiczenia (`src/features/verification/VerificationWorkspace.tsx:259`), więc zmiana formularza w [edycja-cwiczenia](edycja-cwiczenia.md) zmienia też weryfikację.
- Ustawienie `requireOrganizationVerification` (`src/components/organization/ExerciseVisibilitySettings.tsx`) włącza blokady backendu, które UI kreatora i katalogu ma respektować (`src/features/verification/AGENTS.md`). Poza ustawieniami organizacji i jej operacjami GraphQL żaden plik w `src/` tego pola nie czyta. Co dokładnie blokuje backend: niepotwierdzone.
