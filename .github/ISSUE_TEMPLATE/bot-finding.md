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

## Dla triage (wypełnia Szef Sztabu / Adam)

- [ ] `agent-fix` — wąski, w kodzie produktu → karta zadania dla Cloud Agenta
- [ ] `needs-clarification` — jedno pytanie: …
- [ ] `duplicate` of #
- [ ] `needs-adam` — dlaczego: …
