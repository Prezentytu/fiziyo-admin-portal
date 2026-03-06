---
name: implement-spec
description: Implementuje specyfikacje etapami w modelu spec-first, z gate'ami jakosci, testami i aktualizacja dokumentacji. Uzyj gdy uzytkownik prosi o implementacje SPEC lub wdrozenie zaplanowanej funkcjonalnosci wieloetapowej.
---

# Skill: Implementacja specyfikacji (FiziYo)

Ten skill prowadzi implementacje odczytanej specyfikacji krok po kroku i wymusza jakosc wykonania.

## Pre-flight (obowiazkowe)

1. Przeczytaj pelna specyfikacje z `.ai/specs/`.
2. Przeczytaj root `AGENTS.md` oraz wszystkie pasujace AGENTS.md z Task Routera.
3. Przeczytaj `.ai/lessons.md` i zanotuj ryzyka regresji.
4. Zmapuj fazy z dokumentu na konkretne pliki do modyfikacji.
5. Potwierdz zakres z uzytkownikiem, jesli spec ma kilka wariantow implementacji.

## Workflow fazowy

Dla kazdej fazy wykonaj sekwencje:

1. **Plan fazy**
   - Wypisz pliki do modyfikacji.
   - Wypisz zaleznosci i ryzyka.
2. **Implementacja**
   - Wprowadz najmniejsza mozliwa zmiane.
   - Trzymaj sie istniejacych wzorcow komponentowych i GraphQL.
3. **Testy**
   - Dodaj/uzupelnij testy jednostkowe dla logiki biznesowej.
   - Uruchom co najmniej `npm run test:run` dla krytycznych zmian.
4. **Review gate**
   - Uruchom checkliste z `code-review` skill.
   - Popraw wszystkie problemy high/critical.
5. **Dokumentacja**
   - Zaktualizuj odpowiednia specyfikacje (changelog, decyzje, ryzyka).
   - Jesli odkryto nowy antywzorzec, dodaj wpis do `.ai/lessons.md`.

## Zasady implementacji w FiziYo

- Frontend: Next.js App Router + React 19 + TypeScript strict.
- Dane: Apollo GraphQL (`useQuery` + `skip`, bez `useLazyQuery`).
- Formularze: `react-hook-form` + `zod` + `zodResolver`.
- UI: preferuj `@/components/ui` i `@/components/shared`.
- Test IDs: kazdy interaktywny element musi miec `data-testid`.
- Bezpieczenstwo typow: zakaz `any`, preferuj `unknown` + narrowing.

## Quality gates (must pass)

- Lint dla zmienionych plikow nie zgłasza nowych bledow.
- Zmieniona logika ma pokrycie testami.
- UI jest theme-safe (light/dark) i nie degraduje kontrastu.
- Dialogi wspieraja `Cmd/Ctrl+Enter` i `Escape`.
- Spec i implementacja sa zsynchronizowane.

## Subagent strategy

- Uzywaj subagentow do niezaleznych strumieni pracy (np. osobno UI, osobno testy).
- Nie rozbijaj bardzo malych zmian na subagentow.
- Sekwencyjnie realizuj kroki zalezne (typy -> logika -> UI -> testy).

## Finalizacja

Po zamknieciu wszystkich faz:

1. Uruchom minimalny pakiet weryfikacji (`lint` + `test:run`).
2. Przekaz uzytkownikowi:
   - co zostalo wdrozone,
   - jakie testy uruchomiono,
   - jakie ryzyka pozostaja.
