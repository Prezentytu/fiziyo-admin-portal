# Sec-report — SPEC-026 / Faza 0 i 2 (auth + tenant)

Data: 2026-09-06  
Zakres: AuthLink fail-closed, ErrorLink 401 refresh, webhook env, CurrentUserProvider, WS dispose, tenant query

## Werdykt

GO z mitygacją: zmiany auth są fail-closed i nie poszerzają powierzchni ataku. Wymagane potwierdzenie env `DISCORD_FEEDBACK_WEBHOOK_URL` w Vercel.

## Hotspoty

| Severity | Temat                                   | Status                                                                              |
| -------- | --------------------------------------- | ----------------------------------------------------------------------------------- |
| High     | AuthLink kontynuował request bez Bearer | Naprawione — operacja pada bez tokenu (`skipAuth` tylko dla wyjątków)               |
| High     | ErrorLink ignorował 401                 | Naprawione — `refreshToken()` + jednorazowy retry przez AuthLink                    |
| High     | `getToken()` połykał 401 jako `null`    | Naprawione — błędy z `status` są rethrow, cache czyszczony                          |
| High     | `GET_ALL_PATIENT_ASSIGNMENTS` bez scope | Usunięte; dashboard używa `GET_THERAPIST_EXERCISE_ASSIGNMENTS_QUERY($assignedById)` |
| Medium   | Webhook Discord w `NEXT_PUBLIC_*`       | Fallback zostaje; preferowane `DISCORD_FEEDBACK_WEBHOOK_URL`                        |
| Medium   | WS po sign-out / switch org             | `disposeGraphqlWs()` w `useAppSignOut` i `switchOrganization`                       |
| Low      | Duplikaty `GET_USER_BY_CLERK_ID`        | Jedno query w `CurrentUserProvider`                                                 |

## Tenant isolation

- Listy kliniczne scope'owane `organizationId` z `OrganizationProvider`.
- Assignments terapeuty po `assignedById` z `CurrentUserProvider` (JWT backendu nadal jest źródłem prawdy).
- Cache `keyArgs` dla list org zapobiega mieszaniu tenantów w InMemoryCache.

## PII / logi

- Tokenów nie logujemy.
- ErrorLink toastuje błędy sieci bez body GraphQL.
- Logger w produkcji jest noop.

## Mitigacje pozostałe

1. Dodać `DISCORD_FEEDBACK_WEBHOOK_URL` w Vercel i usunąć `NEXT_PUBLIC_DISCORD_WEBHOOK_URL`.
2. E2E: login → switch org → sign-out → login innego usera (brak privilege bleed).
3. Codegen nie jest w `validate` — schema może być niedostępna offline.
