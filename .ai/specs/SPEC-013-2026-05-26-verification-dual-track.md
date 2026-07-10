# Verification Dual-Track (Global + Organization)

## Cel biznesowy

Wprowadzenie dwóch równoległych torów zgłoszeń ćwiczeń do weryfikacji:

- tor globalny (publikacja do bazy FiziYo),
- tor organizacyjny (lokalne przygotowanie jakości w ramach organizacji).

Zmiana eliminuje blokujące walidacje przy zgłoszeniu (`warn-only`) i umożliwia SiteSuperAdmin moderację ćwiczeń organizacyjnych cross-org, aby przyspieszyć wsparcie jakościowe dla zespołów klientów.

## Architektura

### Backend (.NET + GraphQL)

- `submitToGlobalReview` oraz `resubmitFromOriginal` działają w trybie `warn-only` (bez twardych wymagań typu media/opis/tagi).
- Dodany cross-org zestaw query/mutacji dla ContentManager/SiteSuperAdmin:
  - `crossOrgVerificationStats`
  - `crossOrgVerificationQueuePage`
  - `crossOrgVerificationQueueNavigator`
  - `getExerciseByIdForCrossOrgVerification`
  - `approveOrganizationExerciseAsAdmin`
  - `requestOrganizationExerciseChangesAsAdmin`
  - `archiveOrganizationExerciseAsAdmin`
- `OrganizationAccessService` zawiera bypass membership dla cross-org moderacji przez `RequireSiteSuperAdminOrOrgPermission(...)`.

### Admin Portal (Next.js)

- Sidebar wykorzystuje longest-prefix matching (`navigationActive.ts`), więc aktywna jest tylko najbardziej specyficzna ścieżka.
- `SubmitToGlobalDialog` i `SubmitToOrganizationDialog` działają jako `warn-only` (sugestie jakościowe, brak blokady CTA).
- Na liście i detalu ćwiczenia dostępne są osobne akcje dla obu torów zgłoszeń.
- `VerdictPanel` obsługuje tryb `organization`, a logika dostępnych akcji jest oparta o `orgStateMachine`.
- Dodano nowy obszar dla SiteSuperAdmin:
  - `/verification/organizations`
  - `/verification/organizations/[id]`

## Interfejsy

### GraphQL Queries/Mutations

#### Queries

- `crossOrgVerificationStats: OrganizationVerificationStats!`
- `crossOrgVerificationQueuePage(filter, page, pageSize): CrossOrgVerificationQueuePage!`
- `crossOrgVerificationQueueNavigator(filter, currentExerciseId): VerificationQueueNavigator!`
- `getExerciseByIdForCrossOrgVerification(exerciseId): Exercise!`

#### Mutations

- `approveOrganizationExerciseAsAdmin(exerciseId, reviewNotes): Exercise!`
- `requestOrganizationExerciseChangesAsAdmin(exerciseId, reviewNotes, rejectionReason): Exercise!`
- `archiveOrganizationExerciseAsAdmin(exerciseId): Exercise!`

### Komponenty

| Komponent                       | Lokalizacja                                                    | Opis                                                        |
| ------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------- |
| `SubmitToGlobalDialog`          | `src/features/exercises/SubmitToGlobalDialog.tsx`              | Dialog global submit z sugestiami jakościowymi (warn-only). |
| `SubmitToOrganizationDialog`    | `src/features/exercises/SubmitToOrganizationDialog.tsx`        | Dialog org submit z lekką checklistą i zawsze aktywnym CTA. |
| `VerdictPanel`                  | `src/features/verification/VerdictPanel.tsx`                   | Wspólny panel decyzji z trybem `global`/`organization`.     |
| `navigationActive`              | `src/components/layout/navigationActive.ts`                    | Helper longest-prefix do poprawnego podświetlania sidebaru. |
| `Cross Org Verification Page`   | `src/app/(dashboard)/verification/organizations/page.tsx`      | Kolejka cross-org dla SiteSuperAdmin.                       |
| `Cross Org Verification Detail` | `src/app/(dashboard)/verification/organizations/[id]/page.tsx` | Detal moderacji cross-org.                                  |

## Data-testid

- `nav-link-verification-organizations`
- `exercise-submit-to-org-dialog`
- `cross-org-verification-page`
- `cross-org-verification-search-input`
- `cross-org-verification-detail-page`
- `cross-org-verification-back-btn`

## Testy i walidacja

- Frontend unit tests:
  - `src/components/layout/__tests__/navigationActive.test.ts`
  - `src/features/exercises/__tests__/SubmitToOrganizationDialog.test.tsx`
  - `src/features/exercises/__tests__/SubmitToGlobalDialog.test.tsx`
  - `src/features/verification/utils/__tests__/orgStateMachine.test.ts`
- Backend tests:
  - `backend/FizjoApp.Api.Tests/Types/OrganizationExerciseVerificationCrossOrgTests.cs`
- Quality gate:
  - `npm run validate`

## Bulk archive actions (2026-07)

Centrum Weryfikacji wspiera masowe zaznaczanie i archiwizację ćwiczeń w trzech kolejkach:

- globalnej (`/verification`) — `ARCHIVED_GLOBAL`,
- bieżącej organizacji (`/organization/verification`) — `ORG_ARCHIVED`,
- cross-org SiteSuperAdmin (`/verification/organizations`) — `ORG_ARCHIVED` z walidacją scope'u organizacji.

Archiwizacja jest soft-delete: rekord ćwiczenia, media i historia recenzji pozostają zachowane, a ćwiczenie znika z aktywnej kolejki i pozostaje dostępne w filtrze archiwalnym. Zaznaczenie obejmuje wyłącznie elementy aktualnie załadowanej strony paginacji. Wynik bulk operation musi raportować sukcesy i błędy per ID, aby częściowa porażka nie była ukryta przed recenzentem.

Proponowane additive-first mutacje GraphQL:

- `batchArchiveExercises(exerciseIds, reason)` — globalny ContentManager,
- `batchArchiveOrganizationExercises(organizationId, exerciseIds, reason)` — Owner/Admin bieżącej organizacji,
- `batchArchiveOrganizationExercisesAsAdmin(organizationExercises, reason)` — SiteSuperAdmin, gdzie każdy element niesie `organizationId` i `exerciseId`.

Każda mutacja musi ponownie sprawdzać RBAC, scope organizacji i dozwolone przejścia state machine; frontend nie może traktować samego `exerciseId` jako dowodu przynależności do organizacji.

## Changelog

### 2026-05-26

- Utworzenie SPEC-013 dla refaktoru dual-track verification.
- Udokumentowanie trybu warn-only, cross-org panelu SiteSuperAdmin i poprawki nawigacji sidebar.

### 2026-07-11

- Dodano plan bulk selection i soft-delete/archiwizacji dla globalnej, organizacyjnej i cross-org kolejki.
- Ustalono page-scoped selection, jawne potwierdzenie i obsługę partial failure.
