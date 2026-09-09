# Runtime security dependency updates

## Cel biznesowy

Usunac znane podatnosci runtime bez zmiany polityki dostepu. Osobna zgoda
uzytkownika 2026-09-08: Tak, napraw lokalnie w osobnym etapie.
Audit poczatkowy --omit=dev: 2 critical i 8 high (liczba pakietow, nie incydentow).

## Zakres

Clerk 6.38.3 -> 6.39.6; Next 16.1.6 -> 16.3.4, zgodne bundle-analyzer i ESLint
config. Aktualizacja powiazanych zaleznosci przechodnich w istniejacych ranges.
Bez Clerk 7, zmiany proxy/polityki auth/tenant, sekretow, deploy lub commit/push.
Brak GraphQL/DTO/UI/data-testid changes.

## Risk Assessment

- Critical GHSA-vqx2-fgx2-5wq9: middleware matcher bypass. Obecny proxy uzywa
  negacji isPublicRoute, ktora wg advisory blokuje ten konkretny bypass.
  Nie stwierdzono wykorzystania ani wycieku. Upgrade usuwa podatny dependency.
- High GHSA-w24r-5266-9c3c: combined authorization predicates; patch w 6.39.3+.
  Nie zmieniamy zasad dostepu, sesji lub token exchange.
- High: Next middleware/cache/DoS advisory ranges; aktualizacja do stabilnego
  16.3.4 wymaga build/test zgodnosci bez obchodzenia compiler failures.

## Verification plan

- npm audit --omit=dev przed/po; nie utozsamiac braku advisory z pelnym security GO.
- Faktyczny proxy z realnym matcherem Clerka i mockiem protect, bez sieci:
  public paths bez auth, private/API zawsze protect, odrzucenie propagowane.
- Istniejace adminAccessDecision regresje pacjent/rola/stan, pelny validate.
- Live sign-in/logout/account switching i prod-safe pozostaja wymagane przed
  publikacja, lecz unverified w lokalnym zadaniu bez deployow.

## Changelog

- 2026-09-08: zgoda na scoped runtime updates po wykryciu advisory podczas CI pracy.