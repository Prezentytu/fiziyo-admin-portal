# ECOSYSTEM.md — Mapa ekosystemu FiziYo

Kontekst cross-repo dla agentów AI. Czytaj ten plik gdy zadanie wymaga zrozumienia jak panel admin łączy się z aplikacją mobilną lub backendem.

## Repozytoria

| Repo                   | Ścieżka lokalna                   | Stack                                   | Hosting                             |
| ---------------------- | --------------------------------- | --------------------------------------- | ----------------------------------- |
| **fiziyo-admin**       | `d:\Prezentytu\fiziyo-admin`      | Next.js 16, React 19, Apollo Client 4   | Vercel                              |
| **fizjo-app** (mobile) | `d:\Prezentytu\fizjo-app`         | React Native, Expo 54, Apollo Client 4  | EAS Build → App Store / Google Play |
| **backend**            | `d:\Prezentytu\fizjo-app\backend` | .NET 9, HotChocolate GraphQL, EF Core 9 | Azure App Service (Docker)          |

Backend żyje **wewnątrz repo fizjo-app** (folder `backend/`). To jedno repozytorium z dwoma projektami.

## Architektura komunikacji

```
fiziyo-admin (Next.js)  ──┐
                           ├──  GraphQL (HTTP + WebSocket)  ──→  Backend (.NET 9)  ──→  PostgreSQL
fizjo-app (React Native) ──┘                                         │
                                                                     ├── Azure Blob (media)
     Clerk (auth UI) ←→ oba klienty                                  ├── Vimeo (wideo)
                           │                                         ├── Stripe (płatności)
                           └── Token Exchange ──→ Własny JWT ──→     ├── OpenAI/OpenRouter (AI)
                                                                     └── Discord (webhooks)
```

Oba klienty (admin + mobile) łączą się z **tym samym backendem** i **tą samą bazą danych** przez wspólne GraphQL API. Nie ma osobnych endpointów — ten sam HotChocolate serwer obsługuje oba.

## Kontrakt GraphQL — co jest współdzielone

Backend eksponuje jeden schemat GraphQL. Oba frontendy definiują **własne** zapytania (nie generowane), więc nazwy query/mutation mogą się różnić, ale trafiają do tych samych resolverów.

### Operacje współdzielone (admin + mobile)

Zapytania używane w obu frontendach (wspólne resolwery):

- Exercises: `GET_EXERCISES_QUERY`, `GET_EXERCISE_BY_ID_QUERY`, `GET_AVAILABLE_EXERCISES_QUERY`
- Exercise Sets: `GET_EXERCISE_SETS_QUERY`, `GET_EXERCISE_SET_MAPPINGS_QUERY`
- Patients: `GET_THERAPIST_PATIENTS_QUERY`, `GET_PATIENT_ASSIGNMENTS_QUERY`
- Organizations: `GET_ORGANIZATIONS_QUERY`, `GET_CLINICS_QUERY`
- Progress: `GET_EXERCISE_PROGRESS_QUERY`, `GET_WEEKLY_PROGRESS_QUERY`
- Other: `GET_APPOINTMENTS_QUERY`, `GET_HEALTH_POINTS_QUERY`

### Operacje tylko w panelu admin

- Billing/Revenue: `GET_BILLING_QUERY`, `GET_REVENUE_QUERY`
- AI Credits: `GET_AI_CREDITS_QUERY`
- Weryfikacja: `GET_ADMIN_EXERCISES_QUERY`, `SUBMIT_TO_GLOBAL_REVIEW_MUTATION`
- Onboarding: `GET_ONBOARDING_STATS_QUERY`
- Subskrypcje real-time: exercises, exerciseSets, patients, assignments, clinicalNotes, tags, clinics

### Operacje tylko w aplikacji mobilnej

- Video Inbox: `GET_VIDEO_INBOX_QUERY`
- Patient Report: `GET_PATIENT_REPORT_QUERY`
- Exercise Progress: `MARK_EXERCISE_COMPLETED_MUTATION`
- Hooks layer: 28 custom hooks (`useExercises`, `usePatientAssignments` itd.)

### Typy — duplikacja, nie współdzielenie

Typy TypeScript są definiowane **osobno** w każdym frontendzie:

- Admin: `src/graphql/types/exercise.types.ts`, `user.types.ts`, `clinic.types.ts`
- Mobile: `src/graphql/types/user.types.ts`, `clinic.types.ts` + typy inline w hooks

Przy zmianie schematu backendu — zaktualizuj typy w **obu** repozytoriach.

## Gdzie szukać implementacji danej funkcji

| Funkcja                 | Admin (fiziyo-admin)                                | Mobile (fizjo-app)                                  | Backend                                                  |
| ----------------------- | --------------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------- |
| CRUD ćwiczeń            | `src/features/exercises/`                           | `components/exercises/`                             | `Types/ExerciseMutation.cs`                              |
| Zestawy ćwiczeń         | `src/features/exercise-sets/`                       | `components/exercises/`                             | `Types/ExerciseSetQuery.cs`                              |
| Assignment Wizard       | `src/features/assignment/`                          | —                                                   | `Types/PatientAssignmentMutation.cs`                     |
| Pacjenci                | `src/features/patients/`                            | `components/patient/`                               | `Types/PatientMutation.cs`                               |
| Player ćwiczeń          | —                                                   | `app/(tabs)/patient/sets/exercise-player/`          | `Types/PatientProgressMutation.cs`                       |
| Chat AI                 | `src/services/chatService.ts`                       | `src/services/chatService.ts`                       | `Controllers/ChatController.cs`                          |
| Sugestie AI             | `src/services/aiService.ts`                         | —                                                   | `Controllers/AIController.cs`                            |
| Billing (Revenue Share) | `src/components/billing/`                           | —                                                   | `Types/BillingMutation.cs`, `Services/BillingService.cs` |
| Wizyty                  | `src/app/(dashboard)/appointments/`                 | `app/(tabs)/*/appointments/`                        | `Types/AppointmentQuery.cs`                              |
| Organizacja             | `src/components/settings/`                          | `components/organization/`                          | `Types/OrganizationsMutation.cs`                         |
| Auth (Token Exchange)   | `src/graphql/providers/BackendAuthTokenProvider.ts` | `src/graphql/providers/BackendAuthTokenProvider.ts` | `Services/TokenExchangeService.cs`                       |
| Media upload            | `src/services/` (via GraphQL)                       | `components/exercises/ImageUpload.tsx`              | `Controllers/ExerciseMediaController.cs`                 |
| Video                   | —                                                   | `app/(tabs)/therapist/recorder/`                    | `Services/VimeoVideoService.cs`                          |

## Dokumentacja w każdym repo

### fiziyo-admin

| Plik                                 | Opis                                                      |
| ------------------------------------ | --------------------------------------------------------- |
| `AGENTS.md`                          | Główne wytyczne + Task Router (7 modułowych AGENTS.md)    |
| `.ai/specs/*.md`                     | Specyfikacje modułów (SPEC-001…005)                       |
| `.ai/skills/`                        | Umiejętności: spec-writing, code-review, create-agents-md |
| `.ai/lessons.md`                     | Dziennik wniosków z pracy AI                              |
| `.ai/ECOSYSTEM.md`                   | Ten plik — mapa cross-repo                                |
| `.ai/DOMAIN_MODEL.md`                | Model domenowy — encje, enumy, relacje                    |
| `.ai/DATA_FLOWS.md`                  | Kluczowe flow biznesowe                                   |
| `docs/assignment-wizard-overview.md` | Assignment Wizard szczegóły                               |
| `docs/billing-widget-readme.md`      | Billing Widget szczegóły                                  |
| `docs/testing/`                      | Testing guidelines + data-testid map                      |

### fizjo-app

| Plik                                  | Opis                                                  |
| ------------------------------------- | ----------------------------------------------------- |
| `AGENTS.md`                           | Konwencje mobile + backend                            |
| `docs/registration-flows.md`          | Flow rejestracji (Owner, Patient, Shadow, Invitation) |
| `docs/TOKEN_EXCHANGE_SUMMARY.md`      | Token exchange — szczegóły                            |
| `docs/IMAGE_STORAGE.md`               | Media storage (Azure Blob)                            |
| `docs/ios-deployment.md`              | Deployment iOS                                        |
| `docs/COMPONENT_QUALITY_CHECKLIST.md` | Checklist jakości komponentów                         |

## Wspólne wzorce (oba frontendy)

1. **Apollo Client 4.x** — `useQuery` z `skip`, NIE `useLazyQuery`
2. **Clerk → Token Exchange → Własny JWT** — identyczny flow, osobne implementacje
3. **Zwykłe funkcje** jako komponenty (NIE `React.FC`)
4. **TypeScript strict** — zakaz `any`, używaj `unknown`
5. **Organizacja jako scope** — większość operacji wymaga `organizationId`

## Pułapki cross-repo

1. **Zmiana schematu GraphQL** — zmiana w backendzie wymaga aktualizacji typów i zapytań w **obu** frontendach.
2. **Subscriptions** — admin używa WebSocket (wsLink), mobile nie ma subskrypcji (polling lub cache).
3. **Nowa encja / nowe pole backendowe** — dodaj migrację EF Core w backendzie, uruchom `dotnet ef database update`, zrestartuj lokalne API, potem dopiero aktualizuj query/mutation i typy w frontendach.
4. **ExerciseLoad** — JSONB w bazie, różne interpretacje w admin (formularz edycji) i mobile (player). Przy zmianie struktury — sprawdź oba.
5. **Env variables** — admin: `NEXT_PUBLIC_API_URL`; mobile: `EXPO_PUBLIC_API_URL` (w `app.config.ts`); backend: connection strings w `appsettings.json`.
6. **Deploy backendu** — wdrożenie na Azure jest manualne i wykonuje je użytkownik. Agent powinien jasno zaznaczyć, gdy zmiana backendowa wymaga ręcznego deploya, zamiast zakładać, że środowisko zdalne samo się zaktualizuje.
