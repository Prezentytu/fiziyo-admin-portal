# Skill: Code Review FiziYo

## Opis

Użyj tego skilla gdy wykonujesz code review kodu w projekcie FiziYo Admin. Zapewnia spójność z konwencjami projektu.

## Kiedy używać

- Przegląd PR przed merge
- Weryfikacja zmian wprowadzonych przez agenta
- Audyt istniejącego kodu
- Użytkownik prosi o "code review"

## Severity levels

Klasyfikuj uwagi według severity:

| Severity     | Przykłady                                                                                 | Akcja            |
| ------------ | ----------------------------------------------------------------------------------------- | ---------------- |
| **Critical** | `any` types, brak data-testid na interaktywnych elementach, brak walidacji zod na wejściu | Zablokuj merge   |
| **High**     | useLazyQuery zamiast useQuery, brak `"use client"` gdzie potrzebne, hardcoded kolory      | Wymagaj poprawki |
| **Medium**   | Nieoptymalne fetchPolicy, brak domyślnych wartości w formularzu, React.FC                 | Sugeruj poprawkę |
| **Low**      | Długie nazwy zmiennych, brakujące komentarze w złożonej logice                            | Opcjonalnie      |

## Heurystyki per typ zmiany

### Nowy komponent React

- Sprawdź `"use client"` jeśli używa hooks
- Sprawdź data-testid na przyciskach, inputach, linkach
- Sprawdź czy używa `@/components/ui/` i `@/components/shared/`
- Sprawdź Cmd+Enter i Escape w dialogach

### Zmiana GraphQL / Apollo

- useQuery z skip, nie useLazyQuery
- Walidacja organizationId i innych wymaganych zmiennych
- fetchPolicy odpowiedni do przypadku użycia

### Nowy formularz

- react-hook-form + zod
- zodResolver(schema)
- Domyślne wartości dla wszystkich pól
- Typ wyprowadzony z schema: `z.infer<typeof schema>`

### Nowy dialog

- Cmd/Ctrl+Enter — submit
- Escape — zamknięcie
- Wzorzec: dialog zawsze renderowany, akceptuj null dla wybranego obiektu

### Nowa strona / route

- Sprawdź struktury katalogów Next.js App Router
- Sprawdź czy wymaga layoutu, loading, error boundary

## Checklist code review

### Critical

- [ ] Brak `any` — używaj `unknown` + type guard
- [ ] Każdy interaktywny element ma `data-testid`
- [ ] Walidacja danych wejściowych (zod) gdzie wymagana

### TypeScript

- [ ] Typy wyprowadzone z zod przez `z.infer<typeof schema>`
- [ ] Komponenty jako zwykłe funkcje (NIE `React.FC`)
- [ ] `"use client"` jako pierwsza linia w komponentach klienckich

### GraphQL / Apollo

- [ ] `useQuery` z `skip` zamiast `useLazyQuery`
- [ ] `fetchPolicy: "cache-first"` gdzie odpowiednie
- [ ] Zmienne zapytania walidowane (organizationId, etc.)

### Formularze

- [ ] react-hook-form + zod
- [ ] `zodResolver(schema)` w useForm
- [ ] Domyślne wartości dla wszystkich pól

### UI / Komponenty

- [ ] Dialogi: `Cmd/Ctrl+Enter` submit, `Escape` zamknięcie
- [ ] Preferuj `@/components/ui/` i `@/components/shared/`
- [ ] Zmienne CSS (Tailwind), nie hardcoded kolory

### Bezpieczeństwo

- [ ] Brak logowania credentials/tokenów
- [ ] Minimalne komunikaty błędów auth

### Konwencje nazewnictwa

- [ ] Komponenty: PascalCase
- [ ] Zapytania GraphQL: UPPER_SNAKE
- [ ] data-testid: `[moduł]-[komponent]-[element]-[akcja?]`

## Pytanie końcowe

**Czy senior developer zaakceptowałby ten kod?**

Jeśli nie — opisz co poprawić z podaniem severity. Po korektach rozważ aktualizację `.ai/lessons.md` jeśli odkryto powtarzający się problem.
