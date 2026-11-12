# Mapa funkcji panelu

Jeden plik na funkcję panelu gabinetu. Mapa trzyma to, czego nie widać w kodzie: po co funkcja jest, jak do niej dojść kontem testowym, jak sprawdzić, że działa, i na co uważać, zwłaszcza na sprzężenia z innymi funkcjami. Trasy i foldery agent znajdzie sam, więc nie ma ich tu w nadmiarze. Konwencje modułów są w ich `AGENTS.md`, a tu jest zachowanie i przepis na sprawdzenie.

Czytaj plik funkcji, zanim zmienisz tę funkcję albo funkcję, z którą jest sprzężona. Każdy plik ma cztery sekcje: `## Rola`, `## Jak dotrzeć`, `## Jak sprawdzić`, `## Uważaj na`. Ścieżka w backtickach musi istnieć w tym repo, a ścieżka innego repo ma prefiks (`fizjo-app:backend/FizjoApp.Api/Chat/ChatExerciseDoseMapper.cs`, `fiziyo-tests:TEST_PLAN.md`). Pilnuje tego `npm run check:funkcje` (`scripts/check-funkcje.mjs`, część `agent:check`, kopia `fizjo-app:scripts/check-funkcje.mjs`); skrypt sprawdza ścieżki i sekcje, nie prawdziwość zdań.

Ta sama funkcja ma zwykle drugą połowę w aplikacji i backendzie. Mapa `fizjo-app` leży w `fizjo-app:docs/funkcje/` (na przykład `fizjo-app:docs/funkcje/przypisanie-zestawu.md`), a każdy plik tutaj wskazuje swój odpowiednik. Zmiana po jednej stronie sprzężenia to sprawdzenie obu plików.

Mapa, która kłamie, jest gorsza niż jej brak. Gdy zmiana robi zdanie w mapie nieprawdziwym, poprawiasz je w tym samym PR. Gdy przy pracy odkryjesz sprzężenie, którego tu nie ma, dopisz jedną linię do „Uważaj na” z commitem, plikiem albo przypadkiem `fiziyo-tests:TEST_PLAN.md` jako dowodem. Funkcja wycofana znika z mapy razem z kodem.

| Funkcja                                 | Plik                                               |
| --------------------------------------- | -------------------------------------------------- |
| Kompozytor zestawu                      | [kompozytor-zestawu.md](kompozytor-zestawu.md)     |
| Przypisanie zestawu (Assignment Wizard) | [assignment-wizard.md](assignment-wizard.md)       |
| Weryfikacja katalogu                    | [weryfikacja-katalogu.md](weryfikacja-katalogu.md) |
| Tworzenie i edycja ćwiczenia            | [edycja-cwiczenia.md](edycja-cwiczenia.md)         |
| Czat AI i kredyty                       | [czat-ai.md](czat-ai.md)                           |

Konta testowe obu tenantów są w `fizjo-app:docs/testing/agent-access.md`; tutejszy [agent-access.md](../testing/agent-access.md) tylko tam wskazuje. Ich istnienie w Clerk DEV jest tam oznaczone jako `unverified` (§6), więc sprawdzenia z kontem B traktuj jako `blocked`, dopóki §6 nie zejdzie z tego stanu. Konta backoffice (`ContentManager`, `SiteSuperAdmin`) nie mają tam wpisu.
