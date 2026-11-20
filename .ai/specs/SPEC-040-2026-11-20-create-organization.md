---
spec: SPEC-040
repo: fiziyo-admin-portal
issues: []
prs: []
board: # zlecenie Adama 20.11.2026
---

# Tworzenie organizacji z panelu

## Cel biznesowy

Fizjoterapeuta, który prowadzi drugi gabinet albo dołączył do cudzej organizacji i chce własnej, nie mógł jej założyć z interfejsu. Stan `main` z 20.11.2026:

- `OrganizationSwitcher` renderował menu tylko przy co najmniej dwóch organizacjach, więc przy jednej pozycja „Utwórz nową organizację” nie istniała;
- przy dwóch i więcej pozycja prowadziła do `/onboarding`, który tylko ponawia wymianę tokenu i wraca na `/`, bez tworzenia czegokolwiek;
- w trybie czatu menu konta nie miało żadnego wejścia, a w ustawieniach było tylko „Dołącz do organizacji”.

Mutacja `createOrganization(name, description)` istnieje w backendzie: tworzy organizację i członkostwo `owner` wywołującego (`fizjo-app/backend/FizjoApp.Api/Types/OrganizationsMutation.cs`).

## Architektura

- **Jeden dialog**: `src/components/organization/CreateOrganizationDialog.tsx` (`react-hook-form` + zod). Pola: nazwa (2–100 znaków po `trim`) i opis (do 300 znaków; pusty idzie jako `null`). Limity odpowiadają `[StringLength]` na `Organization` w backendzie. Schemat i mapowanie na zmienne: `createOrganizationForm.ts`.
- **Jeden hook**: `useCreateOrganization` wywołuje mutację, a potem `enterOrganization` z `OrganizationContext`. Ref blokuje drugie wysłanie, zanim przycisk się wyłączy, bo mutacja nie jest idempotentna.
- **Wejście do nowej organizacji**: `enterOrganization(organizationId)` w kontekście to wspólna ścieżka z `switchOrganization`: `change-organization` w token exchange, zapis tokenu, `setDefaultOrganization`, `resetStore`. W odróżnieniu od `switchOrganization` nie szuka organizacji w liście z pamięci (nowej jeszcze tam nie ma), nie pokazuje toastu i rzuca błąd. Backend sprawdza członkostwo w bazie (`SwitchOrganizationTokenForUserByEmail`), więc świeżo utworzone członkostwo `owner` wystarcza.
- **Wyniki**:
  - utworzono i przełączono: toast sukcesu, dialog się zamyka, panel pokazuje nową organizację;
  - utworzono, ale przełączenie padło: toast ostrzegawczy „wybierz ją w przełączniku”, odświeżenie listy organizacji, dialog się zamyka. Nie zachęcamy do ponowienia, bo to założyłoby duplikat;
  - nie utworzono: błąd w dialogu, dialog zostaje otwarty z wpisanymi danymi.
- **Wejścia**: przełącznik organizacji w klasycznym panelu (menu także przy jednej organizacji, `⌘O` działa zawsze), menu konta w czacie oraz ustawienia konta (kafelek obok „Dołącz do organizacji”, także bez organizacji). Dialog renderuje się poza `DropdownMenuContent`, żeby zamknięcie menu nie zabierało fokusu.

## Interfejsy API

Bez zmian w kontrakcie. Panel używa istniejącej operacji:

```graphql
mutation CreateOrganization($name: String!, $description: String) {
  createOrganization(name: $name, description: $description) {
    id
    name
    description
    isActive
    logoUrl
    allowPersonalExercises
    sharedExercisesByDefault
    creationTime
  }
}
```

Typ odpowiedzi: `CreateOrganizationResponse` w `src/graphql/types/organization.types.ts`.

## Komponenty UI

- `CreateOrganizationDialog`, `useCreateOrganization`, `createOrganizationForm.ts` (`src/components/organization/`)
- `OrganizationSwitcher` (`src/components/layout/`), `ChatSidebar` (`src/features/ai-view/`), `OrganizationsList` (`src/components/settings/`)

## Data-testid

- Dialog: `org-create-dialog`, `org-create-name-input`, `org-create-description-input`, `org-create-error`, `org-create-cancel-btn`, `org-create-submit-btn`
- Wejścia: `nav-org-switcher-create` (bez zmiany ID; teraz otwiera dialog zamiast linku do `/onboarding`), `nav-chat-create-organization-btn`, `settings-orgs-create-btn`

## Poza zakresem

- Backend przyjmuje pustą nazwę i nie ogranicza, kto może założyć organizację. Walidacja żyje dziś tylko w panelu; tę lukę trzeba zamknąć w `fizjo-app`.
- Cennik, plan i limity nowej organizacji. Copy niczego tu nie obiecuje.

## Verification plan

- Unit: `createOrganizationForm.test.ts` (trim, limity, pusty opis), `CreateOrganizationDialog.test.tsx` (sukces, `Cmd+Enter`, jedno wywołanie przy dwóch wysłaniach w jednym takcie, częściowa porażka bez duplikatu, błąd w dialogu, pusta nazwa), `OrganizationSwitcher.test.tsx` (wejście przy jednej organizacji, bez linku do `/onboarding`; oba przypadki padają na `main`), `src/contexts/__tests__/enterOrganization.test.tsx` (wejście do organizacji spoza listy, błąd wymiany tokenu).
- E2E (`fiziyo-tests`, po merge'u na devportal): konto testowe z jedną organizacją, przełącznik, „Utwórz nową organizację”, nazwa, „Utwórz organizację”. Oczekiwane: przełącznik pokazuje nową nazwę z rolą „Właściciel”, a lista pacjentów jest pusta.

## Changelog

### 2026-11-20

- Utworzenie specyfikacji razem z implementacją.
