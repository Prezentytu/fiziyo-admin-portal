---
spec: SPEC-031
repo: cross-repo
issues: []
prs: []
board: BW-FZ-47
---

# Widok czatu (eksperymentalny)

## Cel biznesowy

Fizjoterapeuta pisze, co zrobić („Przypisz Kowalskiemu zestaw na kolano”, „kto nie ćwiczy”), a panel odpowiada kartą z akcją zamiast przeklikiwania się przez menu. Źródło: call 30.10 (DEC-20261030-01, BW-FZ-47): czat do zestawów jest eksperymentalny, włączany przełącznikiem w ustawieniach i testowany na DEV; klasyczne tworzenie zestawu zostaje. Agent składa zestaw z puli ćwiczeń i odpowiada tylko ćwiczeniami, a gdy nie umie, mówi to wprost. DEC-20261029-02: czat jest głównym elementem ekranu startowego.

Wygląd: canvas „Czat v2 AJ” (https://claude.ai/artifact/QGoTcDeTx2JX2yDq86Rbyg). Architektura: dokument „AI view” (https://claude.ai/artifact/UpZMyQcwHjskRNg91nkpwV).

## Architektura

- Przełącznik: `Ustawienia → Wygląd → Widok czatu` (`ChatModeSettings`) i ikona w nagłówku (`ChatModeToggle`). Preferencja per przeglądarka w `localStorage` (`fiziyo-chat-mode`, `utils/chatModePreference.ts`), domyślnie wyłączona.
- Włączony czat zmienia powłokę panelu (`src/app/(dashboard)/layout.tsx`): cichy sidebar `ChatSidebar` (Nowa rozmowa ⌘K, Pacjenci z licznikiem nieaktywnych, Zestawy, Ćwiczenia, Skanuj wizytę, Ostatnie rozmowy, kredyty AI, menu konta z „Klasyczny panel”). Na `/` czat zajmuje cały ekran bez nagłówka; inne strony mają nagłówek i treść jak dotąd. Stan rozmowy trzyma `ChatSessionProvider` na poziomie layoutu, więc rozmowa przeżywa przejście do karty pacjenta i z powrotem.
- Rozmowa jak z asystentem, pod nią elementy aplikacji: odpowiedź to tekst plus co najwyżej jedna karta. Tekst pisze model (pole `reply`, aliasy podmienione z powrotem na imiona w backendzie) albo, bez AI, `utils/replyText.ts`. Karta pochodzi z zamkniętego katalogu (`utils/viewSpec.ts`): `SetDraft`, `AssignSummary`, `ExerciseResults`, `PatientPeek`, `Navigate`, `Clarify`, `AddPatient`, `CreateExercise`; `Message` oznacza sam tekst. Dane karta pobiera sama przez GraphQL.
- Karty lokalne (`utils/chatCards.ts`) nigdy nie przychodzą z modelu; to kolejne kroki przepływu w wątku: `PickPatient` → `Schedule` → `SendSummary` → `Sent`, oraz `SetSaved`, `PatientAdded`, `ExerciseCreated` (wynik zapisanego formularza, żeby po odświeżeniu formularz nie wrócił), `ScanVisit`, `DocumentResult`. Szybkie odpowiedzi (pigułki) po wyborze gasną (`chosen`).
- Docelowo w czacie da się zrobić wszystko, co w panelu. Zapis idzie tymi samymi mutacjami co klasyczne ekrany, zawsze po kliknięciu człowieka:
  - Zestaw dla pacjenta: `createExerciseSet` (`PATIENT_PLAN`, `sourceExerciseSetId`) → `addExerciseToExerciseSet` po kolei → `assignExerciseSetToPatient` z datami i rytmem (`utils/sendPlan.ts`, ta sama ścieżka co `AssignmentWizard`).
  - Szablon w katalogu: `submitCreateTemplateSet`. Pacjent: `createShadowPatient` jak w `PatientDialog`. Ćwiczenie: `createExercise` przez `buildCreateExerciseVariables`. Przypomnienie: `sendExerciseReminders` (nowa mutacja, patrz Interfejsy).
  - Pełny edytor (`CreateSetWizard`) zostaje jako wyjście z karty zestawu.
- Rozmowy: `localStorage` pod kluczem `fiziyo-chat-conversations:<userId>:<organizationId>`, 20 rozmów po 80 wiadomości, walidacja zod przy odczycie (`utils/conversationStore.ts`). Wylogowanie (`useAppSignOut`) czyści wszystkie klucze z tym prefiksem.
- Dyspozytor AI: `POST /api/chat/dispatch` w `fizjo-app/backend` (`ChatDispatchController`, `ChatDispatchService`). Imiona pacjentów zamienia na aliasy P1, P2 przed wysłaniem do modelu. Odpowiedź przechodzi przez `ChatViewSpecValidator`: znane komponenty i trasy, ID ćwiczeń i zestawów tylko z organizacji z tokenu, alias tylko na aktywnego pacjenta organizacji. Sesja w HybridCache, 30 min. 1 kredyt AI za odpowiedź modelu.
- Bez AI: te same karty zasila dyspozytor regułowy w przeglądarce (`utils/intentRouter.ts`), gdy AI jest wyłączone, backend nie odpowiada, skończyły się kredyty albo sesja wygasła; odpowiedź dostaje notkę z powodem (`utils/resolveReply.ts`).

### Logika (czyste funkcje, testy Vitest)

| Plik                            | Co liczy                                                                                |
| ------------------------------- | --------------------------------------------------------------------------------------- |
| `utils/textMatch.ts`            | Normalizacja i dopasowanie słów z odmianą (Kowalskiemu → Kowalski)                      |
| `utils/patientMatch.ts`         | Pacjent z tekstu: brak, jeden, kilku                                                    |
| `utils/intentRouter.ts`         | Reguły: polecenie → karta                                                               |
| `utils/viewSpec.ts`             | Zamknięty katalog kart, `parseDispatchReply` (tekst + karta, limit 1200 znaków)         |
| `utils/replyText.ts`            | Zdanie nad kartą, gdy nie ma tekstu modelu; bez form rodzajowych                        |
| `utils/resolveReply.ts`         | AI najpierw, reguły jako zapas z powodem; pytanie `Clarify` dopisane do tekstu          |
| `utils/setDraft.ts`             | Szkic zestawu: parametry z mappingu albo domyślne, minuty dziennie, nazwa               |
| `utils/schedulePlan.ts`         | Start, liczba tygodni, rytm → daty i `Frequency`                                        |
| `utils/sendPlan.ts`             | Kolejność zapisów przy wysyłce planu                                                    |
| `utils/conversationStore.ts`    | Historia rozmów: odczyt, tytuł, limity, czyszczenie przy wylogowaniu                    |
| `utils/todayAgenda.ts`          | „Dziś”: wizyty z notatek z dzisiejszą datą, nieaktywni (≥4 dni), plan kończy się ≤3 dni |
| `utils/exerciseAlternatives.ts` | Zamienniki ćwiczenia po wspólnych tagach                                                |
| `utils/documentItems.ts`        | Ćwiczenia z dokumentu albo notatki z wizyty i ich pewne dopasowania w katalogu          |
| `utils/exerciseLookup.ts`       | Wyszukiwanie ćwiczeń w puli organizacji                                                 |
| `utils/chatModePreference.ts`   | Odczyt i walidacja preferencji                                                          |

### Decyzje

- Tekst z modelu jest tylko tekstem (bez HTML i markdownu), a wszystko, co zmienia dane, jest kartą z przyciskiem. Do pacjenta trafia tylko to, co fizjoterapeuta zatwierdził w karcie `SendSummary`.
- Brak sztucznych blokad: czat ma umieć wszystko, co panel (decyzja Adama 30.10). Gdy czegoś jeszcze nie umie, mówi to wprost i proponuje, co umie.
- „Dziś N wizyt” liczy notatki kliniczne z dzisiejszą datą, bo panel nie ma jeszcze kalendarza wizyt (`/appointments` to zapowiedź).
- „Skanuj wizytę” działa z notatki albo dokumentu przez istniejący import; słuchanie wizyty (wyłuskiwanie zaleceń z rozmowy) jeszcze nie istnieje i karta mówi to wprost.
- „Kto nie ćwiczy” pokazuje pacjentów zalogowanego fizjoterapeuty; pytanie o konkretnego pacjenta szuka w całej organizacji (opieka zespołowa).
- Kilku pacjentów o tym samym imieniu: backend pyta „O kogo chodzi?” bez wołania modelu.
- Model: `Chat:OpenApiModelDispatcher` (domyślnie Haiku przez OpenRouter), osobny klucz klienta bez logowania promptów.

## Interfejsy

### REST (additive)

`POST /api/chat/dispatch`, `[Authorize]`, role owner/admin/therapist/staff (inaczej 403).

```json
// request
{ "message": "1–2000 znaków", "sessionId": "opcjonalny" }
// 200
{ "sessionId": "…", "reply": "tekst odpowiedzi albo null", "spec": { "component": "SetDraft", "patientId": null, "setId": null, "exerciseIds": [], "query": null, "filter": null, "route": null, "question": null, "options": [], "note": null }, "creditsUsed": 1 }
```

`reply` jest nowym polem (additive); stary panel go ignoruje. `AddPatient` niesie imię w `query`, `CreateExercise` nazwę w `query` i opis w `note`.

Błędy: `400 invalid_message`, `400 insufficient_credits`, `403 forbidden`, `502 dispatcher_unavailable`. Panel na każdy z nich odpowiada regułami.

### GraphQL

- Nowa mutacja (additive, Ask First): `sendExerciseReminders(organizationId: UUID!, patientIds: [UUID!]!): ExerciseReminderResult` z `{ sent, skipped }`. Wywołujący musi mieć rolę terapeutyczną w organizacji z tokenu, pacjenci muszą być aktywnymi członkami tej organizacji; jedno przypomnienie na pacjenta na dobę. Push przez istniejący `PatientNotificationService`, treść neutralna.
- Czyta istniejące: `organizationPatients`, `exerciseSets`, `availableExercises`, `userByClerkId`, `aiCreditsStatus`, `therapistClinicalNotes`, `patientClinicalNotes`, `patientAssignments`, `patientWeeklyAdherence`, `patientActivityReport`.

## Komponenty UI

`src/features/ai-view/`: `ChatSidebar`, `ChatView` (górny pasek 52 px, ekran startowy z powitaniem, skrótami i „Dziś”, wątek), `ChatComposer` (spinacz na dokument, dyktowanie wypełnia pole, Enter wysyła, Shift+Enter nowa linia, Escape czyści), `PatientContextPanel` (340 px od 1280 px, niżej arkusz), `ChatSessionContext`, `ChatModeToggle`, `ChatModeSettings`, `catalog/*Card` + `ChatSpecRenderer`. Formularze w kartach (`NewPatientForm`, `CreateExerciseCard`) to react-hook-form + zod, `Cmd/Ctrl+Enter` zapisuje. Prymitywy: `components/ui/choice-chip.tsx` (pigułki), `components/ui/segmented-control.tsx`.

## Data-testid

- Powłoka: `nav-chat-sidebar`, `nav-chat-mobile-sidebar`, `nav-chat-sidebar-collapse-btn`, `nav-chat-new-btn`, `nav-chat-{patients,sets,exercises}-link`, `nav-chat-inactive-count`, `nav-chat-scan-btn`, `nav-chat-recent-list`, `nav-chat-recent-item-<id>`, `nav-chat-recent-delete-btn-<id>`, `nav-chat-credits`, `nav-chat-user-menu-btn`, `nav-chat-{settings,organization}-link`, `nav-chat-classic-btn`, `nav-chat-sign-out-btn`.
- Widok: `common-chat-view`, `common-chat-thread`, `common-chat-thinking`, `common-chat-menu-btn`, `common-chat-sidebar-expand-btn`, `common-chat-ai-toggle-btn`, `common-chat-context-chip-btn`, `common-chat-new-btn`, `common-chat-shortcut-{set,patient,scan}-btn`, `common-chat-today-{btn,list,visit,inactive,ending}`, `common-chat-composer-{input,send-btn,attach-btn,file-input,mic-btn}`, `common-chat-context-{panel,close-btn,reason,week,pain,set,visit,set-btn,open-link}`.
- Odpowiedź: `common-chat-reply-<id>-<karta>` z elementami `-primary-btn`, `-option-<n>-btn`, `-item-<exerciseId>`, `-remove-<exerciseId>-btn`, `-undo-btn`, `-form`, `-<pole>-input`, `-submit-btn`, `-open-link` i innymi w kartach.
- Ustawienia: `nav-chat-mode-toggle-btn`, `settings-chat-mode-card`, `settings-chat-mode-switch`, `settings-chat-ai-switch`.
- Usunięty: `common-chat-shortcut-inactive-btn` (skrót zastąpiły „Dziś” i licznik w sidebarze); scenariuszy czatu nie ma jeszcze w `fiziyo-tests`.

## Verification plan

- Unit (Vitest): `src/features/ai-view/utils/__tests__/` i `src/features/ai-view/__tests__/`.
- Backend (xUnit): `fizjo-app/backend/FizjoApp.Api.Tests/Chat/Dispatch/` (aliasy, tekst odpowiedzi bez aliasów, nowe karty, obce ID) i testy `sendExerciseReminders` (rola, obca organizacja, limit dobowy).
- E2E: po merge'u na DEV ręcznie: włącz czat, „ułóż zestaw na kolano dla <pacjent>” → zmień parametr → Dalej: harmonogram → Pasuje → Wyślij pacjentowi; „dodaj pacjenta Anna Nowak”; „kto nie ćwiczy” → Przypomnij; „utwórz ćwiczenie mostek na jednej nodze”; spinacz z PDF zaleceń. Wyłączone AI daje te same karty. Scenariusze do `fiziyo-tests` po stabilizacji eksperymentu.

## Poza zakresem (następne kroki)

- Słuchanie wizyty i wyłuskiwanie zaleceń z rozmowy na żywo.
- Słownik form imion do aliasów (SPEC-032).
- Decyzja o przetwarzaniu danych przez OpenRouter vs bezpośrednio Anthropic (DPA).
- Strumieniowanie odpowiedzi; historia rozmów po stronie serwera (dziś tylko przeglądarka).

## Changelog

### 2026-10-30

- Utworzenie specyfikacji i pierwsza implementacja (panel + dyspozytor w backendzie).
- Wygląd i działanie jak w designie „Czat v2”: powłoka z sidebarem i historią rozmów, tekst odpowiedzi nad kartą, pełny przepływ zestawu w wątku (budowanie, harmonogram, wysyłka), dodawanie pacjenta, tworzenie ćwiczenia, przypomnienia, skan wizyty z notatki lub dokumentu, panel kontekstu pacjenta.
