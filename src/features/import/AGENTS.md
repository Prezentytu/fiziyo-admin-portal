# AGENTS.md — Import Module

Instrukcje dla zmian w `src/features/import/`.

## Always

- Trzymaj podział `components/`, `hooks/`, `types/`, `utils/` zgodnie z `.ai/STRUCTURE.md`.
- Przy zmianie reguł parsowania/walidacji dokumentów dodawaj lub aktualizuj testy jednostkowe.
- Używaj typów i kontraktów GraphQL z `src/graphql/` zamiast duplikowania lokalnych DTO.

## Ask First

- Zanim zmienisz kontrakt GraphQL, shape danych importu lub semantykę statusów importu.
- Zanim dodasz nowe zależności zewnętrzne do parsowania plików i OCR.
- Zanim zmienisz copy/error handling, który wpływa na flow użytkownika poza modułem importu.

## Never

- Nigdy nie używaj `any`.
- Nigdy nie loguj surowych danych wrażliwych z importowanych dokumentów.
- Nigdy nie pomijaj walidacji wejścia i obsługi stanów błędu.

## Validation Commands

```bash
npm run lint
npm run test:run
```
