---
name: Bot finding (bug z DEV)
about: Zgłoszenie od bota (Tester Fizjo, Recepcja Zgłoszeń, triage E2E) albo człowieka testującego DEV
title: '[obszar] objaw w ≤70 znakach'
labels: bot-finding
---

<!-- Pola obowiązkowe. Brak danych = „NIE ZWERYFIKOWANO”, nie domysł. Zero danych pacjentów, haseł, tokenów. Screenshoty tylko z kont testowych. -->

**source:** `gdoc/<karta>/<nr>` | `tester/<YYYY-MM-DD>/<nr>` | `e2e/<run-id>` | `human`
**env:** DEV — `devportal.fiziyo.pl` | `devapp` (web build pacjenta) | API DEV | Expo dev client
**konto:** `fizjoterapeuta-bot` | `pacjent-bot-1` | `pacjent-bot-2` (rola, bez hasła)
**severity:** P0 (blokuje flow) | P1 (błąd z obejściem) | P2 (kosmetyka)

## Kroki

1.
2.
3.

## Oczekiwane

## Faktyczne

<!-- screenshot / nagranie z konta testowego -->

## Cytat zgłaszającego (≤25 słów, jeśli jest)

> …

## Podejrzewany obszar

<!-- repo, moduł, plik — tylko jeśli oczywiste; inaczej puste. Nie proponuj fixu. -->

## Karta zadania

```task-card
Cel:
Tryb: advise
Kształt: slice
Repo: Prezentytu/fiziyo-admin-portal
Pierwszy artefakt:
Zakres:
Stop: gdy validate czerwone po 2 próbach | gdy potrzebny Ask First | po 1 PR
Zlecił:
Źródło:
```

<!--
Kolejność dla bota, inaczej intake zobaczy kartę w połowie wypełnioną:
  1. utwórz issue BEZ etykiety,
  2. uzupełnij kartę (`gh issue edit`),
  3. dopiero teraz nadaj `bot-finding` albo `from-przemek`.

Źródło: 12 hex — sha256 z treści po NFKC, lowercase, zwinięciu białych znaków i trim.
        W repo: node scripts/task-card.mjs source-id "linia źródłowa"
        Bez repo: printf '%s' "$(echo "$linia" | tr 'A-Z' 'a-z' | tr -s '[:space:]' ' ')" | shasum -a 256 | cut -c1-12

Tryb: advise na wejściu — zgłoszenie jest przyjmowane, nie naprawiane.
      Promocja do naprawy (robi Szef Sztabu / Adam): etykieta `agent-fix` tylko kwalifikuje.
      `agent-promote.yml` nie przepisuje karty i nie uruchamia workera.
      Start naprawy: chroniony dispatch w agent-ops, nie ręczna edycja karty.
-->

## Dla triage (wypełnia Szef Sztabu / Adam)

- [ ] `agent-fix` — wąski, w kodzie produktu → karta zadania dla Cloud Agenta
- [ ] `needs-clarification` — jedno pytanie: …
- [ ] `duplicate` of #
- [ ] `needs-adam` — dlaczego: …
