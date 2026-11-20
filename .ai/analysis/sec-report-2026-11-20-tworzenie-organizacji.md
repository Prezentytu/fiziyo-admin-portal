# Sec report: tworzenie organizacji z panelu (SPEC-040)

- Materiał: diff `feat/tworzenie-organizacji` względem `origin/main` @ d6f87f59
- Dotknięte miejsca wrażliwe: `src/contexts/OrganizationContext.tsx`. `switchOrganization` dzieli teraz z nowym `enterOrganization` wywołanie `GET /api/token-exchange/change-organization/{id}`, zapis tokenu i `resetStore`.
- Werdykt: brak P0 i P1. Diff nie zmienia granicy tenantu. Trzy ryzyka P2 istniały wcześniej w backendzie.

## Auth i sesja

- `enterOrganization` przyjmuje dowolne `organizationId`, bez sprawdzania listy w pamięci. Nie jest to obejście, bo listę z pamięci sprawdzał tylko UI. Backend wydaje token wyłącznie przy aktywnym członkostwie w bazie (`SwitchOrganizationTokenForUserByEmail`, `fizjo-app/backend/FizjoApp.Api/Services/TokenExchangeService.cs`) i w przeciwnym razie zwraca 403. Test: `src/contexts/__tests__/enterOrganization.test.tsx`.
- Czyszczenie tokenu przy 401/403 zostało i jest pokryte testem. Nowy token zapisuje się dopiero po udanej wymianie.
- Do GraphQL nadal idzie wyłącznie JWT backendu, nigdy token Clerka.

## Dane i granice tenantu

- `resetStore` po zmianie tokenu wyrzuca dane poprzedniej organizacji z cache Apollo, tak jak przy dotychczasowym przełączaniu.
- `createOrganization` nie ma `organizationId`, bo tworzy nowego tenanta, a członkostwo `owner` dostaje wywołujący z JWT. Mutacja nie daje dostępu do istniejących danych.

## Walidacja wejścia

- Nazwę (2–100 znaków po `trim`) i opis (do 300 znaków) waliduje zod w panelu. React escapuje wartości przy renderowaniu, więc nie ma wektora XSS.

## Sekrety i PII

- Nowe `console.error` logują obiekt błędu mutacji albo wymiany tokenu, bez zmiennych i bez tokenu. Komunikat wymiany zawiera tylko status HTTP i tekst backendu bez PII.

## Ryzyka (P2, backend, istniały przed tą zmianą)

1. **Brak walidacji nazwy w `CreateOrganization`.** Wywołanie GraphQL z pominięciem panelu tworzy organizację o pustej nazwie. Kolumna ma `[StringLength(100)]`, więc dłuższa nazwa kończy się błędem bazy zamiast błędu walidacji. Rekomendacja: walidacja w resolverze z kodem błędu.
2. **Każdy zalogowany może tworzyć organizacje bez limitu.** Dotyczy to także konta pacjenta z tokenem z aplikacji mobilnej, bo resolver ma tylko `[Authorize]`. Scenariusz: skrypt zakłada tysiące organizacji. Rekomendacja: odrzucać konta pacjentów (`IsCompanyAccount`) i dodać limit liczby organizacji na właściciela albo rate limit.
3. **Brak idempotencji.** Podwójne wysłanie tworzy duplikat. Panel blokuje drugie wysłanie refem (test w `CreateOrganizationDialog.test.tsx`), ale inny klient nie ma tej blokady. Rekomendacja: klucz idempotencji albo unikalność nazwy w obrębie właściciela.

## Next steps — go deeper

- Zgłosić punkty 1–3 w `fizjo-app` jako jedną zmianę resolvera `OrganizationsMutation.CreateOrganization` z testami.
- Po wdrożeniu na DEV przejść E2E: utworzenie organizacji, przełączenie, pusta lista pacjentów w nowej organizacji.

## Similar hotspots

- `src/components/settings/OrganizationsList.tsx` i `OrganizationSwitchMenuItems.tsx` wołają `switchOrganization`. Ich zachowanie się nie zmieniło: wyszukiwanie w liście, toast, obsługa błędu.
- `src/app/(dashboard)/onboarding/page.tsx` wymienia token Clerka przy samonaprawie organizacji. Diff go nie dotyka.
