# Czat AI i kredyty

## Rola

Czat jest domyślnym widokiem pulpitu (`src/features/ai-view/AGENTS.md`): fizjoterapeuta pisze, czego potrzebuje, a czat odpowiada zdaniem i co najwyżej jedną kartą (wyniki ćwiczeń, szkic zestawu, podsumowanie przypisania, nowy pacjent). Copilot proponuje, człowiek zatwierdza: każda zmiana danych to karta z przyciskiem. Kredyty AI to pula gabinetu; gdy się kończy, panel ostrzega i pozwala poprosić o więcej. Miarą są minuty oszczędzone po wizycie.

## Jak dotrzeć

- Konto `fizjoterapeuta-bot` (tenant A); do granicy tenantu `fizjoterapeuta-bot-b`. Tylko dane syntetyczne.
- Pulpit `src/app/(dashboard)/page.tsx` pokazuje `src/features/ai-view/ChatView.tsx`, gdy tryb czatu jest włączony (`src/features/ai-view/useChatMode.ts`), inaczej klasyczny pulpit.
- Backend to REST, nie GraphQL: `src/features/ai-view/chatDispatchClient.ts` woła `POST /api/chat/dispatch` w `fizjo-app:backend/FizjoApp.Api/Controllers/ChatDispatchController.cs`. Karty w `src/features/ai-view/catalog/` czytają dane przez GraphQL panelu, a zapisują w `src/features/ai-view/catalog/useChatWrites.ts`.
- Kredyty: `src/features/ai-credits/` (prośba o kredyty, szczegóły puli), progi w `src/features/ai-credits/utils/creditsRequest.ts`.
- Druga połowa: `fizjo-app:docs/funkcje/asystent-ai.md`.

## Jak sprawdzić

- Testy: `src/features/ai-view/utils/__tests__/viewSpec.test.ts`, `src/features/ai-view/utils/__tests__/resolveReply.test.ts`, `src/features/ai-view/utils/__tests__/intentRouter.test.ts`, `src/features/ai-view/utils/__tests__/sendPlan.test.ts`, `src/features/ai-view/utils/__tests__/setDraft.test.ts`, `src/features/ai-view/utils/__tests__/seedDraft.test.ts`, `src/features/ai-view/utils/__tests__/conversationStore.test.ts`, `src/features/ai-view/catalog/__tests__/useChatWrites.test.ts`, `src/features/ai-view/__tests__/useChatThread.test.ts`, `src/features/ai-credits/utils/__tests__/creditsRequest.test.ts`, `src/features/ai-credits/utils/__tests__/creditsUsage.test.ts`, `src/features/ai-credits/AiCreditsDetailsPopover.test.tsx`.
- E2E w `fiziyo-tests:TEST_PLAN.md`: N04 (w trybie czatu menu zwinięte na `/patients`, „Rozwiń menu” w nagłówku je przywraca), stan nieodhaczony.
- Ręcznie: „znajdź ćwiczenie na kolano” daje kartę wyników; szkic zestawu z czatu wysłany pacjentowi daje plan widoczny w karcie pacjenta i w aplikacji z tymi samymi liczbami; przy wyłączonym AI albo błędzie dyspozytora odpowiedź przychodzi z reguł; przy zerowym saldzie czat mówi o kredytach, a saldo nie spada.
- Porażka: zapis bez kliknięcia, lista pacjentów albo dane z kart w ciele żądania, inna liczba w karcie niż w odpowiedzi tekstowej, historia rozmowy innego użytkownika albo organizacji po przelogowaniu.

## Uważaj na

- Szkic zestawu z czatu zapisuje się przez `buildAddExerciseToSetVariables` (`src/features/ai-view/utils/sendPlan.ts:55`, szablon przez `submitCreateTemplateSet` w `src/features/ai-view/catalog/useChatWrites.ts:55`), więc gubi jawne zero jak kompozytor (ES09, `src/features/exercise-sets/utils/createSetSubmit.ts:91`). Gdy pozycja szkicu ma jawne 0 (na przykład seed z szablonu), plan pacjenta wysłany z czatu dostaje przerwę z katalogu, a ten sam plan z kreatora przypisania zero zachowuje; czy karta szkicu pozwala wpisać 0 ręcznie: niepotwierdzone ([kompozytor-zestawu](kompozytor-zestawu.md)).
- Liczba podana przez model w tekście pochodzi z `fizjo-app:backend/FizjoApp.Api/Chat/ChatExerciseDoseMapper.cs` (przez `fizjo-app:backend/FizjoApp.Api/Chat/ChatTools.cs`), a karta liczy z GraphQL panelu i `src/components/shared/exercise/resolveEffectiveExerciseParams.ts`. To dwa liczenia tej samej dawki; czy dają ten sam czas dla `both`: niepotwierdzone (`fizjo-app:docs/funkcje/strona-cwiczenia.md`).
- Karta z modelu musi mieć gałąź w `src/features/ai-view/catalog/ChatSpecRenderer.tsx` dla każdego komponentu z `ChatViewSpecValidator.Components` w `fizjo-app:backend/FizjoApp.Api/Chat/Dispatch/ChatViewSpecValidator.cs`. Renderer ma też karty lokalne przepływu (`src/features/ai-view/utils/chatCards.ts`), których backend nie zna; degradację nieznanej karty robi `toChatViewSpec` w `src/features/ai-view/utils/viewSpec.ts`.
- Do backendu idzie tylko tekst i `sessionId` (`src/features/ai-view/chatDispatchClient.ts`); imiona zamienia na aliasy backend. Historia leży w `localStorage` per użytkownik i organizacja (`src/features/ai-view/utils/conversationStore.ts`).
- Saldo odświeża się po odpowiedzi z `creditsUsed > 0`, a brak kredytów to błąd `insufficient_credits` (`src/features/ai-view/chatDispatchClient.ts`). Ostrzeżenie liczy się od tej samej puli co pasek w sidebarze (2438a2c0, `src/features/ai-credits/utils/creditsRequest.ts`).
- Copy bez form rodzajowych i bez słów zakazanych w `src/features/ai-view/AGENTS.md`; rozmowa z wizyty to wyłuskiwanie zaleceń (DEC-20261029-04).
