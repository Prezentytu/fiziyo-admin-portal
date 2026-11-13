# Security review: @clerk/nextjs 6 → 7 (Clerk Core 3)

## Scope

Gałąź `chore/deps-aktualizacja`, commit `chore(deps): @clerk/nextjs 7 …` i poprawka `/finalizing`.
Zmienione: wersja SDK, import `useSignIn`/`useSignUp` z `@clerk/nextjs/legacy` (sign-in, register,
verify, reset-password), typ `EmailAddressResource` z `@clerk/nextjs/types`, `getToken().catch(() => null)`
w `src/app/(auth)/finalizing/page.tsx`.

Bez zmian: `src/proxy.ts` (`clerkMiddleware` + `auth.protect()`), `BackendAuthTokenProvider`,
`tokenExchangeService`, `decideAdminAccess`, kontrakt GraphQL. Do GraphQL dalej idzie tylko JWT backendu.

Źródło zmian SDK: `packages/nextjs/CHANGELOG.md` w `clerk/javascript`, sekcja 7.0.0 Major Changes.

## Findings and mitigation

- Low (naprawione): `getToken()` bez sieci rzuca `ClerkOfflineError` zamiast zwracać `null`. Na `/finalizing`
  wywołanie stało poza `try`, więc odrzucenie przerywało polling i ekran zostawał na ładowaniu. Teraz
  błąd znaczy „jeszcze nie gotowe” jak dawny `null`. Test: `src/app/(auth)/finalizing/page.test.tsx`.
- Informational: `BackendAuthTokenProvider.getToken` łapie wyjątek i zwraca `null`; z sieci offline nie
  serwuje tokenu z cache, więc nie ma ścieżki, w której inny użytkownik dostaje cudzy JWT.
- Informational: `OrganizationGuard` i onboarding wołają `getToken()` w `try`; offline trafia w gałąź
  „inne błędy”, która tylko pokazuje UI. Dane i tak chroni backend (brak tokenu = brak zapytań).
- Informational: `auth.protect()` dla server actions zwraca teraz 401 zamiast 404. Panel nie ma server actions
  chronionych przez middleware; strony dalej przekierowują na logowanie.
- Informational: `@clerk/nextjs/legacy` to wspierane wejście Core 3 z dawnym API `useSignIn`/`useSignUp`
  (`setActive`, `isLoaded`, `attemptFirstFactor`). Przepływy logowania nie zmieniły logiki.
- Informational: brak `secretKey` w opcjach runtime `clerkMiddleware`, więc nowy wymóg `CLERK_ENCRYPTION_KEY`
  nie dotyczy panelu.

Must-check list: pacjent na ścieżkach admina — bez zmian (`decideAdminAccess`, `isPatientToken`); token w
cache wiązany z userem — bez zmian (`isTokenForCurrentUser`); `organizationId` — bez zmian; logi — nowa
ścieżka nic nie loguje.

## Next steps — go deeper

- Bramka `E2E Dev Full` po merge'u na devportal: logowanie hasłem, rejestracja z kodem e-mail, reset hasła,
  zaproszenie. Testy jednostkowe mockują Clerk i nie potwierdzają zachowania prawdziwego SDK.
- Migracja z `legacy` na API sygnałów `useSignIn`/`useSignUp` osobnym PR, zanim Clerk usunie wejście legacy.

## Similar hotspots

- `src/app/(dashboard)/onboarding/page.tsx:52`, `src/components/layout/OrganizationGuard.tsx:101` — `getToken()`
  w `try`, offline obsłużony.
- `src/app/(auth)/invite/page.tsx` — przepływ zaproszenia na `useAuth`/`useClerk`, bez zmian API.
