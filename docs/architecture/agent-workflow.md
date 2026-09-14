# Praca z agentami: portal i zadania cross-repo

Ten runbook porządkuje istniejący workflow SPEC-019. Nie wymaga instalacji Limen.
Root `AGENTS.md` wybiera instrukcje; ten plik czytaj przy nietrywialnym zadaniu,
delegowaniu i wznowieniu. Proste pytanie lub literówka nie wymagają runu.

## Źródła i zakres odpowiedzialności

- Kierunek: `.ai/VISION.md`, źródło w `fizjo-app/.ai/VISION.md` (utrzymuje Adam).
- Priorytety: jedna tablica `fizjo-app/.ai/BOARD.md`; czytaj TRACK, NOW i 3 z NEXT.
- Zakres: issue albo istniejący spec; status specu wyłącznie w `.ai/specs/README.md`.
- Postęp zadania, decyzje, dowody i następny krok: jeden plik `.ai/runs/<date>-<slug>.md`.
  Nie duplikuj treści specu ani historii rozmowy. Wskaż spec i pliki.
- Skille portalu: `.ai/skills/` i `manifest.json` są źródłem; `.agents/skills/`
  i `.cursor/skills/` to lokalne, ignorowane przez Git kopie do wykrywania przez klientów.
  Mobile ma własne źródło `.agents/skills/`; nie kopiuj katalogów między repo.

Koordynator utrzymuje zakres i run, przydziela pliki, sprawdza wynik i aktualizuje
wskaźnik BOARD. Worker realizuje jeden określony wycinek oraz oddaje wynik, testy
i blokady; nie ogłasza zamknięcia całego zadania cross-repo. Reviewer ocenia
konkretnego kandydata read-only, ze świeżym kontekstem. Werdykt nie daje zgody na merge.
Zakończenie procesu agenta z kodem 0 oznacza tylko koniec procesu.

## Start i przekazanie pracy

1. Sprawdź repo i jego `AGENTS.md`, dopasowane instrukcje oraz lessons przez `rg`.
   Odczytaj `git status --short`, `git branch --show-current` i `git rev-parse HEAD`.
   Przejrzyj istniejący diff. Zapisz cudze zmiany jako baseline; nie włączaj ich do zadania.
2. Zapisz w runie cel, acceptance, owning repo, dozwolone pliki, wykluczenia,
   źródło upoważnienia i następny krok. Użyj [szablonu](agent-run-template.md).
   Zachowaj istniejące ID issue/specu. Zgoda na zadanie nie upoważnia do commit/push/PR/deploy.
3. Dla pracy równoległej przydziel rozłączne pliki i jednego writera runu.
   Worktree izoluje pliki, nie uprawnienia. Nie przekazuj niezacommitowanej pracy
   przez samą nazwę brancha: nowy worktree nie dostanie tego diffa automatycznie.
4. Przekazuj wskaźniki: run, spec, repo, pliki, acceptance, wykluczenia, następny krok.
   Dla niezacommitowanego kandydata wskaż ten sam checkout albo przygotowany patch
   wraz z nowymi plikami. Nie commituj tylko po to, by uruchomić agenta.

## Cross-repo: jeden cel, osobne dowody

Owning repo wybieraj według miejsca zmiany. Dla zadań portalu jest nim
`fiziyo-admin-portal`; backend to `backend/` wewnątrz `fizjo-app`, nie czwarte repo.
E2E żyje w `fiziyo-tests`. Lokalizacje z `.ai/ECOSYSTEM.md` są wskazówkami:
sprawdź rzeczywisty checkout, nie zakładaj, że repo jest katalogiem sąsiednim.

W runie dla każdego potrzebnego repo zapisz: ścieżkę, branch, HEAD, zakres zmiany,
stan dirty, instrukcje oraz komendę i wynik kontroli. Przy kontrakcie wskaż
producenta API i obu konsumentów. Ask First nadal dotyczy kontraktów/auth/tenant;
zmiany dokumentacji workflow nie są zmianą kontraktu API.

Brak wymaganego repo albo testu = `blocked` / `unverified` dla tego zakresu.
Wynik testów portalu nie potwierdza mobile ani backendu. Zapisz konkretny brak,
ukończ niezależny lokalny wycinek i przygotuj handoff do właściwego repo.
Nie twórz drugiej tablicy. Jeśli BOARD jest niedostępny, zapisz proponowaną linię
w runie; przenieś ją do PR tylko jeśli tworzenie PR jest upoważnione.
Nie oznaczaj prac cross-repo jako PROVEN na podstawie jednego checkoutu.

## Wznowienie i aktualność dowodów

Odczytaj run, potem ponownie sprawdź repo, branch, HEAD oraz staged, unstaged
i untracked pliki. Nie zaczynaj automatycznie od pierwszego niezaznaczonego checkboxa.
Porównaj też spec i zakres z zapisanym kandydatem. Różnicę wyjaśnij przez diff,
zachowaj cudze zmiany, a dowody dotyczące zmienionego zakresu oznacz jako nieaktualne.

SHA HEAD nie identyfikuje dirty checkoutu. Dla niezacommitowanej pracy zachowaj
lokalny patch tracked zmian (`git diff --binary HEAD -- <pliki-zakresu>`) i jego
SHA-256 oraz listę nowych plików z hashami treści. Uwzględnij staged i unstaged
zmiany. Patch z ograniczonego zakresu może zawierać wcześniejszą pracę w tych samych
plikach: porównuj go z baseline. Nie dodawaj patchy z sekretami ani danych pacjentów.
Przy ponownym sprawdzeniu odtwórz fingerprint z tych samych plików; nowy plik
wchodzący w zakres także unieważnia dowód. Sam `git status` nie porównuje treści.

To protokół ręczny: portal nie ma jeszcze runnera egzekwującego snapshoty cross-repo.
Hash nie obejmuje ignorowanych zależności i środowiska, nie jest autoryzacją.
Po zmianie środowiska oceń ponowne uruchomienie właściwych kontroli.

## Weryfikacja i review

Najpierw test dotkniętego zachowania, potem jeden dobrany pakiet końcowy:

- Wyłącznie tooling agentów/dokumentacja: `npm run skills:lint`,
  `npm run skills:test`, `npm run skills:sync`, `npm run skills:check`.
  Dla zmienionych skryptów również ESLint z `--max-warnings 0`.
- Zmiany produktu: `npm run validate` (zawiera lint, test IDs, typy, testy i build).
  Nie uruchamiaj osobno całego zestawu, a następnie ponownie przez validate.
- Backend: kontrola w `fizjo-app` zgodnie z tamtejszym AGENTS; E2E w
  `fiziyo-tests` według lokalnych zasad. Nie uruchamiaj PROD w tym workflow.

Ograniczenie lokalnych kontroli do narzędzi nie zwalnia z wymaganych kontroli CI.
Dla każdej kontroli zapisz czas, repo/kandydata, dokładną komendę, exit code,
wynik i ograniczenia. Brak wyniku nie jest sukcesem. Po dwóch próbach bez nowego
dowodu przerwij pętlę i zapisz blokadę oraz sposób odblokowania.

Reviewer otrzymuje zakres i tożsamość kandydata (SHA, a dla dirty także fingerprint
oraz baseline), wskazanie nowych plików i testów. Raport zawiera
`accept`, `send back` z konkretnymi uwagami albo `needs-adam` z powodem.
Zachowaj uwagi przed poprawkami. Po poprawce powiąż ponowny review z nowym
kandydatem. Nie przepisuj poprzedniego werdyktu, jakby dotyczył nowego diffa.

W runie rozróżniaj: `working`, `blocked`, `ready-for-review`, `done`.
`done` wymaga acceptance, aktualnych wymaganych kontroli i przeglądu;
nie oznacza commita, merge ani wdrożenia. Status całego specu pozostaje w indeksie.

## Synchronizacja skilli

Po edycji źródła: `npm run skills:lint`, `npm run skills:sync`,
`npm run skills:check`. Sync kopiuje zadeklarowane skille do obu katalogów,
bez usuwania. Obce pliki, linki symboliczne i kolizje struktury blokują zapis
na etapie preflight; przejrzyj konflikt, nie obchodź go przez usunięcie katalogu.
Różnice treści zadeklarowanych kopii są nadpisywane przez źródło: najpierw przejrzyj
lokalne zmiany kopii i przenieś potrzebne poprawki do `.ai/skills/`.
Preflight nie zapewnia transakcji przy awarii dysku ani równoległym zapisie.

`skills:lint` sprawdza źródło i manifest, działa też w świeżym checkoutcie CI.
`skills:check` porównuje pełną treść obu kopii; przed pierwszym użyciem klienta
uruchom sync. Nie zakładaj, że CI posiada ignorowane kopie. Wykrywanie skilli
przez konkretny klient wymaga osobnego smoke testu, nie wynika z samej zgodności plików.
