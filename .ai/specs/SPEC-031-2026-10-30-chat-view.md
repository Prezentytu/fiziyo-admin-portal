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

- Przełącznik: `Ustawienia → Wygląd → Widok czatu` (`ChatModeSettings`) i ikona w nagłówku (`ChatModeToggle`). Preferencja per przeglądarka w `localStorage` (`fiziyo-chat-mode`, `utils/chatModePreference.ts`), domyślnie wyłączona. Włączony czat zastępuje dashboard na `/`; reszta panelu bez zmian.
- Model wybiera komponent i ID, nie pisze treści. Odpowiedź to jedna karta z zamkniętego katalogu (`utils/viewSpec.ts`): `SetDraft`, `AssignSummary`, `ExerciseResults`, `PatientPeek`, `Navigate`, `Clarify`. Dane karta pobiera sama przez GraphQL, a każdy zapis idzie istniejącymi wizardami (`AssignmentWizard`, `CreateSetWizard`, `PatientDialog`) po kliknięciu człowieka.
- Dyspozytor AI: `POST /api/chat/dispatch` w `fizjo-app/backend` (`ChatDispatchController`, `ChatDispatchService`). Imiona pacjentów zamienia na aliasy P1, P2 przed wysłaniem do modelu (cała organizacja, więc pacjent kolegi też nie wychodzi z imieniem). Odpowiedź modelu przechodzi przez `ChatViewSpecValidator`: znane komponenty i trasy, ID ćwiczeń i zestawów tylko z organizacji z tokenu, alias tylko na aktywnego pacjenta organizacji. Sesja rozmowy w HybridCache pod kluczem organizacja + użytkownik + sesja, 30 min. 1 kredyt AI za odpowiedź modelu.
- Bez AI: ten sam renderer kart zasila dyspozytor regułowy w przeglądarce (`utils/intentRouter.ts`). Działa, gdy AI jest wyłączone przełącznikiem w czacie, gdy backend nie odpowiada, gdy skończyły się kredyty albo sesja wygasła; karta dostaje wtedy notkę z powodem (`utils/resolveReply.ts`).

### Logika (czyste funkcje, testy Vitest)

| Plik                          | Co liczy                                                                     |
| ----------------------------- | ---------------------------------------------------------------------------- |
| `utils/textMatch.ts`          | Normalizacja i dopasowanie słów z odmianą (Kowalskiemu → Kowalski)           |
| `utils/patientMatch.ts`       | Pacjent z tekstu: brak, jeden, kilku                                         |
| `utils/intentRouter.ts`       | Reguły: polecenie → karta                                                    |
| `utils/viewSpec.ts`           | Zamknięty katalog kart, degradacja nieznanych pól, limit 4 opcji w `Clarify` |
| `utils/exerciseLookup.ts`     | Wyszukiwanie ćwiczeń w puli organizacji                                      |
| `utils/resolveReply.ts`       | AI najpierw, reguły jako zapas z powodem                                     |
| `utils/chatModePreference.ts` | Odczyt i walidacja preferencji                                               |

### Decyzje

- Karta zamiast wolnego tekstu: nie ma treści, której fizjoterapeuta nie widzi przed akcją, i nie ma HTML z modelu.
- `SetDraft` z gotowym zestawem bez zmian otwiera przypisanie; po usunięciu ćwiczenia albo z luźnej listy otwiera `CreateSetWizard` z wybranymi ćwiczeniami. Nic nie zapisuje się bez wizarda.
- „Kto nie ćwiczy” pokazuje pacjentów zalogowanego fizjoterapeuty; pytanie o konkretnego pacjenta szuka w całej organizacji (opieka zespołowa).
- Kilku pacjentów o tym samym imieniu: backend pyta „O kogo chodzi?” bez wołania modelu.
- Model: `Chat:OpenApiModelDispatcher` (domyślnie Haiku przez OpenRouter), osobny klucz klienta bez logowania promptów.

## Interfejsy

### REST (additive, nowy endpoint)

`POST /api/chat/dispatch`, `[Authorize]`, role owner/admin/therapist/staff (inaczej 403).

```json
// request
{ "message": "1–2000 znaków", "sessionId": "opcjonalny" }
// 200
{ "sessionId": "…", "spec": { "component": "SetDraft", "patientId": null, "setId": null, "exerciseIds": [], "query": null, "filter": null, "route": null, "question": null, "options": [], "note": null }, "creditsUsed": 1 }
```

Błędy: `400 invalid_message`, `400 insufficient_credits`, `403 forbidden`, `502 dispatcher_unavailable`. Panel na każdy z nich odpowiada regułami.

### GraphQL

Bez zmian kontraktu. Czyta istniejące `organizationPatients`, `exerciseSets`, `availableExercises`, `userByClerkId`.

## Komponenty UI

`src/features/ai-view/`: `ChatView`, `ChatComposer` (Enter wysyła, Shift+Enter nowa linia, Escape czyści), `ChatModeToggle`, `ChatModeSettings`, `catalog/*Card` + `ChatSpecRenderer`. Kafelki ćwiczeń przez `ExerciseExecutionCard`.

## Data-testid

`common-chat-view`, `common-chat-thread`, `common-chat-thinking`, `common-chat-composer-input`, `common-chat-composer-send-btn`, `common-chat-ai-toggle-btn`, `common-chat-new-btn`, `common-chat-shortcut-{set,patient,inactive}-btn`, odpowiedź `common-chat-reply-<id>-<karta>` z elementami `-primary-btn`, `-primary-link`, `-option-<n>-btn`, `-remove-<exerciseId>-btn`, `-undo-btn`, `-item-<exerciseId>`, `-patient-<id>-link`, `-open-link`, `-all-link`; `nav-chat-mode-toggle-btn`, `settings-chat-mode-card`, `settings-chat-mode-switch`, `settings-chat-ai-switch`. Wszystkie nowe, nic nie usunięto.

## Verification plan

- Unit (Vitest): `src/features/ai-view/utils/__tests__/` (dopasowanie pacjenta z odmianą, reguły intencji, walidacja katalogu kart, wyszukiwanie ćwiczeń, preferencja, zapas bez AI).
- Backend (xUnit): `fizjo-app/backend/FizjoApp.Api.Tests/Chat/Dispatch/` (aliasy zamiast imion w prompcie, odrzucanie obcych ID i tras, sesja związana z użytkownikiem, awaria modelu → reguły).
- E2E: po merge'u na DEV ręcznie: włącz czat w ustawieniach, „Przypisz <pacjent> zestaw na kolano” → karta → wizard; „kto nie ćwiczy”; wyłączone AI daje te same karty. Scenariusze do `fiziyo-tests` po stabilizacji eksperymentu.

## Poza zakresem (następne kroki)

- Skan zaleceń z wizyty jako wejście czatu (brak w panelu).
- Decyzja o przetwarzaniu danych przez OpenRouter vs bezpośrednio Anthropic (DPA); w wiadomości mogą zostać dane spoza listy pacjentów.
- Strumieniowanie odpowiedzi.

## Changelog

### 2026-10-30

- Utworzenie specyfikacji i pierwsza implementacja (panel + dyspozytor w backendzie).
