# Audyt kliknięć K01 — „za dużo klikaczy, wyrzuciłbym jedną trzecią”

Data: 2026-09-19. Repo: `fiziyo-admin-portal`. Strumień W5.
Rozmówca: K01 (praktyk, 40–60 tys. rozpisanych programów). Cytat ≤ 25 słów: „za dużo klikaczy, wyrzuciłbym jedną trzecią”.
Miara z VISION: ile minut i kliknięć oszczędza fizjoterapeucie po wizycie.

Metodologia (fakt): kliknięcie = osobna akcja wskaźnika (przycisk, tab, karta, collapsible, potwierdzenie). Pisanie w polu = 0 kliknięć, ale liczy się pole jako koszt uwagi. Happy path = nowy pacjent / nowe ćwiczenie / zestaw źródłowy bez edycji parametrów / otwarcie karty postępu. Liczby poniżej to odczyt z kodu, nie pomiar z sesji użytkownika.

Hipoteza (ocena): K01 porównuje z własnym narzędziem zoptymalizowanym pod 40–60 tys. programów; „jedna trzecia” to nie 33% widgetów, tylko zbędne **decyzje** (interstitial, tab, Dalej, podsumowanie).

## Problem (dowody z kodu)

Happy path „po wizycie” w portalu to 4 niezależne ciągi, nie jeden ekran. Suma kliknięć wynika z **kroków wymuszających decyzję**, nie z pól wymaganych.

| Flow | Ekrany/dialogi | Kliknięcia (happy path) | Pola wymagane | Pola opcjonalne widoczne od razu | Potwierdzenia |
| --- | --- | ---: | ---: | ---: | ---: |
| 1. Nowy pacjent + zaproszenie | 2 dialogi (`PatientDialog`, `PatientInviteDialog`) | 6–9 | 3 (kontakt + imię + nazwisko) | notatka zwinięta; w zaproszeniu imię + 3 taby | dirty-close + takeover |
| 2. Ćwiczenie własne | 1 dialog (`CreateExerciseWizard`) | 2–5 | 1 (nazwa ≥ 2 znaki) | media, styl AI, tagi, opis, TIER 1–2 | dirty-close |
| 3. Zestaw + przypisanie | `CreateSetWizard` **lub** Assignment Wizard 4–5 kroków | 6–11 | nazwa planu + ≥1 ćwiczenie + pacjent | customize zawsze; 4 karty częstotliwości + 4 czasy | summary + dirty-close + success (W7) |
| 4. Postęp i feedback | 1 strona, bez zakładek | 1–4 | 0 | journal + ActivityReport (6+ kart) + NextStep 1–2 CTA | brak |

Fakty oddzielone od ocen: tabele w `## Stan obecny` cytują pliki i linie. Ranking i klasyfikacja `usuń/scal/…` są oceną.

## Stan obecny (jak działa dziś, krok po kroku)

### Flow 1 — nowy pacjent i zaproszenie

**Dodanie pacjenta** (`src/features/patients/PatientDialog.tsx`, `UnifiedPatientInput.tsx`).

Zod wymaga tylko imienia i nazwiska (`patientFormSchema`, linie 83–87 w `UnifiedPatientInput.tsx`). Kontakt (email **albo** telefon) jest bramką wyszukiwania, nie polem zod. Notatka `contextLabel` jest opcjonalna i zwinięta (`isNoteExpanded` startuje od `false`, linia 161).

| # | Ekran | Akcja | Kliknięcia | Wymagane | Opcjonalne widoczne | Potwierdzenie |
| --- | --- | --- | ---: | --- | --- | --- |
| 1 | Lista pacjentów | „Nowy pacjent” | 1 | — | — | — |
| 2 | `viewState=search` | wpis email/telefonu | 0 (autofocus) | kontakt poprawny | — | — |
| 3 | ten sam | **Dalej** (`patient-unified-next-btn`, 596–605) | **1** | — | — | lookup nie startuje przy pisaniu (`UnifiedPatientInput.test.tsx`: „does not trigger search automatically”) |
| 4a | `found` | „Dodaj do moich pacjentów” | 1 | — | — | takeover `ConfirmDialog` gdy inny fizjo (904–916) |
| 4b | `form` (auto-morph gdy brak w bazie, 277–280) | imię*, nazwisko*, „Dodaj pacjenta” | 1 | firstName, lastName | „Dodaj notatkę” (1 klik by rozwinąć) | dirty-close (387–396 w `PatientDialog`) |
| 5 | Success interstitial (252–350) | **3 CTA** tej samej wagi: „Personalizuj i przypisz”, „Dodaj kolejnego”, „Zamknij” | **1** (wybór) | — | — | — |

Stopka search/form: `justify-end` (592, 879) — Anuluj i CTA zgrupowane po prawej, wbrew konwencji `justify-between`.

Escape jest (499–509). Cmd/Ctrl+Enter **brak** w tym dialogu. Enter w search = Dalej; Enter w `found` = dodaj/profil.

Mutacja create nie wysyła SMS (`sendActivationSms` zostaje default `false`, komentarz 144). Zaproszenie to **osobny** dialog.

**Zaproszenie** (`src/components/finances/PatientInviteDialog.tsx`).

| # | Ekran | Akcja | Kliknięcia | Wymagane | Opcjonalne widoczne | Potwierdzenie |
| --- | --- | --- | ---: | --- | --- | --- |
| 1 | Finanse / kontekst | „Zaproś pacjenta” | 1 | — | — | — |
| 2 | Dialog, tab `link` (default 54) | link auto-generowany (107–121) | 0 | — | Imię, placeholder **„(opcjonalne)”** (251) | — |
| 3 | ten sam | **dwa** przyciski Kopiuj (264–289) | 1 | — | — | — |
| 4 | tab `qr` | przełączenie | **1** | — | QR tego samego URL (300–318) | — |
| 5 | tab `send` | przełączenie + email/telefon + Wyślij | 2 | email XOR telefon | — | auto-close 1.5 s |

Suma happy path pacjent-w-gabinecie (telefon → create → assign): **5 kliknięć** przed wizardem (otwórz, Dalej, zapisz, interstitial, start wizarda). Zaproszenie QR: otwórz + tab QR + (kopiuj zbędny).

### Flow 2 — ćwiczenie własne

`CreateExerciseWizard.tsx`. Walidacja UI: `isValid = data.name.trim().length >= 2` (1425). Backend/GraphQL bez zmian w tym audycie.

`DEFAULT_DATA` (150–171): `sets: 3`, `reps: 10`, `restSets: 60`, `restReps: 0`, `preparationTime: 5`, `exerciseSide: 'none'`. Presety 3×10 / 3×15 / 4×8 / 30s×3 / 45s×3 (71–77).

`ExerciseParametersEditor` `variant="create"` zwija TIER 3–4 (`collapseAdvanced`, `ExerciseParametersEditor.tsx` 107–108). TIER 1–2 (serie, powt., czas powtórzenia, obciążenie, przerwa między seriami) zawsze widoczne — `PARAMETER_SECTIONS.basic` (`fieldContract.ts` 510–515).

| # | Ekran | Akcja | Kliknięcia | Wymagane | Opcjonalne widoczne domyślnie | Potwierdzenie |
| --- | --- | --- | ---: | --- | --- | --- |
| 1 | Lista | „Utwórz własne” | 1 | — | — | — |
| 2 | Dialog | nazwa | 0 | nazwa ≥ 2 | tagi, dropzone mediów, **styl AI + Generuj**, opis pacjenta, parametry TIER 1–2 | — |
| 3 | ten sam | „Treść dodatkowa” (`showAdvanced`, 1976) | 0 jeśli pominięte | — | enrichment, opis kliniczny, audio, wideo URL, notatki | — |
| 4 | Stopka | Zapisz | 1 | — | — | dirty-close (2078–2087) |

Stopka `justify-end` (2051), nie `justify-between`. Cmd/Ctrl+Enter **brak**. Opis pacjenta jest **świadomie** poza collapsible (`exerciseContentSections.parity.test.tsx` linia 42: „opis jest poza collapsible”).

Happy path (nazwa + Zapisz, parametry default): **2 kliknięcia**. Koszt to scroll i szum ~10 kontrolek, nie liczba required.

### Flow 3 — zestaw i przypisanie

**Kreator zestawu** (`CreateSetWizard.tsx`): jeden ekran. Nazwa (`SetNameField`), opis zwinięty (`SetDescriptionCollapsible`, `showDescription` start `false` linia 77), builder ćwiczeń, zapis. Auto-assign opcjonalny. Dirty-close. Domyślne parametry z `getExerciseDefaultParams` (3×10, rest 60 — `exerciseDefaults.ts` 58–65).

**Assignment Wizard** (`types.ts` `getWizardSteps` 257–328, `AGENTS.md` assignment):

- `from-patient` bez zestawu: `select-set → customize-set → schedule → summary` (4 kroki). `customize-set` **zawsze**, „nie jest opcjonalny” (`AGENTS.md` linia 15).
- `from-set`: bez select-set, wciąż customize + pacjenci + schedule + summary.
- Edit: customize → schedule → summary.

Nie zmieniam struktury kroków ani pierwszego kroku (W3). Poniżej pomiar.

| # | Ekran | Akcja | Kliknięcia | Wymagane | Opcjonalne widoczne | Potwierdzenie |
| --- | --- | --- | ---: | --- | --- | --- |
| 1 | Wejście | „Personalizuj i przypisz” | 1 | — | — | dirty-close |
| 2 | `select-set` | wybór kafelka + Dalej | 2 | zestaw albo „Stwórz nowy” | wyszukiwarka, AI nazwy | — |
| 3 | `customize-set` | Dalej bez zmian | **1** (krok obowiązkowy) | ≥1 ćwiczenie, nazwa planu | karty parametrów wszystkich ćwiczeń | — |
| 4 | `schedule` | 4 karty częst. + 4 czasy; default `timesPerWeek: 3`, `endDate = +30 dni` (`AssignmentWizard.tsx` 255–257, `defaultFrequency` 260–271) | 0 jeśli default + Dalej **1** | — | NumberControl, dni tygodnia przy SPECIFIC | — |
| 5 | `summary` | przełącznik „zapisz jako zestaw org”, CTA submit | **1** | — | lista ćwiczeń, concierge feedback | to jest potwierdzenie nieniszczące wobec UI, ale tworzy `PATIENT_PLAN` |
| 6 | Success | QR/PDF | (W7 — nie ruszamy) | — | — | — |

Suma from-patient, zestaw bez edycji: **7 kliknięć** (otwórz + wybór + 4× Dalej/submit). Mobile ma już `flowMode === 'quick'` → `quick-confirm` zamiast customize/schedule/review (`AssignmentComposer.tsx` 336–344) — portal tego nie ma.

### Flow 4 — postęp i feedback

Strona `src/app/(dashboard)/patients/[id]/page.tsx`: **brak Tabs**. Hero: przypisz, QR, 2 statystyki. Siatka: zestawy | notatki kliniczne + `PatientJournalNotes` | `ActivityReport`.

`ActivityReport.tsx`: KPI 30 dni, adherence, jakość sesji, `TherapyStatusCard`, `NextStepCard` (1–2 CTA), heatmap, `EventJournal` (`journalDays={3}`), `SetProgressCard`, `ExerciseExecutionLog`. Dziennik pacjenta jest **dwa razy**: sidebar `PatientJournalNotes` (wpisy udostępnione, expand 43–52) i `EventJournal` (postęp ćwiczeń).

Happy path „sprawdź czy ćwiczy”: **1 klik** (wejście w pacjenta) + scroll. Extra klik: expand wpisu, Odśwież, CTA NextStep, edycja planu.

## Opcje rozwiązania

### Opcja A — chirurgia UI (ten PR)

Zakres per repo:

- `fiziyo-admin-portal`: auto-advance kompletnego kontaktu; jedno główne CTA na success; scalenie tabów QR+link, jeden Kopiuj, bez „(opcjonalne)”.
- `fiziyo-tests`: Page Object `addPatient` czeka na auto-advance albo klika Dalej; etykiety `Dalej` / `Zamknij` / `Pacjent dodany!` bez zmian.

Ryzyka: E2E P01/P02 (wyścig Dalej vs auto-advance) — PO musi być odporny. Takeover i dirty-close zostają (billing/dostęp / utrata danych). GraphQL: brak. Backend: brak. Tenant: brak.

Koszt: niski (czyste funkcje + testy Vitest + korekta PO).

### Opcja B — skrócić Assignment Wizard (W3, nie tu)

Pominąć `customize-set` gdy zestaw bez zmian; pominąć `summary` gdy jeden pacjent i default harmonogram; pierwszy krok „gotowiec”. Mobile już ma `quick-confirm`.

Ryzyka: kontrakt always-fork / `PATIENT_PLAN`; E2E `assignment.spec.ts` (`Personalizuj i przypisz`); W3 równolegle. GraphQL bez zmian jeśli tylko UI skip.

Koszt: średni. Oszczędność: 2–4 kliknięcia na każdym przypisaniu — największy dźwignia, poza zakresem W5 implementacji.

### Opcja C — nic nie wycinamy, tylko Copilot po wizycie (VISION)

Fizjo klika OK na propozycji. Wymaga środowiska demo, bazy ćwiczeń, gotowców (rada 2026-09-18). Nie leczy klikaczy w obecnym CRUD.

## Rekomendacja

Opcja A teraz (3 cięcia o najlepszym stosunku oszczędność/ryzyko, bez GraphQL i bez kroków wizarda). Opcja B zostaje w rankingu dla W3/Adama. Opcja C jest kierunkiem VISION, nie tym PR.

### Ranking top 10

| # | Zmiana | Klasa | Oszczędność | Ryzyko | Koszt | Ten PR |
| --- | --- | --- | ---: | --- | --- | --- |
| 1 | Pominąć `summary` gdy default + 1 pacjent | `pomiń krok gdy jedna opcja` | 1 klik / assign | średnie: E2E, always-fork copy | średni | nie (struktura wizarda = W3) |
| 2 | Pominąć `customize-set` gdy brak zmian / gotowiec | `pomiń krok` | 1 klik + scroll | średnie: AGENTS „zawsze obecny”; W3 | średni | nie (W3) |
| 3 | Auto-advance kompletnego email/telefonu | `pomiń krok gdy jedna opcja` | 1 klik / pacjenta | niskie: Vitest + PO E2E | niski | **tak** |
| 4 | Success pacjenta: 1 CTA zamiast 3 | `jedno CTA` | 1 decyzja; Zamknij zostaje dla P02 | niskie: testid i „Zamknij” bez zmian | niski | **tak** |
| 5 | Scal Link+QR, 1× Kopiuj, default QR | `scal` | 1–2 kliknięcia zaproszenia | niskie: unit test tabów; E2E nie łapie tabów | niski | **tak** |
| 6 | Zapamiętać ostatni harmonogram | `domyślna wartość` | 0–2 na powtórce | niskie, ale lesson 2026-03-30: localStorage ≠ auto-confirm billingu | niski | nie (nie billing, odłożone by nie ruszać wizarda) |
| 7 | Zwinąć opis pacjenta w create | `zwiń jako zaawansowane` | 0 klik, mniej szumu | średnie: test parity **świadomie** trzyma opis na wierzchu | niski | nie |
| 8 | Zwinąć styl AI pod „Więcej opcji” | `zwiń` | 0 klik | niskie | niski | nie |
| 9 | Scalić dziennik sidebar + EventJournal | `scal` | 0–1 expand | średnie: dwa źródła danych (shared journal vs progress) | średni | nie |
| 10 | Cmd/Ctrl+Enter w dialogach pacjenta/invite | `skrót klawiszowy` | 0 myszy | zerowe | niski | **tak** (przy okazji 3 i 5) |

Nie ruszamy: takeover confirm, dirty-close, aktywacja planu (lesson: nigdy auto-confirm billing), `AssignmentSuccessDialog` / ShareSheet (W7), stany puste (W1), copy „dawkowanie”.

## Plan wdrożenia i testów

1. Wyciągnąć `isCompletePatientContact` / `shouldAutoAdvanceContact` + Vitest.
2. Debounce 300 ms w `search` → to samo `handleNext` co Dalej.
3. Success: primary „Personalizuj i przypisz”; secondary rząd `justify-between`: „Dodaj kolejnego” | „Zamknij”.
4. Invite: 2 taby (QR i link / Wyślij), jeden Kopiuj, placeholder „Imię pacjenta”, Cmd+Enter na wysyłkę.
5. `fiziyo-tests`: `PatientsPage.addPatient` czeka na Imię albo klika Dalej.
6. Vitest dotkniętych plików → lint → type-check → raz `npm run validate`.

### Decyzje testowe E2E (`fiziyo-tests`)

| Zmiana UI | Decyzja | Powód |
| --- | --- | --- |
| Auto-advance kontaktu | **Aktualizacja PO** `PatientsPage.addPatient` + dopisek P01 w `TEST_PLAN.md` | P01/P02 wołają `modalNextBtn.click()`; po auto-advance „Dalej” znika. Etykieta „Dalej” zostaje. |
| Success 1 CTA | **Bez nowego E2E** | P01 asercja `Pacjent dodany!`, P02 klika `Zamknij` — teksty/role bez zmian. |
| Invite QR+link | **Bez E2E** | Brak PO na taby `Link`/`QR kod`. `FinancesPage.invitePatientBtn` = „Zaproś pacjenta”. |
| Cmd+Enter | **Bez E2E** | Nie używane w PO. |

## Ask First / decyzje Adama

- Czy W3 może skasować obowiązek `customize-set` z `assignment/AGENTS.md` (linia 15) dla gotowca? To największa oszczędność po wizycie.
- Czy portal ma dostać `quick-confirm` jak mobile (`AssignmentComposer` `flowMode=quick`)?
- Czy success po pacjencie ma **auto-otwierać** wizard (kolejne −1 klik)? Teraz zostaje 1 CTA — fizjo z kolejką „dodaj trzech” nadal ma „Dodaj kolejnego”.
- Nie pytamy o GraphQL / migracje / tenant — brak.

## Poza zakresem (znalezione obok)

- W3: select-set / gotowiec / pierwszy krok wizarda.
- W7: `AssignmentSuccessDialog`, PDF/QR po assign.
- W1: puste stany list.
- Stopka create ćwiczenia `justify-end` i brak Cmd+Enter tam — nie ruszane.
- `CreateExerciseSetModal.tsx` w mobile (~2900 linii) — god-file, analogiczny nadmiar.
- Pytanie K01 o współdzielenie pacjenta w placówce — nie ten strumień.
- Filtr listy „Subskrypcja” w E2E P04 (`patients.spec.ts` 80) — copy pacjenta iOS zakazuje tego słowa; to etykieta portalu, poza W5.

## Tabele kandydatów per flow

Klasyfikacja: `usuń` / `scal` / `domyślna wartość` / `zwiń jako zaawansowane` / `pomiń krok gdy jedna opcja` / `skrót klawiszowy`.

### Flow 1

| Kandydat | Klasa | Oszczędność | Ryzyko | Koszt |
| --- | --- | --- | --- | --- |
| Dalej przy kompletnym kontakcie | `pomiń krok gdy jedna opcja` | 1 | E2E PO | niski |
| 3 CTA success | `jedno CTA` | 1 decyzja | P02 Zamknij | niski |
| Taby Link vs QR | `scal` | 1 | unit | niski |
| Drugi Kopiuj | `usuń` | 1 widoczny | zerowe | niski |
| „(opcjonalne)” w placeholderze | `usuń` (copy) | 0 | zerowe | niski |
| Cmd+Enter | `skrót` | 0 myszy | zerowe | niski |
| Takeover confirm | zostaw | 0 | dostęp innego fizjo | — |
| Auto-open wizard po create | `pomiń krok` | 1 | kolejka „dodaj trzech” | niski — Ask First |

### Flow 2

| Kandydat | Klasa | Oszczędność | Ryzyko | Koszt |
| --- | --- | --- | --- | --- |
| Opis pacjenta zawsze widoczny | `zwiń` | szum | test parity | niski — nie w tym PR |
| Styl AI zawsze widoczny | `zwiń` | szum | zerowe | niski |
| Presety + już wypełnione 3×10 | `domyślna wartość` (jest) | 0 | — | zrobione wcześniej |
| Cmd+Enter / `justify-between` stopki | `skrót` | 0 | zerowe | niski — nie w tym PR |

### Flow 3

| Kandydat | Klasa | Oszczędność | Ryzyko | Koszt |
| --- | --- | --- | --- | --- |
| customize zawsze | `pomiń krok` | 1+ | W3, AGENTS | średni |
| summary | `pomiń krok` | 1 | W3, E2E assign | średni |
| 4+4 karty schedule vs default 3×/tydzień 30 dni | `domyślna wartość` (jest) | 0 jeśli akceptuje | — | — |
| last-used schedule | `domyślna wartość` | 0–2 | nie billing, ale wizard | niski |
| saveAsTemplate na summary | `zwiń` | 0 | rzadkie | niski |

### Flow 4

| Kandydat | Klasa | Oszczędność | Ryzyko | Koszt |
| --- | --- | --- | --- | --- |
| Brak tabów na stronie pacjenta | — | już dobrze | — | — |
| Dwa dzienniki | `scal` | scroll | dwa query | średni |
| NextStep 1–2 CTA | zostaw (już 1 kotwica, komentarz Contrast Effect) | 0 | — | — |
| Expand wpisu journal | zostaw (treść długa) | 0–1 | — | — |

## Mobile — obserwacje

Bez zmian w `fizjo-app`.

- Terapeuta na mobile ma **osobny** composer (`AssignmentComposer.tsx`) z `flowMode: 'quick'` i krokiem `quick-confirm` — portal wymaga pełnego customize+schedule+summary. Nadmiar kliknięć K01 dotyczy **panelu**, ale mobile jest tu **chudszy** na przypisaniu.
- Tworzenie zestawu: `CreateExerciseSetModal.tsx` to god-file (~2900 linii, `STRUCTURE.md`). Ten sam wzorzec „wszystko na modalu” co portalowy create ćwiczenia, tylko gorzej podzielony.
- Pacjent (iOS) nie tworzy pacjentów ani szablonów; postęp ogląda w apce, fizjo w panelu. Duplikat journal/progress jest problemem panelu, nie playera.
- `SPEC-010` obiecuje parytet assignment admin ↔ mobile; dziś quick path jest tylko na mobile — to argument za opcją B, nie za dalszymi cięciami CRUD pacjenta.

## Weryfikacja (uzupełniane po testach)

Zobacz treść PR i odpowiedź koordynatora. Każde sprawdzenie: ✅ / ❌ / unverified.
