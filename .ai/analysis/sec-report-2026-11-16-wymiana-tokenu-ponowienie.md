# Security review: ponowienie wymiany tokenu i błąd zamiast zapytania bez autoryzacji

## Scope

Gałąź `agent/e2e-blokery-panelu-1116`, commit `fix(auth): ponowienie przerwanej wymiany tokenu…`.
Zmienione: `src/graphql/providers/BackendAuthTokenProvider.ts`, nowy `src/graphql/providers/tokenExchangeRetry.ts`,
`src/graphql/links/authLink.ts`, opcjonalny `signal` w `tokenExchangeService.exchangeClerkToken`, przycisk
„Spróbuj ponownie” na stronie pacjenta.

Bez zmian: `OrganizationGuard`, `decideAdminAccess`, `tokenCache`, `src/proxy.ts`, kontrakt GraphQL i endpoint
`/api/token-exchange/clerk`. Do GraphQL dalej idzie tylko JWT backendu.

## Findings and mitigation

- Informational (poprawa): gdy wymiana się nie udała, `AuthLink` wysyłał zapytanie bez nagłówka `Authorization`.
  Teraz provider po trzech próbach rzuca `BackendTokenUnavailableError`, a link kończy operację błędem. Mniej
  zapytań bez autoryzacji do backendu; dane i tak chronił backend.
- Informational: ponowienie obejmuje tylko błędy bez odpowiedzi (sieć, przerwanie, limit czasu) oraz 408/429/5xx.
  401, 403 (w tym `PATIENT_NOT_ALLOWED_ON_ADMIN`) i 404 nie są ponawiane i czyszczą cache jak wcześniej, więc
  pacjent dalej nie dostaje tokenu panelu (`isPatientToken` przed `saveBackendToken` bez zmian).
- Informational: nieudana wymiana nie zostaje w pamięci (`exchangePromise` zerowany w `finally`), a cache
  `sessionStorage` dostaje token wyłącznie po udanej wymianie i kontroli roli. Brak ścieżki, w której zapytanie
  dostaje token innego użytkownika: kontrola `isTokenForCurrentUser` bez zmian.
- Informational: trzy próby po 8 s z przerwami 0,5 s i 1 s to najwyżej 3 żądania na operację użytkownika;
  współbieżne zapytania dzielą jedną wymianę, więc nie ma wzmocnienia ruchu na endpoint wymiany.
- Informational: logi tylko w trybie deweloperskim, bez tokenu (`console.warn` z błędem, którego treść to status
  i ciało odpowiedzi backendu, bez JWT).

Must-check list: pacjent na ścieżkach admina — bez zmian; token w cache wiązany z userem — bez zmian;
`organizationId` — bez zmian; logi — bez tokenów.

## Next steps — go deeper

- `E2E Dev Full` po merge'u: logowanie i natychmiastowe przejście na `/patients/<id>` bez czekania na wymianę
  (dziś `fiziyo-tests` czeka na udaną wymianę w fixture `therapistPage`; po wdrożeniu można to oczekiwanie zdjąć).
- `OrganizationGuard` wymienia token osobno i nie zapisuje wyniku, więc po zalogowaniu idą dwie wymiany naraz.
  Wspólny provider dla guardu i Apollo to osobna zmiana.

## Similar hotspots

- `src/components/layout/OrganizationGuard.tsx:101` — własna wymiana bez limitu czasu; przy zawieszonym żądaniu
  guard zostaje na szkielecie ładowania.
- `src/app/(dashboard)/onboarding/page.tsx:55`, `src/app/(auth)/finalizing/page.tsx:56` — wymiana w pętli/polling,
  bez limitu czasu pojedynczego żądania.
