# AGENTS.md — Widok czatu

Spec: [SPEC-031](../../../.ai/specs/SPEC-031-2026-10-30-chat-view.md). Eksperyment za przełącznikiem (DEC-20261030-01); klasyczny dashboard i tworzenie zestawu zostają.

## Zasady

- Odpowiedź to zawsze jedna karta z katalogu `utils/viewSpec.ts`, nigdy wolny tekst ani HTML z modelu. Nowa karta: typ w `ChatViewSpec`, degradacja w `toChatViewSpec`, komponent w `catalog/`, wpis w `ChatSpecRenderer` i w `ChatViewSpecValidator.Components` w `fizjo-app/backend`. Obie listy muszą się zgadzać.
- Karta dostaje ID i sama pobiera dane z GraphQL. Zapis tylko przez istniejące wizardy (`AssignmentWizard`, `CreateSetWizard`, `PatientDialog`) po kliknięciu.
- Bez AI musi działać to samo: każda karta, którą zwraca backend, ma ścieżkę w `utils/intentRouter.ts`, a błąd dyspozytora kończy się odpowiedzią z reguł (`utils/resolveReply.ts`).
- Do backendu idzie tylko tekst wiadomości i `sessionId`. Imiona zamienia na aliasy backend; nie wysyłaj listy pacjentów ani danych z kart.
- Copy bez form rodzajowych („Brak pasujących ćwiczeń”, nie „Nie znalazłem”), bez „dawkowanie” i „nagrywanie”.
