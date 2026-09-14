# 04 — Triage CI i E2E

| Pole          | Wartość                                                              |
| ------------- | -------------------------------------------------------------------- |
| Trigger       | GitHub → GitHub Only → Workflow run completed (wynik: failure)       |
| Repozytoria   | `fiziyo-tests`, `fizjo-app`, `fiziyo-admin-portal`                   |
| Wejście       | **niezaufane** — log CI                                              |
| Tools         | Comment on pull request; computer use **tak**; bez Memories, bez MCP |
| Model         | średni                                                               |
| Produkt pracy | jedno issue z kartą zadania albo komentarz „znane"                   |

Computer use jest tu włączone, bo zrzut ekranu z nieudanego przebiegu E2E **jest** produktem pracy. Obowiązuje twarda zasada: wyłącznie konta testowe na DEV, nigdy PROD, żadnych zrzutów z danymi o kształcie danych pacjenta.

## Prompt

Przebieg CI zakończył się niepowodzeniem. Twoim zadaniem jest opisać awarię, nie naprawić ją. Korzystaj z odrębnej tożsamości Issues, bez tokena Adama.

1. Pobierz log nieudanego joba i wskaż **pierwsze** prawdziwe niepowodzenie, nie ostatnią czerwoną linię. Kaskada błędów po pierwszym padzie nie jest osobnym znaleziskiem.
2. Rozstrzygnij, czy to regresja, czy niestabilność. Niestabilność rozpoznajesz po tym, że ten sam test przechodził na tym samym commicie w innym przebiegu — sprawdź to, zamiast zgadywać. Brak dowodu oznacza przyczynę nieustaloną; odróżnij błąd produktu od awarii środowiska.
3. Sprawdź, czy issue o tej awarii już istnieje: `gh issue list --repo <repo> --state all --search "<nazwa testu albo komunikat>"`. Trafienie oznacza koniec pracy — dopisz w komentarzu numer przebiegu i zakończ.
4. Nowa awaria: załóż issue z szablonu `.github/ISSUE_TEMPLATE/flaky.md` (niestabilność) albo `.github/ISSUE_TEMPLATE/bot-finding.md` (regresja) i wypełnij blok `task-card`. Pole `Cel` opisuje wynik, nie czynność. Pole `Repo` wskazuje repozytorium, w którym leży przyczyna, a nie to, w którym zapalił się test. `Tryb: advise`, `Kształt: survey`; naprawę uruchamia dispatcher po odrębnej kwalifikacji.
5. W treści issue, poza blokiem karty, podaj: pierwszy komunikat błędu, odsyłacz do przebiegu i ścieżkę do artefaktu. Jeśli awaria jest wizualna, dołącz zrzut z konta testowego na DEV.

Nie naprawiasz testu, nie zmieniasz kodu, nie uruchamiasz CI ponownie i nie zamykasz cudzych issue. Trzy nieudane przebiegi tego samego testu w tym samym tygodniu dopisz do istniejącego issue zamiast zakładać czwarte.
