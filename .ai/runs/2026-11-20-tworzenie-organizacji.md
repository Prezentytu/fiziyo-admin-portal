# Tworzenie organizacji z interfejsu panelu

- Issue / spec: zlecenie Adama 20.11.2026 („Nowej organizacji nie da się założyć z interfejsu portalu”); SPEC-040
- Owning repo: fiziyo-admin-portal
- Status runu: working
- Upoważnienie: zlecenie Adama obejmuje implementację, testy, zrzuty i PR. Merge robi człowiek.
- Writer: Claude Code (sesja lokalna)
- Dozwolone pliki: `src/components/organization/*` (dialog, hook, schemat), `OrganizationSwitcher`, `ChatSidebar`, `OrganizationsList`, `OrganizationContext`, typy GraphQL, testy, SPEC-040, SPEC-031 (testid), mapa testid
- Wykluczenia: backend `fizjo-app`, kontrakt GraphQL, `/onboarding`
- Acceptance: użytkownik z jedną albo wieloma organizacjami zakłada nową z przełącznika, z menu czatu i z ustawień, a panel od razu się na nią przełącza

## Repo i baseline

- Repo / checkout / branch / HEAD: `fiziyo-admin-portal`, `feat/tworzenie-organizacji` od `origin/main` @ d6f87f59
- Zastane zmiany: nieśledzony `.claude/launch.json`, poza zakresem i bez commita

## Progress

- [x] Przyczyna: menu przełącznika istniało tylko przy co najmniej dwóch organizacjach, a „Utwórz nową organizację” prowadziło do `/onboarding`, który niczego nie tworzy
- [x] Dialog, hook, `enterOrganization` w kontekście, wejścia w trzech miejscach
- [x] Testy: `OrganizationSwitcher.test.tsx` pada na `main` (2/2); blokada podwójnego wysłania sprawdzona przez jej usunięcie (test pada bez niej)
- [x] `npm run validate` (exit 0)
- [x] Zrzuty przed i po w jasnym i ciemnym motywie: `.ai/reports/2026-11-20-tworzenie-organizacji/`
- [x] `sec-report`: `.ai/analysis/sec-report-2026-11-20-tworzenie-organizacji.md`
- [ ] Sprawdzenie na devportal po merge'u (E2E Dev Full i ręczne utworzenie organizacji na koncie testowym)

## Decyzje

- Nowa organizacja staje się aktywna od razu (wymiana tokenu i `setDefaultOrganization`), bo właściciel zakłada ją po to, żeby w niej pracować.
- Gdy organizacja powstała, a przełączenie padło, dialog zamyka się z ostrzeżeniem i nie proponuje ponowienia, bo mutacja nie jest idempotentna.
- `nav-org-switcher-create` zachowuje ID; w `fiziyo-tests` żaden test go nie używa.
- Zrzuty to prawdziwe komponenty z danymi syntetycznymi (render w happy-dom, CSS portalu z Tailwinda, Playwright), tak jak w #270. Lokalny serwer wymaga logowania Clerk na koncie testowym. Menu konta w czacie nie ma zrzutu; jego pozycja ma testid, wpis w SPEC-031 i jest sprawdzana typami oraz lintem.

## Dowody

- Kandydat: `feat/tworzenie-organizacji` (commit w PR)
- Kontrola: `npm run validate`, exit 0, 362 pliki testów, 3657 testów zielonych i 2 oczekiwane porażki, build OK
- Reviewer: `principal-review` FAIL @737c7c06: duplikat organizacji przez odmontowany dialog, mylący toast po błędzie `resetStore`. Poprawki: aaad2cc8, 1cb61dfc. PASS @1cb61dfc. Uwagę P3 (ponowienie listy po błędzie odświeżenia) poprawia 3ed445ab, z testem padającym bez poprawki; `npm run validate` exit 0 na 3ed445ab. Niesprawdzone: create→switch na backendzie DEV oraz dialog nad otwartym Sheetem na mobile (ręcznie po merge'u).

## Handoff

- Następny krok: review PR, merge, potem ręczne utworzenie organizacji na koncie testowym na devportal
- Do backendu (`fizjo-app`): walidacja nazwy, limit tworzenia i odrzucanie kont pacjentów w `CreateOrganization` (P2 w sec-report)
