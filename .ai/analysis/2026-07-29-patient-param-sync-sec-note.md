# Security note — patient param sync (2026-07-29)

Scope: backend auth hardening for `UpdateExercise` / `UpdateExerciseInSet` /
`AddExerciseToExerciseSet` / `RemoveExerciseFromSet` + new per-patient subscription.

## Changes

1. **`EnsureCanEditOrganizationSet`** — requires authenticated user and active
   `OrganizationMembers` row for the set's `organizationId`. Replaces open TODOs
   that allowed any authenticated caller to mutate mappings.
2. **`onMyAssignmentChanged`** — topic `OnMyAssignmentChanged_{userId}`; subscribe
   resolves `userId` via `UserService.GetUserId()` from JWT (no client-supplied
   userId argument). Patients cannot subscribe to another user's topic.

## Residual risk

- Global exercises (`OrganizationId == null`) on `UpdateExercise` skip the org
  membership check (intentional for content-manager paths; still require login).
- Multi-instance Azure must use Redis subscriptions for cross-pod delivery
  (existing HotChocolate setup — confirm in deploy).

## Verdict

No PII leak introduced. Tenant isolation improved on mapping mutations. Safe to
merge with standard review; full `sec-report` skill recommended before production
if further permission roles (owner vs therapist) need differentiation.
