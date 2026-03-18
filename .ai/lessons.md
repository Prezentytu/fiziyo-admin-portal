# Lessons Learned

Dziennik wniosków z pracy AI agentów. Po każdej korekcie dodaj nowy wpis.

## Format wpisu

### YYYY-MM-DD - Krótki tytuł

- **Kategoria**: `UI/UX` | `React` | `GraphQL` | `Git` | `Build/Tooling` | `Billing`
- **Problem**: Co poszło nie tak
- **Przyczyna**: Dlaczego
- **Rozwiązanie**: Co naprawiono
- **Reguła**: Zasada do zapamiętania na przyszłość

## Wpisy

### 2026-03-18 - Assignment semantics musi byc single-source

- **Kategoria**: `UI/UX`
- **Problem**: Logika przypisania i copy w wizardzie rozjechały się między modelem hybrydowym a modelem always-fork wymaganym przez biznes.
- **Przyczyna**: Częściowa migracja domeny (`template vs patient plan`) bez jednoznacznego zablokowania alternatywnej ścieżki.
- **Rozwiązanie**: Ujednolicono flow na always-fork (`PATIENT_PLAN` zawsze przed assign), zamknięto backend na direct-assign reusable zestawów i przestawiono toggle na „zapisz także jako zestaw organizacji”.
- **Reguła**: Dla kluczowych flow domenowych utrzymuj jedną semantykę end-to-end (backend, UI, copy, specy); hybrydy wprowadzaj tylko przy świadomej decyzji produktowej.

### 2026-03-18 - Domyślna klasyfikacja create-set musi być jawna

- **Kategoria**: `GraphQL`
- **Problem**: Kliknięcie „Utwórz nowy zestaw” tworzyło `PATIENT_PLAN`, mimo że intencją użytkownika był reusable szablon organizacji.
- **Przyczyna**: Kilka flow frontendu wywoływało `createExerciseSet` bez `kind/templateSource`, a backend miał domyślną klasyfikację `PatientPlan`.
- **Rozwiązanie**: Ujednolicono create-flow na jawne `TEMPLATE + ORG_PRIVATE` oraz domyślną klasyfikację backendu do `Template`; dodatkowo wdrożono hybrydę assignment (`reuse template + overrides` vs fork `PATIENT_PLAN`).
- **Reguła**: Dla wieloznacznych kontraktów domenowych zawsze przekazuj klasyfikację encji jawnie (`kind`, `templateSource`) i nie polegaj na defaultach backendu.

### 2026-03-09 - Lokalna normalizacja tagów zamiast zmiany globalnego kontraktu

- **Kategoria**: `TypeScript`
- **Problem**: Poprawka typu w jednym ekranie (`CustomizeSetStep`) wywołała kaskadę błędów TS w innych widokach po zmianie sygnatury helpera `mapExercisesWithTags`.
- **Przyczyna**: Globalny helper był używany w kilku modułach z różnymi oczekiwaniami co do typów `mainTags/additionalTags` (string IDs vs obiekty tagów).
- **Rozwiązanie**: Przywrócono globalny kontrakt helpera i dodano lokalną normalizację tagów do formatu `BuilderExercise` tylko tam, gdzie była potrzebna.
- **Reguła**: Przy naprawie typu w jednym module preferuj adapter lokalny; globalne helpery zmieniaj dopiero po audycie wszystkich callsite’ów.

### 2026-03-09 - Callback ref wymaga jawnego typu w strict mode

- **Kategoria**: `React`
- **Problem**: Build TypeScript zatrzymał się na callback `ref`, bo parametr `ref` został wywnioskowany jako implicit `any`.
- **Przyczyna**: W `strict` / `noImplicitAny` callback refs nie zawsze dziedziczą typ parametru z biblioteki zewnętrznej wystarczająco dobrze.
- **Rozwiązanie**: Dodano jawne typowanie parametru callbacka `ref` zgodne z instancją komponentu.
- **Reguła**: Przy callback refs do komponentów zewnętrznych zawsze jawnie typuj parametr albo używaj bezpośrednio obiektu `useRef`, jeśli biblioteka to wspiera.

### 2026-03-08 - Dashboard finansów wymaga mikrocopy kontekstowego

- **Kategoria**: `UI/UX`
- **Problem**: Użytkownicy widzieli metryki finansowe i poziomy partnerskie, ale bez jasnego wyjaśnienia źródła środków oraz wpływu liczby pacjentów na prowizję.
- **Przyczyna**: Widok opierał się głównie na liczbach i kartach statusu, a nie na krótkich komunikatach „co to znaczy” i „co zrobić dalej”.
- **Rozwiązanie**: Dodano panel kontekstowy, helper copy w kartach finansowych i model krokowy w banerze konfiguracji, utrzymując spójność typografii/odstępów.
- **Reguła**: W dashboardach finansowych każda kluczowa metryka i CTA musi mieć 1-zdaniowe objaśnienie semantyki oraz następnego kroku użytkownika.

### 2026-03-08 - Copy flow i edit payload muszą być spójne

- **Kategoria**: `UI/UX`
- **Problem**: Użytkownik widział pole nazwy w edycji ćwiczenia, ale zmiana nazwy kopii nie zapisywała się, a flow kopiowania miał niespójny routing i nazewnictwo.
- **Przyczyna**: `UPDATE_EXERCISE_MUTATION` była wywoływana bez `name`, a ścieżki copy (`copyExerciseTemplate` vs ręczny duplicate) działały bez wspólnej strategii nazewnictwa i nawigacji.
- **Rozwiązanie**: Dodano builder payloadu update z `name`, wspólny helper `getNextExerciseCopyName`, auto-przejście do nowej kopii po utworzeniu oraz sortowanie newest-first po `createdAt`.
- **Reguła**: Gdy UI eksponuje pole edycyjne, payload mutacji musi zawierać to pole; dla wielościeżkowego copy obowiązuje jedna strategia nazewnictwa i spójny post-success routing.

### 2026-03-08 - Report ćwiczenia musi być osobnym bytem od review notes

- **Kategoria**: `GraphQL`
- **Problem**: Zgłoszenia terapeutów były obsługiwane kanałem pomocniczym (Discord) i łatwo mieszały się semantycznie z `adminReviewNotes`, co utrudniało spięcie z kolejką verification.
- **Przyczyna**: Brak dedykowanego modelu `ExerciseReport` i brak jawnego routingu `Published -> UpdatePending`.
- **Rozwiązanie**: Wprowadzono addytywny model reportu, osobny kontekst reportowy w verification oraz dedykowany routing helper testowany jednostkowo.
- **Reguła**: Feedback od użytkownika i notatki recenzenta to dwa różne strumienie danych; przechowuj je oddzielnie i łącz dopiero na warstwie widoku.

### 2026-03-07 - Hybrid assignment zapobiega fałszywym zerom na szablonach

- **Kategoria**: `UI/UX`
- **Problem**: Przypisanie z drobną personalizacją zawsze tworzyło nowy `PATIENT_PLAN`, przez co szablon źródłowy pokazywał `0` przypisań i mylił terapeutę.
- **Przyczyna**: Brak progu decyzyjnego; wizard materializował nowy zestaw niezależnie od rodzaju zmian.
- **Rozwiązanie**: Wprowadzono klasyfikację zmian (`UNCHANGED_TEMPLATE`, `TEMPLATE_WITH_PARAM_OVERRIDES`, `PERSONALIZED_PLAN`) i rozdzielono submit na dwie ścieżki.
- **Reguła**: Drobne zmiany parametrów/harmonogramu przypisuj bezpośrednio do szablonu przez assignment overrides; nowy `PATIENT_PLAN` twórz tylko przy zmianach strukturalnych lub tożsamościowych.

### 2026-03-07 - ExerciseSet wymaga klasyfikacji additive-first

- **Kategoria**: `GraphQL`
- **Problem**: Pole `isTemplate` nie rozróżniało szablonów FiziYo, szablonów organizacji i planów pacjenta, co psuło filtry i logikę przypisań.
- **Przyczyna**: Model domenowy był binarny (`template/non-template`) i nie przenosił informacji o pochodzeniu oraz statusie publikacji.
- **Rozwiązanie**: Wprowadzono pola `kind`, `templateSource`, `reviewStatus`, `sourceExerciseSetId` w backendzie i klientach (admin + mobile) oraz utrzymano `isTemplate` dla kompatybilności wstecznej.
- **Reguła**: Przy zmianach kontraktu domenowego stosuj additive-first: dodaj nowe pola klasyfikacji, zachowaj legacy pole mapowane po stronie backendu i migruj UI etapowo.

### 2026-03-07 - CTA przypisania musi ujawniać tworzenie planu

- **Kategoria**: `UI/UX`
- **Problem**: CTA `Przypisz pacjenta` sugerowało proste przypięcie zestawu, a flow faktycznie przechodził przez personalizację i tworzył nowy plan.
- **Przyczyna**: Niespójny model mentalny między copy na ekranie detalu a logiką `AssignmentWizard` (`create copy -> assign`).
- **Rozwiązanie**: Ujednolicono język na `plan pacjenta`, zmieniono CTA wejściowe i końcowe oraz zsynchronizowano dokumentację assignment.
- **Reguła**: Gdy flow tworzy nowy byt pośredni, CTA i nagłówki muszą to komunikować przed pierwszym kliknięciem.

### 2026-03-07 - Po utworzeniu zestawu bez auto-przekierowania

- **Kategoria**: `UI/UX`
- **Problem**: Po utworzeniu zestawu kreator automatycznie przekierowywał do widoku szczegółów, wyrywając użytkownika z kontekstu listy.
- **Przyczyna**: W `CreateSetWizard` był twardy `router.push` po sukcesie mutacji.
- **Rozwiązanie**: Usunięto auto-nawigację; kreator zamyka się i odświeża listę zestawów, a nowy rekord pojawia się jako pierwszy wg `creationTime`.
- **Reguła**: W flow typu "utwórz z listy" po sukcesie domyślnie zostań na liście; nawigacja do detalu tylko jako świadoma akcja użytkownika.

### 2026-03-07 - Spójny układ akcji w stopce dialogów

- **Kategoria**: `UI/UX`
- **Problem**: W kreatorze tworzenia zestawu akcje stopki były zgrupowane po prawej, co łamało wzorzec używany w innych dialogach.
- **Przyczyna**: Zastosowano `justify-end` zamiast layoutu rozdzielającego akcję wtórną i główną.
- **Rozwiązanie**: Zmieniono footer na `justify-between` i dopisano globalną regułę w `AGENTS.md` oraz w skillu `product-designer`.
- **Reguła**: W dialogach formularzowych `Anuluj` zawsze po lewej, a główne CTA po prawej.

### 2026-03-06 - Backend contract change needs migration and manual deploy

- **Kategoria**: `Build/Tooling`
- **Problem**: Zmiana kontraktu GraphQL na backendzie mogła wyglądać na gotową po samym kodzie i buildzie, ale frontend dalej widział stary schemat.
- **Przyczyna**: Pominięto pełny workflow wdrożeniowy: migracja EF Core, `database update`, restart API oraz fakt, że deploy backendu na Azure jest wykonywany manualnie przez użytkownika.
- **Rozwiązanie**: Doprecyzowano instrukcje cross-repo i backendowe, że agent przygotowuje kod i migracje, ale musi jasno wskazać potrzebę lokalnego update bazy i ręcznego deploya po stronie użytkownika.
- **Reguła**: Przy każdej zmianie backendowego kontraktu zakończ pracę dopiero po: migracji, `dotnet ef database update`, lokalnej weryfikacji i komunikacie, że zdalne wdrożenie wykonuje użytkownik manualnie.

### 2026-03-03 - CTA "Wygeneruj nazwę AI" nie może otwierać innej funkcji

- **Kategoria**: `UI/UX`
- **Problem**: Przycisk z etykietą generowania nazwy otwierał asystenta doboru ćwiczeń
- **Przyczyna**: Logika UI była podpięta do panelu `AISetGenerator`, mimo innej intencji akcji
- **Rozwiązanie**: W `CreateSetWizard` usunięto użycie asystenta i podpięto przycisk bezpośrednio pod `aiService.suggestSetName`
- **Reguła**: CTA musi wykonywać dokładnie obiecaną akcję; alternatywne flow wymagają osobnego, jednoznacznego przycisku

### 2026-03-03 - Przycisk AI uruchamiał panel przez bubbling

- **Kategoria**: `React`
- **Problem**: Kliknięcie "Wygeneruj nazwę AI" otwierało panel boczny zamiast wykonać akcję generowania nazwy
- **Przyczyna**: Event z przycisku bąbelkował do rodzica, który miał własną akcję otwierania panelu
- **Rozwiązanie**: Dodano `stopPropagation()` dla `pointerdown` i `click` w przycisku AI oraz test regresyjny na brak propagacji
- **Reguła**: W osadzanych komponentach z lokalnymi CTA zawsze izoluj eventy (`pointerdown` + `click`) gdy rodzic może być triggerem nawigacji/panelu

### 2026-02-16 - Git pre-commit hook uruchamia ESLint na stale staged files

- **Kategoria**: `Git`
- **Problem**: Commit odrzucony mimo poprawionego kodu lokalnie
- **Przyczyna**: Pliki miały status `MM` w git (zmodyfikowane i staged + zmodyfikowane unstaged) — hook lintował starą wersję staged
- **Rozwiązanie**: Jawnie `git add` poprawionych plików przed commitem
- **Reguła**: Po naprawie błędów ESLint zawsze sprawdź `git status` i ponownie stage'uj zmodyfikowane pliki

### 2026-02-16 - ESLint na usuniętych plikach

- **Kategoria**: `Git`
- **Problem**: `git diff --staged --name-only` zwraca usunięte pliki, ESLint zgłasza "No files matching pattern"
- **Przyczyna**: `--name-only` bez filtra zwraca też pliki z operacją D (deleted)
- **Rozwiązanie**: Użyj `--diff-filter=ACMR` aby wykluczyć usunięte pliki
- **Reguła**: Zawsze filtruj usunięte pliki w poleceniach operujących na staged files

### 2026-02-16 - Synchronous setState w useEffect (React 19)

- **Kategoria**: `React`
- **Problem**: ESLint `react-hooks/set-state-in-effect` blokuje build
- **Przyczyna**: React 19 strict mode traktuje synchroniczny setState w useEffect jako anti-pattern
- **Rozwiązanie**: (1) `queueMicrotask()` dla state syncing, (2) lazy `useState` initializer dla danych z localStorage, (3) `useMemo` dla derived state
- **Reguła**: Nigdy nie wywołuj setState synchronicznie w useEffect — użyj queueMicrotask, lazy init lub useMemo

### 2026-02-16 - Import @next/bundle-analyzer w next.config.ts

- **Kategoria**: `Build/Tooling`
- **Problem**: TypeScript może nie rozpoznać default importu z @next/bundle-analyzer
- **Przyczyna**: Pakiet eksportuje CommonJS
- **Rozwiązanie**: `import bundleAnalyzer from "@next/bundle-analyzer"` z `esModuleInterop: true`
- **Reguła**: Sprawdź kompatybilność ESM/CJS przy dodawaniu pluginów Next.js

### 2026-03-04 - Rozdzielenie "danych do faktury" od Stripe Connect

- **Kategoria**: `Billing`
- **Problem**: Baner finansowy komunikował tylko podłączenie konta bankowego, pomijając obowiązkowe dane firmy do fakturowania
- **Przyczyna**: Zmieszanie dwóch flow: payout onboarding (Stripe Connect) i billing identity (NIP/adres/IBAN/email)
- **Rozwiązanie**: Wprowadzono osobny flow `BillingDetails` (schema, walidatory, dialog, kontrakt GraphQL) i priorytet banera na dane rozliczeniowe
- **Reguła**: W obszarach płatności każdy etap (KYC/payout/faktura) musi mieć oddzielny komunikat i osobny stan ukończenia

<!-- Dodawaj nowe wpisy powyżej tej linii -->
