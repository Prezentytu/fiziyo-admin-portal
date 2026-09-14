# AGENTS.md — Ustawienia użytkownika

## Zakres

Użyj tego katalogu do ustawień konta i dołączenia do organizacji.
Zarządzanie gabinetem, członkami i katalogiem pisz w
`src/components/organization/AGENTS.md`. Finanse — `src/components/finances/AGENTS.md`.

## MUST

- Renderuj dialogi nawet gdy dane są `null`.
- `JoinOrganizationDialog`: `useQuery` + `skip`, nigdy `useLazyQuery`.
- Prefiks testid: `settings-`.
- Nie wieszaj narzędzi „dla każdego fizjo” na `canManageOrganization`.

## Referencje

- Access: `src/components/shared/AccessGuard.tsx`
- Invite: SPEC-011

## data-testid

`settings-join-org-dialog`, `settings-join-org-token-input`
