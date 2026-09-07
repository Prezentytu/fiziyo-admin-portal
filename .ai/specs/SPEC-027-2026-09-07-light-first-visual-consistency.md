# SPEC-027 - Light-first visual consistency

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