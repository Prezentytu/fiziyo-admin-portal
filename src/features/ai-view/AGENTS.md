# AGENTS.md — Widok czatu

Spec: [SPEC-031](../../../.ai/specs/SPEC-031-2026-10-30-chat-view.md). Eksperyment za przełącznikiem (DEC-20261030-01); klasyczny dashboard i tworzenie zestawu zostają.

## Zasady

- Odpowiedź to tekst plus co najwyżej jedna karta. Tekst jest zwykłym tekstem (nigdy HTML), a każda zmiana danych to karta z przyciskiem. Nowa karta z modelu: typ w `ChatViewSpec`, degradacja w `toChatViewSpec`, komponent w `catalog/`, wpis w `ChatSpecRenderer` i w `ChatViewSpecValidator.Components` w `fizjo-app/backend`; obie listy muszą się zgadzać. Krok przepływu, którego model nie wybiera, to karta lokalna w `utils/chatCards.ts`.
- Zapis tylko po kliknięciu człowieka, tymi samymi mutacjami co klasyczne ekrany (`catalog/useChatWrites.ts`, `utils/sendPlan.ts`). Nie dokładaj sztucznych blokad: czego czat jeszcze nie umie, mówi wprost.
- Bez AI musi działać to samo: każda karta z backendu ma ścieżkę w `utils/intentRouter.ts`, a błąd dyspozytora kończy się odpowiedzią z reguł (`utils/resolveReply.ts`).
- Do backendu idzie tylko tekst wiadomości i `sessionId`. Imiona zamienia na aliasy backend; nie wysyłaj listy pacjentów ani danych z kart.
- Historia rozmów leży w `localStorage` per użytkownik i organizacja; wylogowanie ją czyści. Nie trzymaj w niej niczego poza wiadomościami i specami kart.
- Copy bez form rodzajowych („Brak pasujących ćwiczeń”, nie „Nie znalazłem”), bez „dawkowanie” i „nagrywanie”.
