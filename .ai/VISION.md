<!-- kopia z Prezentytu/fizjo-app@81d896a28ac39bc94f63f64abb6ae7413d4b7b86:.ai/VISION.md; nie edytuj, odśwież: npm run docs:sync -->

> Kopia z fizjo-app. Numery `SPEC-0xx`, ścieżki (`.ai/BOARD.md`, `.ai/BUSINESS.md`, `app/`…) i „to repo” dotyczą **fizjo-app**, nie tego panelu: `SPEC-028` stąd to nie `.ai/specs/SPEC-028-*` portalu. Spec portalu bierzesz z `.ai/specs/README.md`.

# VISION.md — FiziYo: po co i dokąd

Jeden ekran. Definiuje i utrzymuje **Adam**. Agenci czytają przed każdym zadaniem i **nie edytują** bez jego zgody (propozycja zmiany kierunku = issue `idea` albo komentarz w PR, nie edycja tego pliku). Kontekst firmy i decision log: `.ai/BUSINESS.md`. Mapa repo i kontraktu: `.ai/ECOSYSTEM.md`. Co jest teraz w robocie: `.ai/BOARD.md`.

## Produkt

FiziYo to para aplikacji dla fizjoterapii ambulatoryjnej: **panel gabinetu** (`fiziyo-admin-portal`, Next.js) i **aplikacja mobilna** (ten repo, Expo) dla **fizjoterapeuty** i **pacjenta**, na wspólnym backendzie `.NET 9 + GraphQL + PostgreSQL` (`backend/`). Fizjoterapeuta składa pacjentowi zestaw ćwiczeń z katalogu (własne ćwiczenia gabinetu + katalog FiziYo, media, parametry, notatka). Pacjent wykonuje zestaw w playerze (czas / powtórzenia, tempo, audio, feedback), a fizjoterapeuta widzi historię, dowody wykonania i feedback.

## Dokąd idziemy — wizyta, która sama się „wpisuje”

Cel na 12 miesięcy: **fizjoterapeuta nie wpisuje nic ręcznie.** Odpala FiziYo na telefonie w tle, prowadzi wizytę jak zawsze, a na końcu wszystko jest przygotowane w aplikacji: pacjent dodany (albo dopasowany do istniejącego), notatka z wizyty, zestaw ćwiczeń złożony i przypisany z parametrami i harmonogramem, zalecenia gotowe do wysłania. Fizjoterapeuta czyta jedno podsumowanie i klika **„OK”** albo **„popraw to, to i to” → OK**. Nic nie trafia do pacjenta bez tego kliknięcia.

### Jak wygląda apka na końcu

Obraz z calla 2026-09-24 (Przemek, Adam). To jest to, do czego dążymy. Nie jest bieżącym zakresem.

Fizjoterapeuta mówi: przyszedł pan X. Skan albo wpis maila. Mówi, czego potrzebuje — takie ćwiczenia, taki zestaw. Dostaje propozycję. Mówi „zmień to ćwiczenie” i ćwiczenie jest zmienione. Koniec. Pacjent, parametry, sprawdzenie i wysyłka są już zrobione. Nikt nie siada do wpisywania.

Katalog jest etapem po drodze: najpierw „powiedz ćwiczenie, znajdź najbliższe”. Koniec drogi jest dalej. Mówisz, czego potrzebujesz, i ćwiczenie powstaje w locie. Utrzymywanie ogólnej bazy nie jest warunkiem tego końca.

Hipoteza z tego samego calla, nie plan: skrapowanie i ocena materiałów (na przykład z YouTube) oraz agent, który sam leci po źródłach, jako sposób, skąd opis ćwiczenia mógłby się brać.

Etapy (spec `SPEC-029 Ambient Visit Copilot` i kolejne):

1. Nagranie wizyty → szkic notatki i planu (jest w MVP).
2. Szkic → gotowy zestaw z katalogu, dopasowany do pacjenta, z parametrami; fizjoterapeuta tylko poprawia.
3. Pacjent, wizyta, przypisanie, przypomnienia — wszystko z jednego przebiegu; „OK” zamyka wizytę.
4. Pętla zwrotna: wykonanie i feedback pacjenta wracają do fizjoterapeuty przed kolejną wizytą jako gotowa propozycja zmian zestawu.
5. Zestaw nie zależy od utrzymywanej bazy: ćwiczenie, którego nie ma, powstaje z opisu w tej samej rozmowie.

Miarą każdej funkcji jest: **ile minut i kliknięć oszczędza fizjoterapeucie po wizycie** oraz **czy pacjent wykonuje zestaw regularnie**. Funkcja, która nie rusza żadnej z tych dwóch liczb, jest niżej w kolejce.

## Dla kogo i kto płaci

- Użytkownik pierwszy: **fizjoterapeuta / gabinet**. Panel i aplikacja fizjoterapeuty są jego narzędziem pracy.
- Model płatności: **fizjoterapeuta oferuje pacjentowi usługę premium** (opieka między wizytami z aplikacją do ćwiczeń). **Pacjent dopłaca za nią w gabinecie**, a gabinet aktywuje mu plan w FiziYo (aktywacja i rozliczenie po stronie gabinetu, `SPEC-028`). Aplikacja pacjenta na iOS jest **darmowa w sklepie**: brak IAP, brak subskrypcji konsumenckiej, brak słów `premium` / `subskrypcja` / `paywall` / `kup` w copy pacjenta (reguła `app-store-positioning`). Gdy plan nie jest aktywny, pacjent widzi „Plan nie jest aktywny — skontaktuj się z fizjoterapeutą”.
- Stan (2026-09): produkcja dla 23 organizacji, aktywny rozwój + hardening (FREEZE zdjęty 2026-09-06). Budujemy to, co przybliża wizję wyżej; decyzję „budujemy / nie” podejmuje Adam na podstawie specu `draft`, nie automatycznego progu.

## Co jest ważne w tej kolejności

1. **Bezpieczeństwo i izolacja tenantów** — auth / token-exchange / `organizationId` scoping bez regresji. P0 security = fix + test w jednym commicie.
2. **Codzienna użyteczność pacjenta** — player nie gubi zestawu, pokazuje czas, tempo, feedback; „W trakcie / Dziś” (SPEC-037), fazy tempa (SPEC-038). Pacjent, który ćwiczy, to jedyny dowód, że usługa premium ma sens.
3. **Automatyzacja pracy fizjoterapeuty** — od wizyty do gotowego zestawu bez wpisywania (SPEC-029 i etapy wyżej). Każdy krok ręczny w tym flow to kandydat do usunięcia.
4. **Jakość katalogu i danych** — schema v3 (SPEC-022), import paczek (SPEC-026), poprawne ilustracje (SPEC-036). Na obecnym etapie katalog jest tym, z czego copilot składa zestawy. Koniec drogi (wyżej) nie traktuje ogólnej bazy jako warunku.
5. **Release train** — `main` = API DEV automatycznie (**DEV**); PROD API, panel i TestFlight = ręczny **Release**, sklepy = ręczny **Ship**, bez ręcznych ID, z dowodami (SPEC-030–034, SPEC-049). Nic nie idzie na PROD bez człowieka.

## Czego nie robimy

- Nie wprowadzamy paywalla / IAP / subskrypcji po stronie pacjenta — płatność jest relacją gabinet ↔ pacjent.
- Nie wysyłamy pacjentowi niczego, czego fizjoterapeuta nie zatwierdził jednym kliknięciem; copilot proponuje, człowiek zatwierdza.
- Nie zmieniamy kontraktu GraphQL inaczej niż additive-first (`BACKWARD_COMPATIBILITY.md`); zmiana cross-repo = Ask First.
- Nie wpuszczamy danych pacjentów poza produkcję: DEV pracuje na danych syntetycznych; agenci nie dotykają PROD DB, ASC, Clerk PROD; nagrania wizyt nie opuszczają PROD.
- Nie dublujemy w mobile flow, które ma pełną wersję w panelu, jeśli nie ma parity (por. `ECOSYSTEM.md`).
- Nie udajemy terapeuty: aplikacja nie diagnozuje i nie zmienia zaleceń bez fizjoterapeuty.

## Skąd biorą się pomysły

Trzy wejścia, wszystkie kończą się jako GitHub Issue: (1) fizjoterapeuci i Przemek (`from-przemek`, `from-sync`), (2) dane z produkcji i DEV (`bot-finding`, `.ai/qa/findings/`), (3) **research branży** — bot Badacz Branży czyta, jak pracują gabinety, co robi konkurencja (Physitrack, Exorlive, MedBridge, nowe startupy HEP / ambient scribe), czego chcą pacjenci, i zgłasza propozycje jako issue `idea` z dowodem (źródło, cytat, dlaczego pasuje do wizji). Agenci **mogą i mają** proponować zmiany — decyzja zostaje Adama.

## Styleguide

Styleguide to zbiór istniejących reguł, nie osobny plik: `.cursor/rules/*.mdc` (tokeny, komponenty, GraphQL, backend, App Store), skill `mobile-design` (UI mobile), `AGENTS.md` (Always / Ask First / Never / DoD). Portal ma własne w `fiziyo-admin-portal/.cursor/rules` i `AGENTS.md`.

## Jak pracujemy z agentami

Wąskie zadania, krótkie wątki, dowody zamiast deklaracji. Kolejność źródeł prawdy: VISION (kierunek) → `BOARD.md` (priorytety) → GitHub Issues (jednostki pracy) → `SPEC-0xx` (projekt rozwiązania) → PR / `.ai/runs/` / `lessons.md` (dowód). Agent w chmurze działa wg `docs/architecture/cloud-agent-policy.md`: branch `agent/…`, draft PR, nigdy `main`, nigdy Promote. Merguje człowiek.

---

Ostatnia aktualizacja: 2026-09-24 (Adam) — obraz końca drogi z calla: ćwiczenie powstaje w locie, katalog zostaje etapem.
