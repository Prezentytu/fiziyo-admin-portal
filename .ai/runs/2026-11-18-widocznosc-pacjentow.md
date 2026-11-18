# Ustawienie gabinetu: fizjoterapeuci widzą wszystkich pacjentów

- Issue / spec: zlecenie Przemka 18.11 (rozmowa z agentem); backend w szkicu `fizjo-app#623`; mapa funkcji `docs/funkcje/widocznosc-pacjentow.md`
- Owning repo: fiziyo-admin-portal
- Status runu: ready-for-review
- Upoważnienie: Przemek 18.11: commity i szkic PR do `main`, bez merge'a, nic na DEV/PROD
- Dozwolone pliki: `src/components/organization/**`, `src/features/patients/**`, `src/features/ai-view/**`, `src/features/assignment/SelectPatientsStep.tsx`, `src/app/(dashboard)/patients/**`, `src/graphql/**`, `src/types/apollo.ts`, `docs/funkcje/**`, `docs/testing/data-testid-map.md`
- Wykluczenia: backend, mobile, `fiziyo-tests`, przebudowa listy pacjentów i zakładek
- Acceptance: właściciel albo administrator przełącza ustawienie i dostaje potwierdzenie dopiero po odpowiedzi serwera; odmowa `PATIENT_UNDER_OTHER_THERAPIST` ma jeden helper i czytelny stan na karcie z linku, przy dodawaniu pacjenta, przejęciu i w czacie; ograniczony fizjoterapeuta nie widzi mylących liczb ani zachęt

## Repo i baseline

- Repo / checkout / branch / HEAD: fiziyo-admin-portal, worktree `fiziyo-admin-portal-wt-widocznosc`, `feat/ustawienie-widocznosci-pacjentow` od `origin/main` 74a6737a
- Zastane zmiany: brak (świeży worktree)

## Progress

- [x] Przełącznik w ustawieniach organizacji, pole we fragmencie, mutacja
- [x] Helper odmowy i jej obsługa: karta z linku, dodawanie pacjenta, przejęcie
- [x] Czat: `spec.notice`
- [x] Puste stany i podtytuł listy, krok wyboru pacjentów
- [x] Testy, mapa funkcji, `npm run validate`
- [ ] Sprawdzenie w przeglądarce po wdrożeniu backendu

## Decyzje

- Pole `therapistsSeeAllPatients` w osobnym zapytaniu `GetOrganizationPatientVisibility`, nie we wspólnym fragmencie (poprawka koordynatora 18.11): kolejność wdrożeń nie może zepsuć PDF, QR ani danych do faktury. Brak odpowiedzi to „nie wiadomo”: bez karty i bez trybu ograniczonego.
- Zakładka „Wszyscy” zostaje także dla ograniczonego fizjoterapeuty (lokator E2E `patient-filter-all-btn`); zmienia się podtytuł, dopisek pod zakładkami i puste stany.
- „Przejmij opiekę” i „Przypisz do mnie” wyłączone z podpowiedzią dla ograniczonego fizjoterapeuty, zgodnie ze zleceniem; backend dopuszcza drugiego prowadzącego, czego lista nie rozróżnia.
- Po potwierdzonym zapisie listy pacjentów wypadają z cache (`evictPatientLists`), zamiast listy zapytań do ponowienia: obejmuje też listy nieaktywne.

## Dowody

- `npm run validate`: exit 0, 332 pliki testów, 3195 testów i 2 oczekiwane porażki, `check:testids` unexpected=0, build przeszedł.
- `npm run agent:check`: przeszło (ostrzeżenia zastane).
- Dokumenty GraphQL: zgodne ze schematem gałęzi `feat/widocznosc-pacjentow-ustawienie` (203 dokumenty); względem `origin/main` fizjo-app 2 błędy: nowe zapytanie o `therapistsSeeAllPatients` i mutacja `setTherapistsSeeAllPatients`. Wspólny dokument organizacji przechodzi.
- Bez zrzutów i bez sprawdzenia w przeglądarce: backend z polem nie jest wdrożony.
- Reviewer: unverified.

## Handoff

- Następny krok: po merge'u i wdrożeniu `fizjo-app#623` na DEV ponowić CI tego PR, potem sprawdzić ręcznie scenariusze z `docs/funkcje/widocznosc-pacjentow.md` w obu motywach.
- Blokady: walidacja dokumentów GraphQL w CI pada do wdrożenia backendu.
