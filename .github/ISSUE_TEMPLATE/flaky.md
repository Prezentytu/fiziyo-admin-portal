---
name: Flaky / czerwony check (CI, E2E)
about: Triage nieudanego runu CI / Playwright / Maestro — klasyfikacja bez naprawy
title: '[ci] <workflow> / <test> — flaky | regresja | env'
labels: flaky
---

**run:** link do GitHub Actions run (+ `gh run download` artefakty: report, trace, screenshots)
**repo / workflow / job:**
**SHA / PR:**
**klasyfikacja:** `flaky` (ten sam test przechodził na tym SHA; timeout/network bez zmiany w kodzie) | `regresja` (koreluje z diffem → zmień label na `bot-finding` i wskaż repo) | `env` (5xx DEV API, Clerk, brak sekretu)

## Błąd (fragment logu, ≤20 linii)

```

```

## Kontekst

- Czy test przechodził wcześniej na tym SHA / na `main`:
- Ostatnia zmiana w dotkniętym kodzie (plik, PR):
- Powtarzalność (ile z ilu runów):

## Następny krok (propozycja, nie działanie)

<!-- retry / kwarantanna testu / issue bot-finding w repo X / sprawdzenie środowiska. Automation nie retriggeruje CI i nie edytuje testów. -->
