# Reguły recenzji — fizjo-app

Aplikacja medyczna, wielotenantowa, z danymi pacjentów. Recenzja jest niezależną ścieżką do prawdy o tym diffie, nie drugą wycieczką po architekturze.

## Co blokuje, a co nie

- Blokujące jest wyłącznie **udowodnione** złamanie kryterium akceptacji, reguły bezpieczeństwa albo kontraktu. Podaj ścieżkę i powód.
- Prawdopodobne ryzyko, pomysł na hardening poza zakresem ticketu i uwagi stylistyczne to **notatki**, nie blokady.
- Nigdy nie przedstawiaj podejrzenia jako faktu. Oznacz każde znalezisko: udowodnione, prawdopodobne albo niezweryfikowane.
- Jeśli nie dało się uruchomić sprawdzenia, napisz „niezweryfikowane". Niezweryfikowane nigdy nie blokuje i nigdy nie jest zarzutem wobec autora.

## Bezpieczeństwo — zawsze blokujące

- Resolver GraphQL albo kontroler REST bez `[Authorize]` i bez jawnego `[AllowAnonymous]`.
- `[Authorize]` z HotChocolate **nie chroni kontrolerów REST** — kontroler wymaga własnego atrybutu.
- Zapytanie do bazy albo resolver bez zawężenia do organizacji/tenanta, gdy dane należą do tenanta.
- Dane pacjenta, e-maile, identyfikatory zewnętrzne albo fragmenty tokenów w logach, komunikatach błędów, testach lub snapshotach.
- Sekret, klucz, certyfikat albo plik `.env` w diffie.
- Zmiana w token-exchange, rolach, uprawnieniach lub zakresie tenanta bez towarzyszącego testu.

## Kontrakt

- Zmiany GraphQL są **additive-first**: nowe pole, potem deprecjacja starego. Usunięcie albo zmiana typu istniejącego pola to blokada bez wpisu w `BACKWARD_COMPATIBILITY.md`.
- Kontrakt jest współdzielony z `fiziyo-admin-portal` i `fiziyo-tests`. Zmiana schematu bez odpowiednika po stronie klientów to znalezisko.

## Jakość

- `any` w TypeScript i `useLazyQuery` w Apollo są zabronione.
- Walidacja wyłącznie w UI jest niewystarczająca — reguła domenowa należy do backendu.
- Mutacja z `errorPolicy: all` musi sprawdzać potwierdzenie w `data`; spełniona obietnica nie jest dowodem sukcesu.

## Copy pacjenta w iOS

Zabronione słowa w tekstach widocznych dla pacjenta: `premium`, `subskrypcja`, `paywall`, `IAP`, `kup`, `odnów dostęp`. Ograniczony dostęp opisujemy jako plan zarządzany przez gabinet.

## Czego nie recenzować

Plików w teczce ticketu (`ticket.md`, `notes.md`, `review-*.md`, `outcome.md`) oraz formatowania istniejącego poza diffem.
