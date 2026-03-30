---
name: code-review
description: Przeglada zmiany kodu pod katem jakosci, bezpieczenstwa i zgodnosci z zasadami FiziYo. Uzyj przy review PR, audycie diffa, weryfikacji zmian agenta lub gdy uzytkownik prosi o code review.
---

# Skill: Code Review FiziYo

## Opis

Użyj tego skilla gdy wykonujesz code review kodu w projekcie FiziYo Admin. Zapewnia spójność z konwencjami projektu.

Pelna lista kontroli znajduje sie w pliku referencyjnym:

- [references/review-checklist.md](references/review-checklist.md)
- Kontrakt kompatybilnosci: [BACKWARD_COMPATIBILITY.md](../../../BACKWARD_COMPATIBILITY.md)

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
- Weryfikacja kompatybilnosci kontraktu GraphQL (additive-first, brak cichego usuwania pol)

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

### Zmiana logiki biznesowej

- Sprawdz, czy dodano testy jednostkowe dla nowej/zmienionej logiki
- Sprawdz edge cases i regresje wynikajace z warunkow filtracji lub walidacji
- Jesli bug byl naprawiany, upewnij sie, ze istnieje test odtwarzajacy problem

## Backward Compatibility (frontend contract)

- Zmiany w GraphQL i typach TypeScript prowadź jako additive-first.
- Nie usuwaj ani nie zmieniaj znaczenia istniejących pól bez planu migracji.
- Sprawdz, czy wszystkie query/mutation korzystajace ze zmienionych pol zostaly zaktualizowane.
- Zweryfikuj zgodnosc z `BACKWARD_COMPATIBILITY.md` i zglaszaj naruszenia jako minimum **High**.

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
