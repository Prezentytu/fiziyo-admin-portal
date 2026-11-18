# Widoczność pacjentów w gabinecie

## Rola

Gabinet decyduje, czy fizjoterapeuci i personel widzą wszystkich pacjentów, czy tylko tych pod swoją opieką. Właściciel i administrator zawsze widzą cały gabinet. Przy włączonym ustawieniu każdy z personelu widzi listę, plany i wykonania wszystkich pacjentów i może przypisać ich sobie; przy wyłączonym widzi tylko swoich, a pacjentów przypisuje właściciel albo administrator. O tym, co wraca z API, decyduje backend; panel pokazuje przełącznik, tłumaczy odmowę i nie proponuje akcji, których serwer nie przyjmie.

## Jak dotrzeć

- Potrzebni: właściciel gabinetu, drugi fizjoterapeuta tego samego tenantu i pacjent prowadzony przez właściciela. Konta testowe są w `fizjo-app:docs/testing/agent-access.md`; czy jest tam drugi fizjoterapeuta tenantu A: niepotwierdzone. Tylko dane syntetyczne.
- Przełącznik „Fizjoterapeuci widzą wszystkich pacjentów gabinetu”: Ustawienia, zakładka organizacji (`src/app/(dashboard)/settings/page.tsx`), karta `src/components/organization/PatientVisibilitySettings.tsx`. Zakładkę widzą tylko właściciel i administrator.
- Wartość czyta `therapistsSeeAllPatients` we fragmencie organizacji (`src/graphql/queries/organizations.queries.ts`), zapisuje `setTherapistsSeeAllPatients` (`src/graphql/mutations/organizations.mutations.ts`).
- Reguła po stronie panelu (tylko kopia do tekstów i wyłączonych przycisków) i rozpoznanie odmowy: `src/features/patients/utils/patientCareAccess.ts`; stan zalogowanego: `src/features/patients/hooks/usePatientVisibility.ts`.
- Druga połowa: `fizjo-app:backend/FizjoApp.Api/Services/AssignmentVisibilityService.cs`, `fizjo-app:backend/FizjoApp.Api/Services/PatientCareErrors.cs`, czat w `fizjo-app:docs/funkcje/asystent-ai.md`.

## Jak sprawdzić

- Testy: `src/features/patients/utils/patientCareAccess.test.ts`, `src/components/organization/PatientVisibilitySettings.test.tsx`, `src/features/patients/utils/patientList.test.ts`, `src/features/patients/__tests__/UnifiedPatientInput.test.tsx`, `src/features/patients/__tests__/PatientDialog.assignment.test.tsx`, `src/app/(dashboard)/patients/[id]/__tests__/page.otherTherapist.test.tsx`, `src/features/ai-view/__tests__/useChatThread.test.ts`, `src/features/ai-view/utils/__tests__/viewSpec.test.ts`.
- Ręcznie, właściciel: przełącznik zapisuje się od razu, toast przychodzi dopiero po odpowiedzi serwera z nową wartością, po odświeżeniu strony stan zostaje.
- Ręcznie, fizjoterapeuta przy wyłączonym ustawieniu: lista pokazuje tylko jego pacjentów z dopiskiem pod zakładkami i bez liczby „w organizacji”; bezpośredni link do karty cudzego pacjenta daje stan „prowadzi go inny fizjoterapeuta” z powrotem do listy; „Dodaj pacjenta” z e-mailem albo telefonem cudzego pacjenta daje ten sam komunikat zamiast formularza nowej osoby; czat zapytany o cudzego pacjenta pełnym imieniem i nazwiskiem odpowiada tym samym komunikatem bez karty.
- Ręcznie, fizjoterapeuta po włączeniu: widzi wszystkich, „Przypisz do mnie” i „Przejmij opiekę” działają.
- Porażka: imię, e-mail albo prowadzący cudzego pacjenta w komunikacie odmowy; formularz nowego pacjenta po odmowie (duplikat); toast sukcesu przełącznika bez potwierdzenia serwera; „0 w organizacji” albo zachęta „przejmij w zakładce Wszyscy” u ograniczonego fizjoterapeuty.

## Uważaj na

- Odmowa ma jeden kod, `PATIENT_UNDER_OTHER_THERAPIST`, i jedno miejsce rozpoznania (`patientUnderOtherTherapistMessage` w `src/features/patients/utils/patientCareAccess.ts`). Zwracają go odczyty karty i wyszukiwanie po e-mailu albo telefonie, dodawanie pacjenta oraz przejęcie, przypisanie i przekazanie. `takeOverPatient` rzuca teraz błąd zamiast `success: false`. Nowa ścieżka z pacjentem woła ten helper, nie porównuje tekstu.
- Czat dostaje to samo jako `spec.notice = "patient_other_therapist"` przy `Message` (`src/features/ai-view/utils/viewSpec.ts`); taka odpowiedź nie dostaje karty ani pomysłów na ćwiczenia (`src/features/ai-view/useChatThread.ts`). Lokalne dopasowanie pacjenta działa na liście z API, więc cudzego pacjenta po prostu na niej nie ma i pytanie idzie do serwera; przy wyłączonym AI odpowiadają reguły z tej samej listy i komunikatu o innym fizjoterapeucie nie będzie ([czat-ai](czat-ai.md)).
- Wyłączony przycisk „Przejmij opiekę” to podpowiedź, nie uprawnienie. Backend pozwala zacząć opiekę także temu, kto ma już aktywne powiązanie z pacjentem jako drugi prowadzący; panel wyłącza akcję każdemu ograniczonemu fizjoterapeucie, bo z listy nie wie, czy takie powiązanie jest.
- Pole `therapistsSeeAllPatients` siedzi we wspólnym fragmencie `OrganizationFullFragment`, którego używają też wydruk PDF, kod QR pacjenta i dane do faktury. Backend bez tego pola odrzuca cały dokument, więc panel z tą zmianą wolno wdrożyć dopiero po backendzie z `fizjo-app#623`; pilnuje tego walidacja dokumentów względem schematu API DEV w `.github/workflows/ci.yml`.
- Zmiana ustawienia nie dociera do otwartych sesji fizjoterapeutów kanałem na żywo. `usePatientVisibility` pyta o ustawienie przy wejściu na listę pacjentów i krok wyboru pacjentów w kreatorze, a po zmianie wartości wyrzuca z cache listy pacjentów (`evictPatientLists`); karta otwarta wcześniej pokaże odmowę dopiero przy następnym odczycie albo zapisie.
- Strona organizacji (zespół, placówki) jest tylko dla właściciela i administratora, więc lista członków nie ma wariantu ograniczonego. Menu nie ma licznika pacjentów.
