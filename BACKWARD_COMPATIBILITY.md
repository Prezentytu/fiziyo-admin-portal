# BACKWARD_COMPATIBILITY.md

Kontrakt kompatybilnosci dla FiziYo Admin. Ten dokument jest obowiazkowy przy zmianach, ktore dotykaja surface'ow wykorzystywanych przez:

- panel admin (`fiziyo-admin`),
- aplikacje mobilna (`fizjo-app`),
- backend GraphQL (`.NET + HotChocolate`),
- testy E2E i automaty QA.

## Zasady nadrzedne

1. **Additive-first**: najpierw dodawaj nowe pola/sciezki, dopiero potem deprecjonuj stare.
2. **Brak cichego breakingu**: usuniecie lub zmiana semantyki surface'u wymaga planu migracji.
3. **Spec + review gate**: zmiany kontraktowe musza byc odnotowane w `.ai/specs/` i sprawdzone w code review.
4. **Cross-repo awareness**: zmiana kontraktu moze wymagac zmian w admin, mobile i backendzie.

## Contract surfaces

| #   | Surface                                               | Klasyfikacja       | Kluczowa regula                                                                    |
| --- | ----------------------------------------------------- | ------------------ | ---------------------------------------------------------------------------------- |
| 1   | GraphQL operation shape (query/mutation/subscription) | STABLE             | Nie usuwaj/nie zmieniaj znaczenia istniejacych pol bez migracji                    |
| 2   | GraphQL input fields                                  | STABLE             | Nie zamieniaj pola opcjonalnego na wymagane bez okresu przejsciowego               |
| 3   | Frontend typy i enumy powiazane z backendem           | STABLE             | Zmiany tylko additive-first + aktualizacja obu klientow                            |
| 4   | Shared domain enums i struktury JSONB                 | ADDITIVE-ONLY      | Nie zmieniaj wstecznie semantyki wartosci enum bez deprecacji                      |
| 5   | `data-testid` na krytycznych flow                     | STABLE             | Nie zmieniaj/usuwaj bez rownoleglego update testow                                 |
| 6   | Modulowe `AGENTS.md` i Task Router wskazania          | STABLE             | Nie usuwaj sciezek bez aktualizacji root `AGENTS.md`                               |
| 7   | Rules always-on w `.cursor/rules`                     | STABLE             | Zachowaj lekkie i stale zasady; nie przenos szczegolowej wiedzy do always-on       |
| 8   | Skills workflow (`.ai/skills`)                        | STABLE             | Source of truth pozostaje w `.ai/skills`; `.cursor/skills` jest warstwa generowana |
| 9   | Cross-repo flow admin-mobile-backend                  | FROZEN (logicznie) | Nie lam przeplywu token exchange i organization scope                              |

## Deprecation protocol

Przy zmianie kontraktowej wykonaj:

1. Oznacz stary surface jako deprecated (w spec i dokumentacji).
2. Dodaj surface docelowy (nowe pole/nowa sciezka).
3. Zaktualizuj wszystkie miejsca uzycia (admin + mobile + testy, jesli dotyczy).
4. Dodaj test regresyjny zabezpieczajacy migracje.
5. Usuniecie starego surface'u dopiero po zamknieciu migracji.

## Co jest breaking change

Breaking change to m.in.:

- usuniecie pola GraphQL z odpowiedzi,
- zmiana typu pola na bardziej restrykcyjny bez fallbacku,
- zmiana znaczenia wartosci enum bez migracji,
- usuniecie stabilnych `data-testid` uzywanych przez testy,
- usuniecie wymaganych guide'ow z Task Routera bez zastapienia.

## Co nie jest breaking change

Dozwolone zmiany additive:

- dodanie nowego opcjonalnego pola w GraphQL,
- dodanie nowej wartosci enum (z obsluga default/fallback),
- dodanie nowych test IDs bez usuwania starych,
- rozszerzenie dokumentacji i workflow bez zmiany istniejacych kontraktow.

## Checklist review (kontrakty)

Przed merge odpowiedz:

- Czy zmiana modyfikuje ktorykolwiek contract surface?
- Czy istnieje plan migracji/deprecacji?
- Czy oba klienty (admin i mobile) sa uwzglednione?
- Czy testy i spec sa zaktualizowane?
- Czy review opisuje ryzyko i rollback?
