# Lessons Learned

Nie czytaj całości: szukaj `rg -n '<słowo kluczowe>' .ai/lessons.md .ai/lessons-archiwum.md` (np. `organizationId`, `data-testid`, `executionTime`, `Clerk`, `additive`, `overridesJson`, `canManageOrganization`, `useLazyQuery`, `agent:check`, `skills:sync`, `trunk`). Wzorzec, który wraca drugi raz, przestaje być wpisem i staje się testem, lintem albo checkiem z markerem `[egzekwowane: <ścieżka>]` (skill `principle-encode-lessons-in-structure`).

## Format wpisu

Nowy wpis dodajesz na górze sekcji Wpisy. Gdy limit słów z `npm run agent:check` nie pozwala go dopisać, przenieś najstarsze wpisy bez markera do `.ai/lessons-archiwum.md` (bez kasowania) albo skróć dowolny plik ładowany zawsze; limit dotyczy sumy.

### YYYY-MM-DD - Krótki tytuł

- **Kategoria**: `UI/UX` | `React` | `GraphQL` | `Git` | `Build/Tooling` | `Billing` | `Auth` | `Testing`
- **Problem**: Co poszło nie tak
- **Przyczyna**: Dlaczego
- **Rozwiązanie**: Co naprawiono
- **Reguła**: Zasada do zapamiętania na przyszłość

Marker `[egzekwowane: <ścieżka>]` na końcu linii **Reguła** = test, lint albo check, który łapie ten przypadek (konwencja z `fizjo-app/lessons.md`). Brak markera = tylko tekst. Marker dopisujesz tylko wtedy, gdy wskazany plik istnieje i jego test albo reguła odtwarza ten przypadek.

## Wpisy

### 2026-11-23 - Przykład z polecenia potraktowany jak wymaganie

- **Kategoria**: `Process`
- **Problem**: Z „ja od najnowszych, kolega od najstarszych, 1000 ćwiczeń” zrobiłem funkcję „Weź N z końca kolejki”; Adam wyjaśnił, że podział był obejściem braku narzędzi.
- **Przyczyna**: Przykład liczby i podziału pracy wzięty za specyfikację zamiast za opis bólu (brak przydziału osobie, brak widoku, kto co sprawdza, brak pętli poprawek).
- **Rozwiązanie**: SPEC-041 przepisany na przydział osobie, pasek zespołu i pętlę poprawek; „Przydziel następne N” w kolejności listy.
- **Reguła**: Liczby i obejścia z polecenia zapisz w specu jako kontekst, a cel nazwij jako problem; przed implementacją potwierdź, które z nich są wymaganiem.

### 2026-11-20 - Route handler ufał body, dane osoby przeżywały wylogowanie

- **Kategoria**: `Security`
- **Problem**: `/api/exercise-reports` oddawał zgłoszenia wszystkich organizacji; po zmianie osoby w karcie zostawał cache Apollo i localStorage gabinetu.
- **Przyczyna**: Handlery polegały na samym `auth.protect()` i brały osobę z body; Clerk zmienia użytkownika bez przeładowania.
- **Rozwiązanie**: `src/lib/server/requestIdentity.ts`; reset w `ApolloWrapper` przy zmianie `userId`.
- **Reguła**: Osoba i rola z sesji i backendu, nie z body; wylogowanie tylko przez `useAppSignOut`. [egzekwowane: eslint.config.mjs]

### 2026-11-20 - Draft ćwiczenia w czacie znikał po zmianie zakładki

- **Kategoria**: `React`
- **Problem**: Ćwiczenie w 3/4 wygenerowane w czacie, wyjście na inny ekran i powrót: rozmowa była, karta wracała pusta.
- **Przyczyna**: Wątek żyje w providerze w layoucie, a formularz, sekcje, grafika i przebieg AI karty `CreateExercise` żyły w komponencie i ginęły przy odmontowaniu.
- **Rozwiązanie**: Draft i przebieg AI w `catalog/exerciseDraftStore.ts` (pamięć, klucz `messageId`), czyszczone przy zmianie użytkownika lub organizacji.
- **Reguła**: Stan karty czatu, którego utrata kosztuje pracę albo kredyty AI, trzymaj ponad kartą; karta tylko go wyświetla. [egzekwowane: src/features/ai-view/catalog/__tests__/CreateExerciseCard.remount.test.tsx]

### 2026-11-20 - Przyjęcie zaproszenia nie przełączało organizacji

- **Kategoria**: `React`
- **Problem**: Portal po powitaniu otwierał stary gabinet.
- **Przyczyna**: Akceptacja zapisywała członkostwo, przekierowanie brało stary kontekst.
- **Rozwiązanie**: Obie ścieżki aktywują organizację z mutacji przed sukcesem.
- **Reguła**: Po zapisaniu członkostwa błąd przełączenia ponawiaj samym przełączeniem. [egzekwowane: src/components/organization/__tests__/joinOrganizationFlow.test.tsx]

### 2026-11-20 - Weryfikator FiziYo nie widział „Zgłoś do poprawki”

- **Kategoria**: `UI/UX`
- **Problem**: Na koncie ContentManagera/SiteSuperAdmina przy ćwiczeniu z bazy FiziYo nie było „Zgłoś do poprawki”, choć zwykły fizjoterapeuta je widział.
- **Przyczyna**: `canReportExerciseIssue` chowało zgłoszenie przy `canReviewExercises`, zakładając, że weryfikator zawsze poprawi od razu w weryfikacji.
- **Rozwiązanie**: Widoczność zależy tylko od `scope === 'GLOBAL'`; weryfikator ma zgłoszenie obok „Popraw w weryfikacji”.
- **Reguła**: Uprawnienie do poprawki nie odbiera zwykłej akcji zgłoszenia; dodatkowa rola dokłada drogę, nie zabiera.

### 2026-11-18 - Allowlista testid z numerem linii czerwieniła CI bez nowego elementu

- **Kategoria**: `Build/Tooling`
- **Problem**: Dopisanie linii nad starym elementem bez `data-testid` (`CreateExerciseWizard.tsx` w PR 300, `SettingsTab.tsx` na `main`) czerwieniło „Data-testid guard”.
- **Przyczyna**: Klucz allowlisty `plik:linia:tag` zmieniał się przy każdym przesunięciu linii.
- **Rozwiązanie**: Allowlista to licznik per `plik:tag`; guard pada, gdy licznik rośnie, a `--update-allowlist` odmawia podniesienia bez `--allow-increase`.
- **Reguła**: Baza długu w guardzie liczy wystąpienia per plik, nie trzyma pozycji. [egzekwowane: scripts/check-testid-coverage.test.mjs]

### 2026-11-16 - Kreator edycji planu wracał do kroku 1 po odświeżeniu cache

- **Kategoria**: `React`
- **Problem**: Fizjoterapeuta przechodził do „Harmonogram”, a po ~1 s kreator wracał do kroku 1 i gubił „Rozpocznij plan od nowa”.
- **Przyczyna**: Efekt seedujący stan zależał od tożsamości propsów; rodzic buduje je w renderze, a zapytania kreatora przerenderowują rodzica przez cache Apollo.
- **Rozwiązanie**: Seed raz na otwarte przypisanie (`seededAssignmentIdRef` po `initialAssignment.id`).
- **Reguła**: Stan formularza z propsów seeduj raz po kluczu encji, nie po tożsamości obiektu. [egzekwowane: src/features/assignment/AssignmentWizard.editMode.test.tsx]

### 2026-11-07 - Brak kredytów AI udawał awarię

- **Kategoria**: `UI/UX`
- **Problem**: Toast „chwilowo niedostępna” po `insufficient_credits`; zgłoszenie „nie działa na planie”.
- **Przyczyna**: Ukrywanie słowa „kredyty”.
- **Rozwiązanie**: `mapAiErrorResponse`.
- **Reguła**: Odmowę z limitu nazywaj wprost z datą odnowienia. [egzekwowane: src/utils/__tests__/aiErrorMessages.test.ts]

### 2026-11-05 - Karta pacjenta drukowała zestaw zamiast planu pacjenta

- **Kategoria**: `Data` | `UI/UX`
- **Problem**: Dialog „Dostęp” pomijał `exerciseOverrides` i ukryte ćwiczenia przypisania, a zakończone plany pokazywał jako aktywne.
- **Przyczyna**: Plan składany z zestawu zamiast z przypisania, z własną regułą statusu.
- **Rozwiązanie**: `buildPatientAccessPlans` i `toPdfExercises(mappings, exerciseOverrides)`.
- **Reguła**: PDF dla pacjenta składaj z przypisania przez `toPdfExercises`. [egzekwowane: src/components/pdf/__tests__/toPdfExercise.test.ts]

### 2026-11-04 - Narzędzie AI edytora niewłączone na żadnym wejściu

- **Kategoria**: `UI/UX` | `React`
- **Problem**: Szczegóły i dialog edycji nie pokazywały istniejącej akcji uzupełniania treści przez AI.
- **Przyczyna**: Wspólny edytor uzależniał akcję od opcjonalnego kontekstu, którego żaden konsument nie przekazywał.
- **Rozwiązanie**: Kontekst AI domyślnie pochodzi z aktualnego szkicu wspólnego edytora; propozycja czeka na ręczny zapis. Wynik scala się z aktualnym szkicem, a Cofnij usuwa tylko niezmienione wartości AI. Tekst wskazówek i przypisane do nich fazy są jedną jednostką cofania.
- **Reguła**: Jeśli wspólna akcja zależy od danych dostępnych w szkicu, zawsze wyprowadź jej kontekst w edytorze i sprawdź, że wynik nie zapisuje się bez zatwierdzenia. [egzekwowane: src/features/exercises/__tests__/exerciseEditorAiFill.test.tsx]

### 2026-11-03 - „Przerwij, gdy…” traktowane jak lista linii gubiło strukturę

- **Kategoria**: `Verification` | `Data`
- **Problem**: Weryfikacja edytowała `safety.stop_if` chipami (linia = objaw), więc nagłówki grup typu „Zadzwoń pod 112, jeśli:” stawały się objawami, a zapis usuwał puste linie między grupami; karta ćwiczenia sklejała całość w akapit.
- **Przyczyna**: Założenie, że pole to lista objawów, a w danych to wolny tekst, który aplikacja pacjenta pokazuje dosłownie.
- **Rozwiązanie**: Edycja w polu tekstowym, odczyt z `whitespace-pre-line`, bramka liczy objawy przez `countStopIfSymptoms` (bez linii kończących się „:”).
- **Reguła**: Zanim pole tekstowe z danych potniesz na listę, sprawdź prawdziwe dane (fixture E2E) i to, jak pokazuje je mobile. [egzekwowane: src/features/verification/utils/__tests__/verificationStages.test.ts]

### 2026-11-03 - Weryfikator zatwierdzał treści, których nie widział

- **Kategoria**: `Verification` | `UI/UX`
- **Problem**: Etapy weryfikacji pokazywały część karty ćwiczenia; podsumowanie, odczucia, „dlaczego”, intensywność, progresję, sprzęt, słowa kluczowe i notatki fizjoterapeuta widział w katalogu, a weryfikator nie.
- **Przyczyna**: Etapy powstały jako ręczny wybór pól, bez związku ze schematem enrichment, więc nowe pole schematu nie miało miejsca w weryfikacji.
- **Rozwiązanie**: Pola spoza etapów opisuje `EXTRA_CONTENT_GROUPS` w `utils/extraContent.ts`, renderowane w etapie Decyzja; test porównuje je z `enrichmentSchema`.
- **Reguła**: Nowe pole w `enrichmentSchema` dostaje miejsce w etapie albo w `EXTRA_CONTENT_GROUPS`, inaczej test pada. [egzekwowane: src/features/verification/utils/__tests__/extraContent.test.ts]

### 2026-11-03 - Kod z gałęzi PR dostawał sekrety Clerk i Vercel

- **Kategoria**: `CI` | `Security`
- **Problem**: Build w CI miał `CLERK_SECRET_KEY`, a `pin-devportal.yml` przy `deployment_status` preview każdej gałęzi (także `skrzynka/*` z kodem modelu) uruchamiał `scripts/pin-devportal-domain.mjs` z tej gałęzi z `VERCEL_TOKEN`.
- **Przyczyna**: `pull_request` z tego samego repo dostaje sekrety, a `deployment_status` checkoutuje domyślnie commit wdrożenia, nie `main`.
- **Rozwiązanie**: Build PR tylko z kluczem publicznym; pin startuje dla commitów z `main` (porównanie w API bez sekretów) i checkoutuje `ref: main`.
- **Reguła**: Krok z sekretem nigdy nie wykonuje kodu z gałęzi PR; workflow `deployment_status` z sekretem checkoutuje `main`. [egzekwowane: scripts/check-trunk-main.mjs]

### 2026-11-02 - Suwaki parametrów w weryfikacji wyglądały na klikalne, ale były rysunkiem

- **Kategoria**: `UI/UX` | `Verification`
- **Problem**: W etapie Parametry przy seriach, powtórzeniach, czasie i przerwie stał pasek z kropką jak suwak, a nie dało się go przeciągnąć ani kliknąć.
- **Przyczyna**: Pasek był `<span>` w kontenerze `aria-hidden`, a skalą był limit (`hardMax`), więc typowy zakres zajmował kilka procent szerokości i nawet działający suwak byłby nieprecyzyjny.
- **Rozwiązanie**: Pod rysunkiem leży przezroczysty `<input type="range">` (mysz, klawiatura, czytnik ekranu); skala i krok suwaka żyją w `PARAMETER_RULES[key].slider`, a `sliderPercent` / `toSliderValue` / `fromSliderValue` w `parameterRules.ts`.
- **Reguła**: Jeśli coś wygląda jak kontrolka (kropka na torze, karta ze zdjęciem), zawsze jest prawdziwą kontrolką z `data-testid`; sam wskaźnik rysuj bez uchwytu. [egzekwowane: src/features/verification/stages/ParametersStage.test.tsx]

### 2026-11-02 - Karta w kolejce organizacji pokazywała „Szkic”

- **Kategoria**: `UI/UX`
- **Problem**: Ćwiczenie w zakładce „Oczekujące” weryfikacji organizacji miało na karcie badge „Szkic”.
- **Przyczyna**: `VerificationTaskCard` brał badge z globalnego `status`, a ćwiczenie organizacyjne ma tam `DRAFT`; stan kolejki jest w `organizationVerificationStatus`.
- **Rozwiązanie**: Badge z `getVerificationStatusBadge(exercise, track)`; listy organizacji i cross-org przekazują `track="organization"`.
- **Reguła**: Widok toru organizacyjnego czyta `organizationVerificationStatus`, nigdy globalny `status`. [egzekwowane: src/features/verification/utils/__tests__/statusBadge.test.ts]

### 2026-11-02 - Pole parametru zapisywało wartość spoza zakresu

- **Kategoria**: `Exercises` | `UI`
- **Problem**: Wpisanie 30 w pole przerwy z wartością 60 dawało 6030 s, które szło do mutacji zestawu i wydłużało czas planu. Tempo z literówką („30”) liczyło się jako 30 s na powtórzenie, drugi raz po incydencie „~1208 min” opisanym w `parseTempo`.
- **Przyczyna**: Zakres pola żyje w `fieldContract.ts`, ale `NumberField` brał tylko atrybut HTML `max`, który nie blokuje zapisu; zod z kontraktu działał wyłącznie w schemacie szablonu. `parseTempo` przyjmował każdy ciąg cyfr inny niż 3–4 znaki jako sekundy.
- **Rozwiązanie**: `parseNumberFieldDraft` (`src/components/shared/exercise/numberFieldDraft.ts`) odrzuca wartość spoza `min`/`max` z komunikatem pod polem, a fokus zaznacza liczbę; `parseTempo` zwraca `null` dla 2 i 5+ cyfr.
- **Reguła**: Jeśli pole liczbowe zapisuje do mutacji, zawsze sprawdzaj zakres z `fieldContract` przed `onCommit`, nie atrybutem HTML. [egzekwowane: src/components/shared/exercise/__tests__/numberFieldDraft.test.ts]

### 2026-11-01 - Zbiorcza archiwizacja wołała mutacje, których backend nie ma

- **Kategoria**: `GraphQL` | `Verification`
- **Problem**: Przyciski „Archiwizuj” na trzech listach weryfikacji zawsze kończyły się błędem: `batchArchiveExercises`, `batchArchiveOrganizationExercises` i `batchArchiveOrganizationExercisesAsAdmin` z SPEC-013 nigdy nie powstały w backendzie. Zaznaczanie działało też w zakładkach, w których backend nie pozwala archiwizować.
- **Przyczyna**: Operacje napisano według planu w specu, nie według `schema.graphql`; drugi raz ten sam wzorzec co wpis z 2026-09-19 (brak walidacji dokumentów GraphQL portalu względem SDL w CI).
- **Rozwiązanie**: `runBatchArchive` (`src/features/verification/utils/batchArchive.ts`) woła istniejącą pojedynczą mutację per ćwiczenie i liczy wynik per ID; zaznaczanie tylko w zakładce, której status backend archiwizuje (`published` globalnie, `verified` w organizacji).
- **Reguła**: Jeśli dodajesz operację GraphQL w portalu, zawsze sprawdź pole w `origin/main:backend/schema.graphql` z `fizjo-app`, nie w specu ani w checkoutcie innej gałęzi.

### 2026-11-01 - Błąd mutacji czytany polem z Apollo 3

- **Kategoria**: `GraphQL`
- **Problem**: Edycja shadow pacjenta, dodawanie pacjenta i przedłużenie zestawu pokazywały ogólny komunikat („Nie udało się zaktualizować…”) zamiast treści i kodu z backendu.
- **Przyczyna**: Kod rzutował błąd na `{ graphQLErrors }` z Apollo 3. Apollo 4 rzuca `CombinedGraphQLErrors` z `errors[]`, więc pole było zawsze `undefined`, a TypeScript tego nie widział przez `as`.
- **Rozwiązanie**: `getGraphQLErrorCode` i `getGraphQLErrorMessage` w `src/features/patients/utils/patientConsent.ts` (przez `CombinedGraphQLErrors.is`); reguła `no-restricted-syntax` blokuje `graphQLErrors`.
- **Reguła**: Jeśli czytasz błąd z `useMutation`, zawsze przez `CombinedGraphQLErrors.is` i `errors[i].extensions.code`, nigdy przez `as`. [egzekwowane: eslint.config.mjs]

### 2026-10-31 - Wyszukiwarka czatu: fikstura z polem, którego zapytanie nie pobiera

- **Kategoria**: `Testing` | `Chat`
- **Problem**: Wyszukiwanie ćwiczeń w czacie bez AI nie znajdowało „Mostek biodrowy” po „mostki” ani ćwiczeń po opisie klinicznym i tagach, a testy były zielone. Pierwsza poprawka powtórzyła błąd: fikstura z nazwą tagu, gdy picker niesie ID (review PR #148).
- **Przyczyna**: Stem brał tylko końcówkę zapytania, więc liczba mnoga i dopełniacz („mostki”, „pośladków”) nie były prefiksem nazwy. Fikstury miały pole `description`, którego `ExercisePickerFragment` nie pobiera (jest `clinicalDescription`), i tagi jako nazwy, choć `mainTags` i `additionalTags` to ID; czat nie mapował ich na nazwy jak kreator zestawu.
- **Rozwiązanie**: `wordMatches` porównuje rdzeń odmiany obu słów (`inflectionCore` w `src/features/ai-view/utils/textMatch.ts`); `searchExercises` czyta `clinicalDescription`, a `useAvailableExercises` zamienia ID tagów na nazwy (`withTagNames`).
- **Reguła**: Fikstura testu wyszukiwania ma pola z fragmentu GraphQL, którym przychodzą dane, nie z wyobrażonego typu. [egzekwowane: src/features/ai-view/utils/__tests__/exerciseLookup.test.ts]

### 2026-10-31 - Biały tekst na tle `*-muted` znika w jasnym motywie

- **Kategoria**: `UI` | `Design system`
- **Problem**: Badge statusu na kafelku ćwiczenia („Weryfikacja org”) i ostrzeżenia na karcie weryfikacji („Brak wideo”) miały `bg-status-*-muted text-white`; w jasnym motywie tekst był prawie niewidoczny.
- **Przyczyna**: Tokeny `*-muted` mają ~15% krycia, więc tło przejmuje kolor zdjęcia albo karty; stały `text-white`/`text-black` działa tylko w jednym motywie. Każdy feature składał overlay z klas od nowa.
- **Rozwiązanie**: Warianty `overlay-info|success|warning|danger` w `src/components/ui/badge.tsx` (tło karty, tekst i border w kolorze statusu) użyte w `ExerciseCard` i `VerificationTaskCard`.
- **Reguła**: Badge na zdjęciu bierze wariant `overlay-*`; na tle `*-muted` tekst ma kolor statusu, nigdy `text-white`/`text-black`. [egzekwowane: scripts/check-design-tokens.mjs]

### 2026-10-31 - Prettier przerabia `__tests__` w lessons.md na pogrubienie

- **Kategoria**: `Tooling` | `Agent workflow`
- **Problem**: Commit z nowym wpisem w `.ai/lessons.md` przeszedł przez lint-staged (`prettier --write` dla `*.md`), który zamienił każde gołe `__tests__` w znacznikach egzekwowania na `**tests**`; `agent:check` w CI padł na 8 ścieżkach.
- **Przyczyna**: Prettier traktuje `__słowo__` poza kodem jako pogrubienie; plik nigdy wcześniej nie był formatowany, więc pierwszy commit przez hook przepisał cały plik.
- **Rozwiązanie**: `.ai/lessons.md` w `.prettierignore`; plik przywrócony z `main`.
- **Reguła**: Pliki ze ścieżkami w zwykłym tekście, które czyta skrypt, wyłączaj z Prettiera. [egzekwowane: scripts/check-agent-context.mjs]

### 2026-10-31 - Treść ćwiczenia: „nie pobrano” to nie „pusto”

- **Kategoria**: `Data` | `Exercises`
- **Problem**: `AddExerciseToSetDialog`, `EditExerciseSetFullDialog` i kreator przypisania mapowały bibliotekę ręcznie bez `enrichmentData`, więc karta pokazywała puste instrukcje, a zapis edycji zestawu i przypisania wpisywał całą treść ćwiczenia do nadpisań (różnica liczona do pustego szablonu). Odchudzenie listy pickera groziło odwrotnością: różnica pełnego szablonu do pustej treści zapisałaby wyczyszczenie kroków.
- **Przyczyna**: `toV3(undefined)` daje pusty dokument, więc brak pola w odpowiedzi wyglądał jak ćwiczenie bez treści.
- **Rozwiązanie**: `undefined` = nie pobrano, `null` = brak treści; `buildEnrichmentOverrideDelta` i `resolveParamsEnrichmentDelta` nie liczą różnicy bez obu stron, a seed z mappingu bez treści trzyma samo `enrichmentOverride`. Picker doczytuje treść wybranych ćwiczeń i blokuje zapis do jej przyjścia.
- **Reguła**: Jeśli mapujesz ćwiczenie ręcznie albo odchudzasz fragment, zachowaj `enrichmentData` jako `undefined`, gdy go nie pobrano, i nigdy nie licz różnicy treści do szablonu, którego nie masz. [egzekwowane: src/components/shared/exercise/__tests__/enrichmentOverride.test.ts]

### 2026-10-31 - PR postawiony na innym PR wszedł do jego gałęzi, nie do main

- **Kategoria**: `Process` | `Git`
- **Problem**: #144 (lista ćwiczeń stronami) miał bazę `fix/exercise-library-large-org` (#143). Oba zmergowano w odstępie 14 sekund, więc #144 wszedł do gałęzi #143 już po jej merge'u, a stronicowanie nie trafiło na `main` ani na DEV, choć PR ma status „merged”.
- **Przyczyna**: GitHub przestawia bazę PR-a dziecka na `main` dopiero po usunięciu gałęzi bazowej; merge dziecka przed tym kończy się w gałęzi bazowej.
- **Rozwiązanie**: Brakujące commity weszły na `main` razem z poprawkami review (`fix/exercise-library-review`).
- **Reguła**: PR do `main` zawsze stawiaj od `main`. Jeśli dwa PR-y dotykają tych samych plików, drugi zostaje draftem do merge'u pierwszego, potem rebase na `main` i zmiana bazy, zanim wyjdzie z draftu.

### 2026-10-31 - Duża biblioteka: nazwy zamiast pełnego fragmentu, odświeżanie tylko aktywnych list

- **Kategoria**: `Performance` | `GraphQL`
- **Problem**: Na koncie z 5000 ćwiczeń otwarcie ćwiczenia, dialogu edycji albo kreatora ściągało całą bibliotekę z `ExerciseFullFragment` (`enrichmentData`, dziesiątki MB), choć potrzebne były same nazwy; kreator po utworzeniu czekał na pobranie całej listy, a podpowiedź duplikatów czytała `organizationExercises` z odpowiedzi `availableExercises`, więc od stycznia zawsze była pusta.
- **Przyczyna**: Zapytania „po nazwy” użyły pełnych query listy; `refetchQueries: [{ query, variables }]` pobiera listę z sieci nawet wtedy, gdy nikt jej nie wyświetla.
- **Rozwiązanie**: `GET_AVAILABLE_EXERCISE_NAMES_QUERY` i `GET_ORGANIZATION_EXERCISE_NAMES_QUERY` (ten sam root field, więc pełna lista w cache odpowiada bez sieci); `refetchQueries: [DOCUMENT]` odświeża tylko aktywne listy; usunięcie na liście usuwa rekord z cache; dopasowanie duplikatów w `exerciseDuplicateCandidates.ts`, a do AI idzie 80 najbliższych nazw (backend tnie prompt do 80).
- **Reguła**: Jeśli potrzebujesz kilku pól z listy ćwiczeń, napisz osobne query z tymi polami na tym samym root fieldzie. Po mutacji odświeżaj listy dokumentem (`refetchQueries: [GET_..._QUERY]`), a formy `{ query, variables }` używaj tylko dla pojedynczego rekordu. [egzekwowane: src/features/exercises/utils/__tests__/exerciseDuplicateCandidates.test.ts]

### 2026-10-30 - Jedna konfiguracja menu dla desktopu i mobile

- **Kategoria**: `UI` | `Navigation`
- **Problem**: Mobile nie miał żadnej weryfikacji, inne nazwy („Rozliczenia”, „Smart Tools”) i inne ikony niż desktop; trzy kolejki weryfikacji ćwiczeń były trzema pozycjami menu w dwóch grupach, a jedna nazywała się „Weryfikacja organizacji”, choć weryfikuje ćwiczenia wszystkich organizacji.
- **Przyczyna**: `Sidebar` i `MobileSidebar` trzymały osobne tablice `navigationGroups` z własnym filtrowaniem ról.
- **Rozwiązanie**: `navigationConfig.ts` + `useNavigationItems` dla obu menu; jedna pozycja „Weryfikacja” (`matchHrefs` na wszystkie kolejki) i `VerificationScopeTabs` z dostępnych zasięgów (`getVerificationScopes`). Sidebar ma tylko codzienną pracę; Zespół i Finanse są w menu konta (`buildAccountNavigationItems`), a zdublowany link „Ustawienia” zniknął.
- **Reguła**: Nowa pozycja menu idzie tylko do `navigationConfig.ts`. Kilka widoków tej samej pracy (różny zasięg) to jedna pozycja menu z zakładkami, nie osobne linki. Strony odwiedzane rzadziej niż raz w tygodniu idą do menu konta, nie do sidebara.

### 2026-10-27 - Zwrot z weryfikacji FiziYo jest na kopii, nie na oryginale

- **Kategoria**: `GraphQL`
- **Problem**: Zakładka „Do poprawy” (T-0003) filtrowała po `status === 'CHANGES_REQUESTED'`, więc ćwiczenia zwrócone z centrum weryfikacji nigdy się nie pojawiały.
- **Przyczyna**: `SubmitToGlobalReview` tworzy kopię globalną i nie zmienia statusu oryginału; `RejectExercise` ustawia `ChangesRequested` na kopii, której `availableExercises` nie zwraca.
- **Rozwiązanie**: Addytywne pole `Exercise.globalSubmissionStatus` (status kopii) w backendzie i filtr na nim w portalu.
- **Reguła**: Status weryfikacji globalnej oryginału czytaj z `globalSubmissionStatus`, nigdy z `status`. Test helpera ma odtwarzać kształt z listy (`status: 'DRAFT'` + status kopii), a nie wymyślony. [egzekwowane: src/features/exercises/utils/__tests__/exerciseNeedsChanges.test.ts]

### 2026-10-26 - Obecność pola to nie poprawność parametru

- **Kategoria**: `Exercise` | `UI/UX` | `Verification`
- **Problem**: Ekran weryfikacji świecił na zielono „Przysiad 100 serii × 1000 powtórzeń”, bo reguły publikacji sprawdzały tylko, czy serie i powtórzenia są większe od zera.
- **Przyczyna**: `computeVerificationCompletion` liczy kompletność, a nie wiarygodność; żadna warstwa nie znała limitów ani typowych zakresów, ani czasu całego ćwiczenia.
- **Rozwiązanie**: `utils/parameterRules.ts` ocenia każde pole (limit = blokada, poza typowym zakresem = „Sprawdź” z „Tak ma być”) i czas całego ćwiczenia (strona ciała ×2), a `verificationStages.ts` blokuje publikację, dopóki etap ma uwagi (SPEC-030).
- **Reguła**: Jeśli UI ocenia dane domenowe kolorem „gotowe”, zawsze sprawdzaj wiarygodność wartości (limit, typowy zakres, wynik złożony jak czas sesji), a nie tylko obecność — i trzymaj te reguły w czystej funkcji z testem przypadku absurdalnego. [egzekwowane: src/features/verification/utils/__tests__/parameterRules.test.ts]

### 2026-10-09 - Dokumentacja agentów cytowała usunięte operacje GraphQL

- **Kategoria**: `GraphQL` | `Docs`
- **Problem**: Po usunięciu martwych operacji AGENTS.md, ECOSYSTEM i specy nadal podawały `GET_EXERCISES_QUERY` (w panelu zakazane) i `GET_ADMIN_EXERCISES_QUERY` (nie istnieje), w tym jako wzorzec `useQuery` do kopiowania.
- **Przyczyna**: Listy API i przykłady w dokumentach były pisane ręcznie i nic nie porównywało ich z eksportami w `src/`.
- **Rozwiązanie**: Nazwy podmienione na żywe eksporty; `agent:check` uruchamia `scripts/check-agent-docs-graphql.mjs`, który odrzuca w plikach `AGENTS.md` nazwy `*_QUERY/_MUTATION/_SUBSCRIPTION/_FRAGMENT` bez eksportu w `src/`.
- **Reguła**: Usuwając operację GraphQL albo komponent, przeszukaj `AGENTS.md`, `.ai/` i `docs/` po nazwie w tym samym PR. Nazwy z mobile oznaczaj w dokumentach jako mobile, nie jako listę panelu. [egzekwowane: scripts/check-agent-docs-graphql.mjs]

### 2026-09-24 - BOTH nie podwaja restSets ani preparationTime

- **Kategoria**: `UI/UX` | `Testing`
- **Problem**: PR czasu ćwiczenia mnożył cały `workBlock` (w tym `restSets`) przez `side=both`, więc terapeuta widział 540 s / 11 min 5 s zamiast 420 s / 9 min 35 s z timera pacjenta.
- **Przyczyna**: Źle zrozumiany SSOT: player liczy `prep + workOneSide * sets * sideMultiplier + restSets * (sets-1)`.
- **Rozwiązanie**: Wzór z `main` / `computePlannedDurationSec`; test 420 s i fixture 110 s. `overridesJson` przy merge zostaje.
- **Reguła**: Jeśli liczysz czas dla BOTH, mnoż tylko blok pracy jednej strony; `restSets` raz. `preparationTime` na starcie oraz przed prawą stroną każdej serii (2026-10-27). [egzekwowane: src/utils/exerciseTime.test.ts]

### 2026-09-21 - Pusta lista rulesets to nie 403 planu Free

- **Kategoria**: `Build/Tooling`
- **Problem**: Portal `#78` po zielonym `validate` nadal nie nadawał się do merge: pin padał na Preview PR, a §6 polityki tłumaczył wyłączenie workera 403 „Upgrade to GitHub Pro”.
- **Przyczyna**: Workflow pinu jest brany z SHA deploymentu, więc merge `#95` na `main` nie naprawia otwartego PR bez wlania `main`. `GET …/rulesets` na `fiziyo-admin-portal` zwraca 200 `[]`; 403 planu jest historyczny.
- **Rozwiązanie**: Wlać `main` (pin skip Preview). §6 jak kanon fizjo-app: worker wyłączony bo `enabled: false`. `check-trunk-main` blokuje powrót zdania o 403 Free.
- **Reguła**: Jeśli GitHub `rulesets` zwraca `[]`, zawsze cytuj ten odczyt. Nie uzasadniaj wyłączenia workera historycznym 403 Pro. [egzekwowane: scripts/check-trunk-main.mjs]

### 2026-09-20 - Dodanie ćwiczenia do zestawu musi wysłać overridesJson

- **Kategoria**: `GraphQL`
- **Problem**: Dialog „Dodaj ćwiczenia” i fork TEMPLATE w Assignment Wizard pokazywały Razem, ale `addExerciseToExerciseSet` nie dostawał `overridesJson`. Mapping dziedziczył katalogowe Both — pacjent robił objętość ×2.
- **Przyczyna**: Kreator zestawu i pełna edycja już budują deltę strony; `AddExerciseToSetDialog` i `buildAddExerciseVariables` wysyłały tylko kolumny dawkowania.
- **Rozwiązanie**: Ten sam `buildMappingOverridesFromParams` co w `CreateSetWizard`. Test strażnik skanuje write-pathy z edytorem strony.
- **Reguła**: Każdy `addExerciseToExerciseSet` z karty `cardSurface="mapping"` albo zapis TEMPLATE musi wysłać `overridesJson`. Same kolumny dawkowania nie przenoszą strony. [egzekwowane: src/features/exercise-sets/utils/buildMappingOverridesFromParams.test.ts]

### 2026-09-19 - Wyszukiwanie ćwiczeń: AND tokenów, nie ciągła fraza

- **Kategoria**: `UI/UX` | `Testing`
- **Problem**: Dopisanie słowa w wyszukiwarce gubiło ćwiczenie, bo klient i backend szukały całego ciągu (`przysiad kettlebell` ≠ `Przysiad z kettlebell`).
- **Przyczyna**: `matchesSearchQuery` / `ToLower().Contains(cała fraza)` bez tokenizacji; e-mail autora w `ApplySearch` dawał szum.
- **Rozwiązanie**: `matchesExerciseSearch` / `filterExercisesBySearch` (portal `src/features/exercises/utils`) i backend `ExerciseSearchQuery` — token AND, ranking nazwy, bez e-maila.
- **Reguła**: Jeśli filtrujesz katalog ćwiczeń, zawsze tokenizuj zapytanie (AND, min. 2 znaki) i nie dopasowuj e-maila autora. [egzekwowane: src/features/exercises/utils/__tests__/exerciseSearch.test.ts]

### 2026-09-19 - QR pacjenta zawsze koduje HTTPS, nigdy custom scheme

- **Kategoria**: `UI/UX` | `Testing`
- **Problem**: Skaner telefonu na demo K01 pokazał „brak używalnych danych”, bo QR kodował `fiziyo://connect?...`.
- **Przyczyna**: Kamera otwiera tylko `http(s):`. Custom URI bez zainstalowanej apki jest dla skanera pustym payloadem. Copy i PDF używały jeszcze innych URL-i.
- **Rozwiązanie**: `buildPatientJoinUrl` / `buildPatientConnectUrl` w `src/lib/patientJoinUrl.ts`. QR tylko gdy `isHttpsUrl`. Pusty payload = spinner, nie kod.
- **Reguła**: Jeśli QR ma otworzyć się kamerą, zawsze koduj pełny `https://` na domenie FiziYo; nigdy `fiziyo://`, JSON ani pusty string. [egzekwowane: src/lib/__tests__/patientJoinUrl.test.ts]

### 2026-09-19 - Sidebar create-set musi pisać overridesJson strony

- **Kategoria**: `GraphQL`
- **Problem**: Kreator z listy ćwiczeń pokazywał i liczył zmienioną stronę (Razem vs Na każdą stronę), a `CreateSetDialog` nie wysyłał `overridesJson`. Mapping dziedziczył katalogowe Both → objętość pacjenta ×2.
- **Przyczyna**: Sidebar i `CreateSetWizard` dzielą `submitCreateTemplateSet`, ale dialog mapował tylko kolumny dawkowania.
- **Rozwiązanie**: `buildBuilderExerciseMapping` zapisuje deltę strony względem katalogowego `side`; test blokuje powrót inline mapowania w dialogu.
- **Reguła**: Jeśli karta zestawu edytuje `side`, zawsze wyślij deltę w `overridesJson` na tym samym write-path co wizard, nigdy samego dawkowania. [egzekwowane: src/components/exercise-builder/buildBuilderExerciseMapping.test.ts]
