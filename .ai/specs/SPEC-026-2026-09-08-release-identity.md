# Build-bound release identity

## Cel biznesowy

Dowod E2E musi obserwowac wdrozony admin, nie tylko deklaracje SHA w dispatchu.
Zgoda uzytkownika 2026-09-08 obejmuje lokalne metadata admina i kontrakty CI
w trzech repo, bez deploy, sekretow i zmian polityki auth.

## Architektura

Next headers() zapisuje podczas builda naglowki dla istniejacej publicznej
strony /sign-in/:path*. Pure helper wybiera tylko SHA, deployment ID i API origin.
Nie korzysta z runtime env do oznaczania juz zbudowanego artefaktu.
Zrodla: systemowe VERCEL_GIT_COMMIT_SHA, VERCEL_DEPLOYMENT_ID, repo owner/slug
oraz istniejace NEXT_PUBLIC_API_URL. Bez nowych zmiennych lub ich wartosci.
Brak obu wspolrzednych lokalnie daje brak naglowkow, nigdy fikcyjna tozsamosc;
czesciowe/niepoprawne dane blokuja build. System vars wymagaja wlaczenia dostepu
w Vercel; ustawienia cloud pozostaja unverified i nie sa zmieniane.

## Interfejsy

- x-fiziyo-release-schema: 1
- x-fiziyo-admin-sha: pelny lowercase SHA
- x-fiziyo-deployment-id: dpl_ + identyfikator alfanumeryczny
- x-fiziyo-api-origin: allowlistowany origin DEV lub PROD API
- Cache-Control: private, no-store dla tozsamosci strony logowania

Brak GraphQL/DTO aplikacji, UI, nowych routes i data-testid. Auth proxy bez zmian.
Consumer E2E odczytuje naglowki HEAD przed/po suites, wymaga stabilnego ID i SHA
oraz oczekiwanego API origin. Manifest v2; v1 pozostaje dowodem bez tej obserwacji.

## Risk Assessment

- Dispatch: dokladny DEV URL lub Development wymaga zgodnych live headers i API SHA;
  Production uruchamia tylko prod-safe po kontroli admin SHA. Generic Preview
  nie jest przekierowywane na shared DEV i nie tworzy statusu sukcesu. Nazwa/ref
  galezi nie sluzy do certyfikowania tozsamosci deploymentu.
- High: sam SHA nie oznacza deploymentu/env. Wymagamy rowniez ID i API origin.
- High: build code moze klamac. Obserwacja nie jest podpisanym provider attestation;
  nadal potrzebna walidacja przez Vercel API, image/SDL i cross-repo lock.
- Medium: proxy/CDN moze usunac naglowki. Brak to blokada dowodu, nie fallback.
- Low: publiczna identyfikacja commita i deploymentu; zadnych credentiali/PII.

## Verification plan

Vitest: pelne metadata, brak lokalnie, czesciowe dane, obce repo, malformed SHA/ID,
obcy API origin, whitelist output. Build sprawdza integracje Next headers.
E2E tooling fixtures: v1 backward compatibility, v2 stable before/after oraz
missing/mismatched headers. Live DEV response i Vercel settings pozostaja unverified.

## Changelog

- 2026-09-08: dodano build-bound identity; bez zmian autoryzacji i deployow.