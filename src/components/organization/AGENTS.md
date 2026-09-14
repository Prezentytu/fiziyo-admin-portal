# AGENTS.md — Organizacja i gabinety

## Zakres

Użyj tego katalogu do członków, zaproszeń, klinik, widoczności katalogu
i importu JSON. Strony: `app/(dashboard)/organization/`.
Ustawienia konta zostaw w `src/components/settings/`.

## MUST

- Każde zapytanie i mutacja scopinguj `organizationId`.
- Role sprawdzaj przez `useRoleAccess` albo `AccessGuard`; nie zgaduj z UI.
- Import katalogu wieszaj na `canImportCatalog` (owner/admin/therapist), nie na
  `canManageOrganization`.
- Zaproszenia: token jest sekretem — nie loguj, nie wklejaj do issue.
- Dialogi: `Escape`, `Cmd/Ctrl+Enter`, stopka `justify-between`.
- Theme-safe tokeny. `ShareSheet` i overlaye nie dostają `bg-white` bez `dark:`.
- Prefiks testid: `org-`.

## Wzorce

- Zakładki: `MembersTab`, `ClinicsTab`, `InvitationsTab`, `SettingsTab`.
- Zaproszenie: `InviteMemberDialog` + `InvitationsSection`.
- Kliniki: `ClinicDialog`, `ClinicCard`, `AssignToClinicDialog`.
- Katalog: `CatalogBundleImportCard`, `ExerciseVisibilitySettings`.
- Logika listy zespołu: `teamSectionUtils.ts` + test obok.

## Gdy dodajesz plik

1. Sprawdź `index.ts` i reużyj kartę/dialog z tego folderu.
2. Nie kopiuj layoutu do `settings/` ani `finances/`.
3. Nowa mutacja: typ odpowiedzi w `src/graphql/types/`, `useMutation<T>`.

## Referencje

- SPEC-009, SPEC-011, SPEC-016, SPEC-025
- Access: `src/components/shared/AccessGuard.tsx`
