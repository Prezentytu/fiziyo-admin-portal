# Zaproszenia do organizacji

- Spec: SPEC-011
- Owning repo: fiziyo-admin-portal
- Status runu: ready-for-review
- Upoważnienie: prośba użytkownika o poprawkę, testy i PR oraz dwa uzupełnienia w tej samej rozmowie.
- Zakres: portalowe okno udostępniania, Ustawienia → Organizacje, publiczna strona zaproszenia, testy i opis PR #339.
- Acceptance: długi adres mieści się w oknie. Schowek zmienia się po kliknięciu przycisku. Przyjęcie z linku i ustawień aktywuje nową organizację. Błąd przełączenia pozwala je ponowić.

## Repo i baseline

- Checkout: `fiziyo-admin-portal-wt-zaproszenie-link`, branch `agent/org-zaproszenie-link-layout`, `159d63f1` po pierwszej poprawce. Czysty checkout na starcie uzupełnienia.
- Instrukcje: portalowe AGENTS, organizacja, ustawienia, GraphQL i specy.
- Backend: odczyt istniejącej mutacji akceptacji w `fizjo-app`. Przełączenie korzysta z istniejącego kontraktu.

## Dowody

- Przed poprawką testy integracyjne odtworzyły brak przełączenia po przyjęciu linku z obu wejść.
- Cztery pliki Vitest pokrywające generowanie, dołączenie i przełączanie. 14 testów zaliczonych. Przypadki dołączenia używają prawdziwego kontekstu organizacji i symulowanych odpowiedzi API.
- `npm run validate` zakończyło się pomyślnie. 3676 testów zaliczonych, 2 oczekiwane niepowodzenia. `npm run agent:check` i 5 testów indeksu specyfikacji zaliczonych.
- Chrome i WebKit w obu motywach na syntetycznych danych. Zweryfikowano układ dla szerokości 320–1280 px, ręczne kopiowanie, przełączenie po wklejeniu i ponowienie przełączenia przy bezpośrednim linku.
- Zrzuty przed i po znajdują się w `docs/screenshots/zaproszenie-organizacja/`.

## Handoff

- Następny krok: sprawdzenie i review draftu PR #339.
