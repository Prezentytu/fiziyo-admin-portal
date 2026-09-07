# SPEC-027 - Light-first visual consistency

## Aktualny zakres: dwa wyglady, jedna logika

Decyzja 2026-09-07: lokalny przelacznik Obecny/Nowy (current/redesign), domyslnie
current = aktualny kod z lokalnymi poprawkami, bez cofania do main. Ten zakres
zastepuje historyczna szeroka migracje ponizej. Postep w istniejacym runie.

### Kontrakt preview

- Nowy src/redesign zawiera tylko prezentacje, preferencje, switch i testy.
- Jeden provider wewnatrz AccessibilityProvider, wokol niezmienionych ApolloWrapper
	i Toaster. Nie zmieniac kolejnosci guardow/providerow w DashboardShell.
- Zod enum current/redesign, osobny klucz fiziyo-design-preview, tylko wartosc enum.
	Nieprawidlowy/brak/zablokowany odczyt = current; zablokowany zapis = zmiana sesyjna.
	Bez synchronizacji storage event pomiedzy kartami, API i danych klinicznych.
- Wspolny gate process.env.NODE_ENV === 'development' dla bootstrap/provider/control.
	Produkcja i produkcyjne preview ignoruja zapis redesign i nie pokazuja switcha.
	Bez nowych env/flags, zmiany pipeline i traktowania tego jako autoryzacji.
- Bootstrap w head tylko w development, wspolna serializowalna konfiguracja z parserem,
	data-fiziyo-design przed paint. Stabilny SSR/client JSX, brak branchowania strony.
- Scoped CSS: html[data-fiziyo-design="redesign"] oraz jawne data-redesign-surface.
	Tokeny namespace lokalne, bez nadpisania globalnego theme i pozostalych ekranow.
- Te same typy, rodzice, keys, hooks i handlery. Nigdy CurrentView/RedesignView nad
	formularzem, dwie zywe kopie, wyglad w key ani persystencja medycznego draftu.
- Switch jako dostepna grupa Obecny/Nowy w Header, oddzielna od theme. W pilotowym
	modalu ten sam switch wewnatrz focus trap. Portale wymagaja jawnego opt-in.
- Zachowac Outfit/JetBrains Mono, 16/18/20/22px, light default, dark/system,
	high contrast/reduced motion, FiziYo i zielono-mietowy akcent.

### Kolejnosc i dowody

A: przejecie i syntetyczny baseline trzech wzorcow. B: preferences test, provider,
switch i rzeczywista scoped probe pulpitu, testy roundtrip. C: jeden projekt rodziny
shell/pulpit/profil/personalizacja oraz akceptacja wizualna dzialajacego shell+pulpit.
D: domkniecie shell+pulpit, potem profil, potem personalizacja, oddzielne checkpointy.
Nie wracac do historycznej migracji ani edytowac ekranow rownolegle przed odbiorem.

Pierwszy test kodu: npx vitest run src/redesign/__tests__/preferences.test.ts.
Testowac brak/bledny/zablokowany storage, gate production, cold load/refresh/hydration,
brak remountu/refetch/mutacji i te same DOM nodes, focus, dirty/errors, draft, Map,
selection, step i confirm state w current -> redesign -> current. Liczniki odnosic
do baseline StrictMode. W fazie personalizacji zachowac always-fork PATIENT_PLAN,
opcjonalna TEMPLATE+ORG_PRIVATE, mapping.id/instanceId/overrides/enrichment/delta;
te same argumenty pojedynczego mock submit. Aktywny drag blokuje tylko preview,
nie zmienia biznesowego busy. Profil zachowuje forceMount i org/patient key wizyty.

Przed checkpointem: scoped lint/get_errors, npm run validate, swiezy ui:health/delta.
Browser: osobna karta, bez drugiego serwera gdy 3000 dziala; screeny tylko fikcyjne.
Macierz current/redesign x light/dark 390/1440; stress 320/22px, 768/1024/1280/1920,
high contrast/reduced motion/zoom200, rzeczywisty clientWidth i clipping dzieci,
loaded/empty/loading/error i dlugie dane. Nie porownywac statycznej kopii jako dowodu
stanu/zapisu. Nie zmieniac cudzych preferencji, nie uruchamiac mikrofonu.

GetPatientWorkoutSessions 400 pozostaje osobnym blockerem aktywnosci/pilota.
Brak zapisow klinicznych i E2E nie oznacza release-ready. E2E Dev Full na docelowym
SHA istnieje w fiziyo-tests; lokalny redesign nie jest objety production-build E2E.
Testowy deploy redesignu i zapisy wymagaja osobnej decyzji. Bez commitow/pusha,
Daymark changes, kontraktow/DTO/backend/mobile/auth/permission/billing/env/delete.

## Historia fundamentow (zachowana)

### Kierunek rodziny preview (C1, do odbioru)

- Shell: neutralna nawigacja, jasny obszar pracy, bez nowego systemu tras/rol.
	Zachowac szerokosc collapse, marke FiziYo i aktualna obsluge mobile.
- Pulpit: tytul z akcja w jednej grupie, data mono, pelnoszeroki separator,
	pacjenci jako skanowalne wiersze z avatarami; biblioteka w pomocniczej kolumnie.
	Maksymalna szerokosc tresci 74rem; pojedyncza kolumna ponizej 56rem kontenera.
- Profil (projekt, niewdrozony): ta sama os tytulu/akcji, status blisko tozsamosci,
	plany po lewej, notatki po prawej, widoczny recording status i niezmienione tabs.
- Personalizacja (projekt, niewdrozony): naglowek celu/nazwy, biblioteka w lewej
	kolumnie, plan z rzeczywistymi miniaturami po prawej; bez zmiany DOM ownera DnD.
	Parametry i rozszerzenia z kanonicznych Fields/Card, nie druga implementacja.
- Wspolne: 8pt rytm, 8px max na powtarzalnych kartach, bez kart dla sekcji,
	statusy semantyczne, loading zgodny z ukladem, empty przy istniejacym CTA.
	Brak nowych klinicznych defaultow, metryk, sformulowan billingowych i zapisow.
- Delta interakcji: preview 1 wybor; akcje domenowe nadal 1 klik do tego samego
	dialogu. C2 wymaga akceptacji dzialajacego shell+pulpit przed kolejnymi ekranami.

## Cel biznesowy

Zachowac identyfikacje FiziYo i ujednolicic caly portal jako system pracy terapeuty.
Jasny motyw jest domyslny; zapisane light/dark/system pozostaja respektowane.
Kontynuacja wizualna SPEC-026, bez zmian GraphQL, auth, uprawnien i zasad klinicznych.

## Architektura

- Wspolne preferencje i walidacja w `src/lib/accessibilityPreferences.ts`.
- Bootstrap przed hydration i AccessibilityProvider korzystaja z tych samych wartosci i kontraktu.
- Zachowac API contextu, storage key, skale 16/18/20/22px i istniejace test IDs.
- Toaster wewnatrz AccessibilityProvider korzysta z rozwiazanego motywu.
- Istniejace PageShell/PageHeader/PageHero/StatTiles i primitives pozostaja jedynymi wzorcami UI.
- Bez nowego frameworka UI, globalnego resetu preferencji i wymiany fontow.

## UI/UX Wireframes

- Lista: kompaktowy naglowek, wyrazna akcja, filtry, karty kliniczne.
- Detal: tozsamosc obiektu, status i akcje, zakladki, nieobramowane sekcje.
- Formularz: sekcje celu, czytelna walidacja, stabilna stopka; Anuluj po lewej na desktopie.
- Jasne neutralne powierzchnie, mietowy akcent, semantyczne kolory statusow.
- Skala odstepow 4/8/12/16/24/32; kontrolowane promienie, bez kart w kartach.
- Motion 150-200ms, bez dekoracyjnego skalowania; zachowac reduced motion i wysoki kontrast.

## Interfejsy

### GraphQL Contracts

Bez zmian zapytan, mutacji, DTO, persystencji medycznej i polityk dostepu.

### Komponenty

- AccessibilityProvider: additive `resolvedTheme`, zachowane pozostale eksporty.
- AccessibilitySettings: dostepny wybor Jasny/Ciemny/Systemowy i wielkosci tekstu.
- DialogFooter/useDialogShortcuts: reuzycie, nie druga implementacja.
- ExerciseExecutionCard/ExerciseParametersFields: zachowac semantyke i adaptery.

## Data-testid

Zachowac wszystkie dotychczasowe identyfikatory, w tym `settings-theme-*`,
`settings-fontsize-*`, `settings-reset-defaults-btn`, `page-hero`, `page-header`.
Nowe interakcje wymagaja zgodnego ID oraz dostepnej nazwy.

## Fazy

1. Preferencje light-first i stabilny pierwszy render z testami.
2. Tokeny, wspolne komponenty i shell; oba motywy od pierwszej wersji.
3. Pilot: pacjenci -> profil -> przypisanie planu; wizualny odbior przed szeroka migracja.
4. Cwiczenia, zestawy, dashboard i raporty.
5. Settings/org, finanse, import, weryfikacja, onboarding, auth presentation i stany globalne.
6. Pelna macierz ekranow/stanow, accessibility i walidacja wydaniowa.

## Risk Assessment

- Globalne tokeny: szeroki zasieg, wymagaja pilota i porownania light/dark.
- Hydration: dwie konfiguracje moga rozjechac font i theme; testowac bootstrap/provider parity.
- Storage: JSON nieprawidlowy, czesciowy lub zablokowany; walidacja per pole i fallback sesyjny.
- Auth/klinika: nie zmieniac logiki przy zmianie wygladu. Nie udawac odbioru bez danych testowych.
- Szeroka migracja pozostaje za bramka zatwierdzenia pilota, zgodnie z planem uzytkownika.

## Integration Test Coverage

- Happy path: nowa sesja light, zmiana dark, refresh, reset light.
- Edge: brak/nieprawidlowy/czesciowy storage, odmowa odczytu/zapisu, system OS change.
- Regresja: identyczna klasa i font-size bootstrap/provider; poprawne theme toastu.
- Zachowac testy navigation, PatientDialog.assignment i parameterSurfaceParity.

## Verification plan

- Pierwszy gate: `npx vitest run src/lib/__tests__/accessibilityPreferences.test.ts`.
- Komponenty: Vitest/Testing Library, role i obsluga klawiatury ustawien.
- Po kazdej zmianie waski test, przed koncem `npm run validate` i `npm run ui:health`.
- Browser: 390/768/1440px light/dark; stress 320/1920px, duzy tekst, reduced motion.
- WCAG AA: tekst 4.5:1, duzy tekst i kontrolki 3:1; sprawdzic rzeczywiste pary.
- E2E w `fiziyo-tests`: pacjent -> plan -> parametry -> zapis -> refresh.
- Preview bez automatycznego E2E; wydanie wymaga istniejacego E2E Dev Full na SHA.

## Changelog

### 2026-09-07 - Korekta pulpitu i powrot fokusu

- Nowszy priorytet uzytkownika: pulpit przed CustomizeSetStep, na branchu refactor/redesign-v2.
- Glowne CTA przy tozsamosci w PageHeader; akcje pacjenta/zestawu w naglowkach swoich sekcji.
	Jedno CTA na cel, bez dodatkowych klikniec i powtorzen pustych stanow. Widoki listy i
	empty korzystaja z tych samych akcji; naglowki zachowuja ikone/licznik przy 320px/22px.
- Rozliczenie po zestawach, jako spokojny link; kwota i waluta nie rozdzielaja sie.
	Logika billingu, uprawnienia i kontrakty danych bez zmian. Skeleton zgodny z pulpitem.
- DialogContent zapamietuje opener przed montazem dzieci portalu: obsluguje kontrolowane
	dialogi bez DialogTrigger oraz pola autoFocus, respektujac onCloseAutoFocus konsumenta.
	Regresja odtworzona w testach i potwierdzona na trzech akcjach zywego pulpitu.
- Stare ID pustych CTA zachowane jako aliasy na etykietach kanonicznych przyciskow dashboard-*.
	Migracja E2E do kanonicznych ID pozostaje przed usunieciem aliasow; disabled sprawdzac na button.
- Gate: 724 Vitest + 8 dispatch, type-check i build PASS, lint 0 bledow/165 istniejacych ostrzezen,
	brakujace test IDs 0. Geometria 28 wariantow zywej strony light/dark 18/22px; screeny desktop/mobile.
	Szczegoly dowodow i brakow w istniejacym runie. Bez commitow, zapisu klinicznego i pelnego E2E;
	to korekta jednego ekranu, nie zamkniecie SPEC ani akceptacja pilota.

### 2026-09-07 - Wyrównanie i hierarchia profilu

- Akcje profilu zgrupowane z tożsamością pacjenta na desktopie; osobny zawijany wiersz na mniejszych ekranach.
- Wspólny `StatTiles variant="summary"` wycisza liczby pomocnicze bez zmiany wcześniejszych wariantów.
- Nagłówki planów i obu sekcji notatek mają spójny rytm; kolumna notatek zachowuje miejsce na przycisk także przy 22px.
- Nazwa karty planu zawija się, kompaktowy `ScheduleSummary` przenosi grupy dat/częstotliwości do nowego wiersza. Zachowane wartości, callbacki i test IDs.
- Dopasowany skeleton. Pomiar na żywym profilu: różnica osi nagłówków 11px -> 0px.
- Browser: 28 kombinacji 320/390/768/1024/1280/1440/1920px, light/dark, 18/22px;
	przy 22px długie syntetyczne nazwisko i e-mail. Geometria w tymczasowej kopii DOM bez skryptów,
	bez overflow strony, uciętych danych tożsamości/harmonogramu ani rozjechanych nagłówków kolumn.
- Gate końcowy: lint 0 błędów / 165 istniejących ostrzeżeń, test IDs 0 braków, type-check PASS,
	712 testów Vitest + 8 dispatch PASS, build PASS. Błąd typu w nowej próbce testowej naprawiony przed końcowym gate.
- Bez zapisu danych klinicznych; nie jest to pełny odbiór pilota ani E2E.

### 2026-09-07 - Korekta po screenach użytkownika

- Odbiór prowadzony widok po widoku; aktualny zakres: pulpit, lista/profil pacjenta i rama kreatora.
- Naprawiono podwójny obrys nazwy planu u źródła: globalny focus w warstwie bazowej.
- Puste notatki mają jeden komunikat bez drugiej ikony i nagłówka (`EmptyState density="inline"`).
- `npm run validate`: PASS, 708 testów Vitest + 8 dispatch, typy, build, zero brakujących test IDs;
	lint: zero błędów, 165 istniejących ostrzeżeń.
- VSC na zalogowanym koncie testowym `https://localhost:3000`: focus nazwy po kliknięciu
	i Tab, pojedynczy ring w light/dark. Motyw dark sprawdzony chwilową zmianą klasy, bez zmiany preferencji.
- Brak zapisu danych klinicznych. Istniejący GraphQL 400 `GetPatientWorkoutSessions` (`from`/`to`)
	pozostaje poza zakresem; pełny odbiór aktywności i E2E nadal otwarte.

### 2026-09-07

- Rozpoczeto implementacje zaakceptowanego planu. Status: w toku.
- Wdrozone: wspolny kontrakt preferencji, light default, bezpieczny storage, zgodny font
	bootstrap/provider, Toaster zgodny z rozwiazanym motywem i dostepne radio groups ustawien.
- Wdrozone: jawny wariant Tailwind dark oparty na `.dark-theme`, pary tokenow light/dark/high
	contrast, spokojne PageHero/StatTiles/Button/Card/Dialog i pary kolorow trzech konsumentow.
- `npm run validate`: PASS (640 Vitest + 8 dispatch, typy, lint bez bledow, test IDs i build).
- Podglad komponentow w VSC: geometria 320/390/768/1440px light/dark bez overflow;
	22px przy 320px oraz Escape w dialogu sprawdzone. Nie jest to odbior calego portalu.
- Nastepne kroki: zalogowany shell i pilot pacjenta, potem zatwierdzenie przed migracja modulow.
	Dalsze testy natywnego pointer/keyboard, cold-load filmstrip i E2E Dev Full pozostaja otwarte.
- Wznawialny stan: `.ai/runs/2026-09-07-light-first-visual-consistency.md`.