# Light-first FiziYo

Spec: ../specs/SPEC-027-2026-09-07-light-first-visual-consistency.md

## Scope

Realizacja etapowa zaakceptowanego planu. Bez commitow/pusha (brak osobnej zgody),
bez zmian kontraktow/auth i bez pomijania bramki odbioru wizualnego pilota.

## Progress

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

1. Kontynuuj w zalogowanej sesji testowej na https://localhost:3000 w przegladarce VSC.
	Nie podawaj hasla/tokenow agentowi; nie uzywaj danych realnych pacjentow do screenshotow.
2. Kontynuuj od 2.3 i 3.1. Przed migracja pozostalych modulow zatwierdz pilot.
3. Podglad bez danych: `node scripts/ui-preview.mjs` -> http://127.0.0.1:3100.
	 Korzysta z istniejacego Vite; nie jest routem ani zaleznoscia produkcyjna.