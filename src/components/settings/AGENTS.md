# AGENTS.md — Ustawienia / Organizacja

## Zakres

Ustawienia użytkownika, zarządzanie organizacją, listy organizacji, role.

## Komponenty

- `OrganizationsList.tsx` — lista organizacji użytkownika
- Strona: `app/(dashboard)/settings/`
- Organizacja: `app/(dashboard)/organization/`

## Wzorce

- Organizacja ma `organizationId` — filtrowanie po organizacji
- Role: Owner, Admin, Member — sprawdzaj przez `useRoleAccess` lub `AccessGuard`
- Billing Widget: tylko Owner/Admin (SPEC-002)

## Referencje

- Billing: `docs/billing-widget-readme.md`
- Access: `src/components/shared/AccessGuard.tsx`
- Hooks: `useRoleAccess.ts`, `useSystemRole.ts`

## Konwencje data-testid

Prefiks: `settings-`, `org-`
Przykłady: `settings-org-list`, `org-form-name-input`
