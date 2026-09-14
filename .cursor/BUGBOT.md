# Reguły recenzji — fiziyo-admin-portal

Panel gabinetu, wielotenantowy, ze wspólnym GraphQL. Recenzja jest niezależną
ścieżką do prawdy o tym diffie, nie drugą wycieczką po architekturze.

## Co blokuje, a co nie

- Blokujące jest wyłącznie **udowodnione** złamanie kryterium akceptacji, reguły
  bezpieczeństwa albo kontraktu. Podaj ścieżkę i powód.
- Prawdopodobne ryzyko, pomysł na hardening poza zakresem ticketu i uwagi
  stylistyczne to **notatki**, nie blokady. `PASS` może je zawierać.
- Nigdy nie przedstawiaj podejrzenia jako faktu. Oznacz każde znalezisko:
  udowodnione, prawdopodobne albo niezweryfikowane.
- Jeśli nie dało się uruchomić sprawdzenia, napisz „niezweryfikowane".
  Niezweryfikowane nigdy nie blokuje i nigdy nie jest zarzutem wobec autora.

## Bezpieczeństwo — zawsze blokujące, gdy udowodnione

- Zapytanie albo mutacja bez `organizationId` albo innego scope tenanta, gdy
  dane należą do organizacji.
- Dane pacjenta, e-maile, identyfikatory zewnętrzne albo fragmenty tokenów
  w logach, komunikatach błędów, testach lub snapshotach.
- Sekret, klucz, certyfikat albo plik `.env` w diffie.
- Zmiana w token-exchange, rolach, uprawnieniach lub zakresie tenanta bez
  towarzyszącego testu i bez skillu `sec-report`.

## Kontrakt i typy

- Zmiany GraphQL są **additive-first**. Usunięcie albo zmiana typu istniejącego
  pola to blokada bez wpisu w `BACKWARD_COMPATIBILITY.md`.
- `any` i `useLazyQuery` są zabronione. Mutacja z `errorPolicy: all` musi
  sprawdzać potwierdzenie w `data`.

## UI portalu

- Nowe interaktywne elementy mają `data-testid` z prefiksem modułu.
- Style buduj na tokenach (`bg-surface`, `text-foreground`, `border-border`).
  Hardcoded `zinc`/`gray`/`slate`/`white`/`black` na kontenerach blokuje, gdy
  psuje light albo dark.
- W UI terapeuty nie używaj słowa „dawkowanie" — „podstawowe parametry"
  albo nazwy pól.
- Nowy dialog: `Escape` zamyka, `Cmd/Ctrl + Enter` odpala główną akcję,
  stopka `justify-between` (Anuluj lewo, CTA prawo).

## Czego nie recenzować

Plików w teczce ticketu oraz formatowania istniejącego poza diffem.
Reguł iOS, IAP i atrybutów .NET — to nie jest to repozytorium.
