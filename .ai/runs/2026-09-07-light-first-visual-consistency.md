# Light-first FiziYo

Spec: ../specs/SPEC-027-2026-09-07-light-first-visual-consistency.md

## Scope

Realizacja etapowa zaakceptowanego planu. Bez commitow/pusha (brak osobnej zgody),
bez zmian kontraktow/auth i bez pomijania bramki odbioru wizualnego pilota.

## Progress

### Aktywna kolejka: dwa wyglady, jedna logika (2026-09-07)

Najnowsze polecenie: implementuj lokalny preview current/redesign w src/redesign.
Ta kolejka zastepuje wszystkie historyczne polecenia wznowienia od CustomizeSetStep.
Current to obecny dirty worktree, nie main. Produkcja i preview build pozostaja current.
Bez stage/commit/push/branch/reset/delete, zapisow klinicznych, zmian kontraktow i auth.

- [x] A1 Odczyt SPEC/run/lessons, przewodnikow UI/shared/patients/assignment i kompatybilnosci.
- [x] A2 Przejecie worktree i nowy zakres w tych samych SPEC/run (bez commita).
- [ ] A3 Syntetyczny baseline shell+pulpit/profil/personalizacja i testy current.
- [ ] B1 Kontrakt Zod, storage, dev gate i bootstrap; natychmiast waski test.
- [ ] B2 Stabilny provider i switch Header, scoped probe pulpitu.
- [ ] B3 Roundtrip, hydration, production current, DOM/state/effect parity.
- [ ] C1 Wspolny kierunek shell/pulpit/profil/personalizacja, bez rownoleglych wdrozen.
- [ ] C2 Dzialajacy pilot shell+pulpit i akceptacja wizualna uzytkownika.
- [ ] D1 Odbior shell+pulpit, before/after, browser, testy i checkpoint.
- [ ] D2 Profil: forceMount, org/patient keys, drafty/listening; po D1.
- [ ] D3 Personalizacja: ten sam wizard/builder/DnD, switch w modalu; po D2.
- [ ] D4 Odbior rodziny, osobna zgoda na save/refetch/E2E na fikcyjnych danych.

Wymiary checkpointu: current-regression / redesign-visual / state-parity / automated /
clinical-write-E2E. Checkbox oznacza dowody calego kroku, nie sam render.
GetPatientWorkoutSessions 400 jest osobnym blockerem aktywnosci, bez fixu w tym runie.
E2E Dev Full na docelowym SHA nadal wymagany do release; dev-only preview nie jest
objety E2E produkcyjnego builda. Bez zgody nie obchodzic gate na testowym deploy.

Baseline git: refactor/redesign-v2 zgodny z origin; indeks pusty. Zastane zmiany:
DashboardHomePage + test, BillingStatusBar + nowy test, DashboardSkeleton,
ui/dialog + nowy dialogFocus.test, SPEC/run/lessons i ui-health. Zachowac wszystkie.
Historyczne 724 Vitest + 8 dispatch nie certyfikuja nowego diffa.

Nastepny krok: A3 baseline, potem B1; nie stylowac przed testem preferencji.

### Archiwum: kolejka po przekazaniu i korekcie pulpitu (2026-09-07)

Nowsza prosba uzytkownika: najpierw poprawic pulpit ze screena, potem wrocic do
CustomizeSetStep. Branch `refactor/redesign-v2`, zmiany poprzednich iteracji
pushniete przez uzytkownika; przejecie na czystym worktree. Bez nowych commitow/pusha.
Checkbox oznacza odbior calego kroku, nie tylko implementacje. Wymiary statusu:
implementation / visual / automated / clinical-write; pending nie oznacza PASS.
Historyczne wyniki ponizej nie sa walidacja nowych zmian.

- [x] 0.1 Odczyt najnowszego SPEC/run/lessons i stanu git (verified; bez commita).
- [x] 0.2 Rozpisanie atomowej kolejki w istniejacym runie (verified; bez commita).
- [x] 0.3 Korekta pulpitu wskazanego przez uzytkownika (verified w zakresie pokazanego stanu; implementation done / visual light-dark desktop-mobile / automated PASS / clinical-write not-performed; rozszerzone stany nadal pending, zob. checkpoint).
- [ ] 1.1 CustomizeSetStep (planned; implementation/visual/automated pending; clinical-write not-performed).
- [ ] 1.2 SelectPatientsStep (planned; implementation/visual/automated pending; clinical-write not-performed).
- [ ] 1.3 ScheduleStep (planned; implementation/visual/automated pending; clinical-write not-performed).
- [ ] 1.4 SummaryStep (planned; implementation/visual/automated pending; clinical-write not-performed).
- [ ] 1.5a AssignmentSuccessDialog (planned; implementation/visual/automated pending; clinical-write not-performed).
- [ ] 1.5b Powiazane QR/PDF, tylko prezentacja (planned; implementation/visual/automated pending; clinical-write not-performed).
- [ ] 1.6a Pilot from-set i from-patient z prefill (planned; visual/automated pending; clinical-write not-performed).
- [ ] 1.6b Pilot dashboard bez prefill i create-from-scratch (planned; visual/automated pending; clinical-write not-performed).
- [ ] 1.6c Edycja planu, wstecz, drafty, busy/errors i dialogi pacjenta (planned; visual/automated pending; clinical-write not-performed).
- [ ] 1.7 Akceptacja wizualna pilota oraz osobny save/refetch/E2E (blocked: wymagana akceptacja, uzgodnione dane i rozstrzygniecie GetPatientWorkoutSessions 400).
- [ ] 2.1 ExercisesPage i ExerciseCard (planned; po gate 1.7).
- [ ] 2.2 ExerciseDetailPage (planned; po 2.1).
- [ ] 2.3 ExerciseDialog create/edit i osiagalne dialogi (planned; po 2.2).
- [ ] 3.1 ExerciseSetsPage (planned; po fazie 2).
- [ ] 3.2 ExerciseSetDetailPage (planned; po 3.1).
- [ ] 3.3a CreateSetWizard (planned; po 3.2).
- [ ] 3.3b EditExerciseSetFullDialog i AddExerciseToSetDialog (planned; po 3.3a).
- [ ] 4.1 SettingsPageView, zakladki pojedynczo (planned; po fazie 3).
- [ ] 4.2 OrganizationPage, podwidoki pojedynczo (planned; po 4.1).
- [ ] 4.3 FinancesPage (planned; po 4.2).
- [ ] 4.4a InvoicesPage (planned; po 4.3).
- [ ] 4.4b PayoutsPage (planned; po 4.4a).
- [ ] 5.1 ImportPage, upload/text/progress/review/error pojedynczo (planned; po fazie 4).
- [ ] 5.2a VerificationPage (planned; po 5.1).
- [ ] 5.2b VerificationDetailPage (planned; po 5.2a).
- [ ] 5.3a OrganizationVerificationPage (planned; po 5.2b).
- [ ] 5.3b OrganizationVerificationDetailPage (planned; po 5.3a).
- [ ] 5.3c CrossOrgVerificationPage (planned; po 5.3b).
- [ ] 5.3d CrossOrgVerificationDetailPage (planned; po 5.3c).
- [ ] 6.1 Regresja pulpitu/pacjentow/wizyty/ActivityReport/dialogow (planned; po fazie 5).
- [ ] 6.2 Pozostale routy onboarding/auth/error i globalne stany (planned; po 6.1).
- [ ] 6.3 Pelna macierz, accessibility, validate, ui:health i E2E Dev Full na docelowym SHA (planned; po 6.2).

Fundamenty, shell, pulpit, pacjenci, profil/notatki/wizyta i rama/wybor kreatora:
implementation done w poprzednich iteracjach; visual czesciowe; automated historyczne;
clinical-write/E2E pending. Dalsze fazy: visual/automated/clinical-write pending,
bez prawa omijania gate 1.7. Kazdy ekran wymaga osobnego checkpointu przed nastepnym.

### Historyczna kolejka fundamentow (zachowana)

- [x] 0.1 Przeglad planu i czystego worktree; zapis SPEC-027.
- [x] 1.1 Wspolne preferencje i testy bootstrap/provider (bez commita).
- [x] 1.2 Integracja light default, Toaster i dostepne ustawienia (bez commita).
- [x] 2.1 Ujednolicenie tokenow i komponentow wspolnych (bez commita).
- [x] 2.2 Walidacja automatyczna i podglad light/dark (zakres komponentow, nie calego portalu).
- [ ] 2.3 Dopasowanie shellu na zalogowanym portalu i odbior wizualny.
- [ ] 3.1 Pilot pacjent/profil/przypisanie i odbior wizualny.
- [ ] 4.1 Migracja cwiczen/zestawow/dashboardu po odbiorze pilota.
- [ ] 5.1 Pozostale moduly i stany calego portalu.
- [ ] 6.1 Odbior pelnej macierzy, accessibility i E2E Dev Full.

## Validation

### 2026-09-07 - 0.3 Pulpit po korekcie uzytkownika (bez commita)

- Owner: `src/features/dashboard/DashboardHomePage.tsx`. Glowne CTA w PageHeader;
	Nowy pacjent i Utworz zestaw w naglowkach sekcji, pojedyncze EmptyState inline.
	Czytelniejsze nazwy/metadane, poprawna liczba pojedyncza, siatka zalezna od kontenera.
	Przy 320px/22px zawija sie tekst naglowka, nie oddzielnie ikona i licznik.
- `src/components/billing/BillingStatusBar.tsx`: pomocniczy link po zestawach zamiast
	dekoracyjnej karty pod pacjentem; kwota w calosci, tokeny tekstu i focus.
	Bez zmian query, kwot, licznika, fallbacku, pilot mode, ukrywania przy bledzie i canViewBilling.
- `src/components/shared/DashboardSkeleton.tsx`: odpowiada nowemu naglowkowi i siatce,
	bez historycznych duzych hero/kart, z dostepnym stanem ladowania.
- `src/components/ui/dialog.tsx`: podczas realnej interakcji wykryto powrot fokusu na body.
	Test reprodukowal 2 bledy / 1 PASS. Zapamietanie opener przed montazem tresci portalu
	naprawia takze pole z React autoFocus. Wlasne onCloseAutoFocus pozostaje nadrzedne.
	Po korekcie 4/4 testy: kontrolowany dialog, ponowne otwarcia, autoFocus, nested/native trigger i custom handler.
- Testy: `DashboardHomePage.test.tsx` 10/10, nowy `BillingStatusBar.test.tsx` 7/7,
	nowy `ui/__tests__/dialogFocus.test.tsx` 4/4. Wstepny type-check znalazl zbyt restrykcyjny
	typ legacy fixture; poprawiono tylko typ testowy. `npm run validate`: 137 plikow / 724
	testy Vitest + 8 dispatch PASS, type-check i build PASS; lint 0 bledow / 165 istniejacych
	ostrzezen, check:testids current=0/unexpected=0. Scoped ESLint bez ostrzezen.
- UI-health: swiezy baseline 11:35 UTC -> wynik 11:53 UTC: hardcoded_base_without_dark
	75 -> 75, missing_testids 0 -> 0. Nie uzywac delty skanera do raportu czerwcowego jako delty tej korekty.
- Browser before: screenshot uzytkownika + osobna karta, light 1440x1000 i 390x844.
	After obejrzane: light/dark desktop 1440, light 390x844, dark 390x1000 i stress 320x1000/22px.
	Screeny sa artefaktami rozmowy; nie zapisano ich jako trwale pliki repo. Brak dark before.
- Geometria zywego pulpitu: 28 kombinacji 320/390/768/1024/1280/1440/1920 x light/dark x
	18/22px: clientWidth zgodny, brak overflow dokumentu i tresci poza kontrolkami/sekcjami,
	osie naglowkow w dwoch kolumnach delta 0px. Ostatnia korekta grupowania naglowka
	dodatkowo obejrzana przy 320px/22px. Dlugie syntetyczne nazwisko: 8 prob geometrii
	przy 320/390/1440/1920 x light/dark, 22px, bez clippingu. Ta ostatnia proba zmieniala
	tylko tekst DOM, nie dane React/backendu; tekst i motyw/font przywrocone.
- Realne interakcje na desktopie: trzy akcje pulpitu native click i Enter, Tab/Shift+Tab
	w dialogu, Escape, powrot fokusu do poprawnego triggera. Brak save, AI, mikrofonu, Premium,
	platnosci lub wysylki. Zapisane preferencje nietkniete; karta testowa przywrocona do light/18px.
- Kompatybilnosc selektorow: `dashboard-add-patient-btn` i `dashboard-create-set-btn` pozostaja
	przyciskami; stare ID pustych CTA (`common-dashboard-home-page-btn-606`, `page-button-712`)
	zachowane na ich etykietach w stanie empty jako aliasy klikniecia. Test disabled odczytuje
	rodzica button. Docelowo testy E2E powinny uzywac kanonicznych dashboard-*; aliasow nie usuwac
	bez oddzielnej migracji i odbioru E2E.
- Gaps: duza lista zestawow, loading/error calej strony i onboarding nie odebrane wizualnie;
	testy komponentow pokrywaja loaded/empty/loading/disabled i warianty billingu. Brak pomiaru
	pelnej zgodnosci WCAG, mobile keyboard, save/refetch oraz E2E Dev Full. Istniejace ostrzezenia
	brakujacego Description w kreatorach i abortowanych zapytan po szybkim zamknieciu pozostaja.
	Znany GetPatientWorkoutSessions 400 nadal osobnym blockerem pilota, nie naprawiany tutaj.
- Nastepny krok: 1.1 CustomizeSetStep w osobnej karcie, before na zatwierdzonych danych,
	najmniejsza korekta owning buildera, natychmiast CustomizeSetStep.test.tsx; nie wracac do
	fundamentow ani nie rozpoczynac faz 2-6 przed akceptacja pilota 1.7.

### Aktualizacja: wyrównanie profilu i karta planu

- Kontynuacja kroku 3.1 na podstawie screena użytkownika: zgrupowane akcje profilu, statystyki summary,
	wspólne osie nagłówków i odstępy notatek, minimalna szerokość prawej kolumny oraz zgodny skeleton.
- Karta planu: pełna zawijana nazwa, osobny wiersz harmonogramu, menu z nazwą "Opcje planu".
- Wspólny kompaktowy ScheduleSummary nie ucina dat/częstotliwości; pozostałe warianty bez zmian.
- Browser: żywy profil 1774px, osie nagłówków 11px -> 0px. Kopia DOM bez skryptów: 28 kombinacji
	320/390/768/1024/1280/1440/1920px, oba motywy, 18/22px, długie dane przy 22px, bez wykrytych problemów geometrii.
- Końcowe bramki uruchomione etapami: lint 0 błędów / 165 istniejących ostrzeżeń, test IDs 0 braków,
	type-check PASS, 135 plików / 712 testów Vitest + 8 dispatch PASS, build PASS.
- Profil i karta wizualnie dopracowane; odbiór całego kreatora, zapisu/refetch i aktywności nadal otwarty.
	Bez commitów i zapisów danych klinicznych. Znany GraphQL 400 aktywności pozostaje poza zakresem.

### Aktualizacja po korekcie screenów

- Zalogowane konto testowe jest dostępne na `https://localhost:3000`; port 3001 nie jest potrzebny.
- W toku odbiór widoków po kolei: pulpit, lista pacjentów, profil i kreator. Wspólne toolbar actions,
	filtry, zakładki i uproszczone sekcje są wdrożone; nie oznacza to odbioru całego portalu.
- Korekta: domyślny focus w `@layer base`, tekstowe puste stany notatek bez powtórzeń.
- `npm run validate`: PASS (135 plików / 708 testów Vitest + 8 dispatch, typy i build).
- Lint: 0 błędów / 165 istniejących ostrzeżeń. `check:testids`: current=0, unexpected=0.
- VSC: potwierdzony pojedynczy obrys nazwy planu po kliknięciu i Tab; dark przez chwilową zmianę
	klasy bez persystencji. Screen nagłówka po naprawie; kreator zamknięty bez zapisu.
- Znany niezależny błąd GraphQL `GetPatientWorkoutSessions` (`from`/`to`) blokuje pełny odbiór aktywności.
- Następne widoki dopracowuj po kolei; nie uznawaj samych testów komponentów za odbiór wizualny.

### 2026-09-07

- `npm run validate`: PASS; 128 plikow testowych, 640 testow Vitest + 8 testow dispatch; build PASS.
- Lint: 0 bledow, 165 istniejacych ostrzezen (poza dodanym zakresem).
- `check:testids`: current=0, unexpected=0; naprawiono tez ID w testowej atrapie DialogClose.
- `ui:health`: hardcoded_base_without_dark 112 -> 99 w tej iteracji; missing_testids 0 -> 0.
	Delta wewnatrz wygenerowanego raportu porownuje z czerwcem, nie z poczatkiem tej iteracji.
- Testy preferencji: brak/czesciowy/nieprawidlowy/zablokowany storage, reset, batch updates,
	zachowanie dark, system OS changes, bootstrap/provider font parity i motyw toastow.
- Testy kontrastu: pary semantyczne w light/dark i high contrast; rzeczywiste media/overlaye
	calego portalu nadal wymagaja odbioru na zalogowanych ekranach.
- VS Code browser: podglad rzeczywistych komponentow, zmiana light/dark, duzy tekst 22px,
	kontrola geometrii przy 320/390/768/1440px (oba motywy): brak overflow i clipped controls.
- Rozmiar panelu VSC nadpisuje setViewportSize; wymiary powyzej sprawdzono w tymczasowym
	same-origin iframe o jawnej szerokosci, potwierdzajac clientWidth wewnatrz ramki.
- Dialog przy 320x740 / 22px: x=22..298, y=161..579, brak overflow; Escape zamyka.
- Zdarzenia w przegladarce wysylano przez dispatchEvent po timeoutach natywnego click;
	nie traktowac tego jako kompletnego odbioru hit-targetow i natywnej klawiatury.
- Wlasciwy portal: ekran logowania na https://localhost:3001, light/18px/color-scheme light,
	brak poziomego overflow. Brak zalogowanej sesji testowej blokuje odbior pilota klinicznego.
- `git diff --check`: PASS. Brak commitow, pushy, zmian env, GraphQL i polityk dostepu.

## Resume

Obowiazuje aktywna kolejka A/B/C/D powyzej. Ponizsze instrukcje sa archiwalne.

Historyczny nastepny krok: 1.1 CustomizeSetStep. Korekta pulpitu 0.3 odebrana w zakresie screena;
rozszerzone stany i pelny pilot pozostaja otwarte zgodnie z najnowszym checkpointem.
Nie rozpoczynaj kolejnych ekranow przed checkpointem biezacego.

1. Kontynuuj w zalogowanej sesji testowej na https://localhost:3000 w przegladarce VSC.
	Nie podawaj hasla/tokenow agentowi; nie uzywaj danych realnych pacjentow do screenshotow.
2. Kontynuuj od 2.3 i 3.1. Przed migracja pozostalych modulow zatwierdz pilot.
3. Podglad bez danych: `node scripts/ui-preview.mjs` -> http://127.0.0.1:3100.
	 Korzysta z istniejacego Vite; nie jest routem ani zaleznoscia produkcyjna.