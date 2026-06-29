---
name: root-cause
description: Metodyczne debugowanie do przyczyny zrodlowej zamiast fixow objawowych. Użyj gdy użytkownik prosi - znajdź przyczynę błędu, dlaczego to nie działa, zdebuguj problem, napraw regresję porządnie, ustal root cause, dlaczego test failuje, skąd ten błąd. EN triggers - debug, investigate regression, find root cause, explain failure. Wynik to udowodniona przyczyna zrodlowa, fix source-level, test regresyjny i wpis do .ai/lessons.md.
---

# root-cause

## Kiedy używać

- Gdy występuje błąd runtime, regresja testu albo niespójność cross-repo.
- Gdy fix „objawowy” kusi, ale trzeba usunąć prawdziwą przyczynę.

## Kroki

1. Zbierz dowód: log, stack trace, failing test, repro krok po kroku.
2. Odtwórz problem lokalnie i zawęź do minimalnego miejsca awarii.
3. Ustal przyczynę źródłową (kontrakt, dane, stan UI, cache, autoryzacja, migracja).
4. Wdroż fix source-level, a nie workaround.
5. Dodaj test/regułę, która wykryje ten sam błąd w przyszłości.
6. Dopisz wpis do `.ai/lessons.md` (Problem/Przyczyna/Rozwiązanie/Reguła).
