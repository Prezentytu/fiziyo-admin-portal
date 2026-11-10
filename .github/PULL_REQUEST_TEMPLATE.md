## Intencja

Po co ta zmiana: wynik dla gabinetu, pacjenta albo repo w jednym-dwóch zdaniach, nie lista czynności. Recenzent ocenia zmianę względem tego, nie względem diffa.

## Drzwi

- [ ] Dwukierunkowe: tanio cofnąć (UI, kod bez zapisu danych, rewert wystarczy)
- [ ] Jednokierunkowe: zapis lub kasowanie danych, migracja, publiczny kontrakt API, uprawnienia ról, płatność. Napisz, jak się cofa albo dlaczego się nie da. Taka zmiana dostaje dokładniejsze review.

## Poza zakresem

Czego ta zmiana świadomie nie robi (flaga, backfill, dodatkowe zabezpieczenie, refaktor obok). „Brak”, jeśli nic.

## Sprzątanie

Stary tor, który zostaje: co skasować i po czym poznać, że wolno (albo link do issue). „Brak”, jeśli nic.

## Zmiany

- ...

## Zmiany systemu

Opcjonalne przy drobnej zmianie. Klocki, które zmiana dodaje, rozszerza, składa albo tylko używa. Przy zmianie przepływu między modułami albo z backendem: diagram sekwencji (mermaid).

## Specyfikacja

**Czy istnieje specyfikacja dla tej zmiany?**

- [ ] Tak (ścieżka: `.ai/specs/SPEC-...`)
- [ ] Nie — utworzono nową
- [ ] N/A — drobna zmiana

## Testowanie

Jak przetestowano zmianę. Dowód (komenda i wynik, zrzut z kont testowych), nie „powinno działać”.

## E2E Impact

- [ ] Zmiana dotyka user-facing flow i wymaga aktualizacji/dopisania testu E2E
- [ ] Zaktualizowano `fiziyo-tests/TEST_PLAN.md` (jeśli dotyczy)
- [ ] Zaktualizowano Page Objecty w `fiziyo-tests` (jeśli zmieniono role/label/tekst wykorzystywany przez lokatory)

## Checklist

- [ ] PR targetuje `main` (ludzie i Cloud Agent; draft z brancha `agent/…`)
- [ ] Lint przechodzi (`npm run lint`)
- [ ] Build przechodzi (`npm run build`)
- [ ] data-testid dodane do nowych elementów interaktywnych
- [ ] Zaktualizowano spec changelog (jeśli dotyczy)
