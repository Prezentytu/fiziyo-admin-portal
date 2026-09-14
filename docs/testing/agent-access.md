# Agent access — portal

Ten plik jest wskaźnikiem. Konta testowe, seed i pełna tabela DEV/PROD
żyją w `fizjo-app/docs/testing/agent-access.md`. Nie kopiuj tu haseł,
e-maili ani tokenów.

## Co agent portalu może otworzyć

- Panel DEV: `https://devportal.fiziyo.pl`
- DEV GraphQL wskazany w środowisku Cloud Agenta, nie w tym pliku
- Wyłącznie konta syntetyczne z dokumentu w `fizjo-app`

## Czego agent nie otwiera

- `https://portal.fiziyo.pl` i każda instancja Clerk / API / DB oznaczona jako PROD
- Panele wdrożeń, store i sekrety repozytorium
- Cudze organizacje i dane, które wyglądają jak prawdziwy pacjent

Zrzut ekranu tylko z konta testowego na DEV. Jeśli w DEV widać dane kliniczne
prawdziwej osoby: przerwij, nie rób zrzutu, zgłoś issue z `needs-adam`.
