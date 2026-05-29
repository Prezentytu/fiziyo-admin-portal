# Assignment Display Status

## Cel biznesowy

Zapewnić fizjoterapeucie prawdziwy status przypisania na karcie planu pacjenta: plan wygasły ma być jednoznacznie oznaczony jako „Wygasł”, a nie „Przypisany”.

## Architektura

### Warstwa UI (admin)

- Nowy resolver statusu wyświetlania:
  - `src/features/patients/utils/assignmentDisplayStatus.ts`
- Resolver łączy trzy sygnały:
  - `status` przypisania,
  - `endDate` przypisania,
  - `premiumValidUntil` pacjenta (jako pomocniczy sygnał „Brak Premium”).

Priorytet statusu głównego:

1. `expired` lub `endDate < now` -> `Wygasł`
2. `paused` -> `Wstrzymany`
3. `completed` -> `Zakończony`
4. `cancelled` -> `Anulowany`
5. `endDate` w ciągu 3 dni -> `Wygasa za X dni`
6. `assigned/active/in_progress` -> `Aktywny`

### Integracje UI

- `src/features/patients/PatientAssignmentCard.tsx`
  - używa resolvera jako jedynego źródła prawdy dla badge statusu.
  - pokazuje pomocniczy badge `Brak Premium` tylko gdy plan nie jest wygasły.
- `src/app/(dashboard)/patients/[id]/page.tsx`
  - pobiera `premiumValidUntil` z `GET_ORGANIZATION_PATIENTS_QUERY`.
  - renderuje `PremiumStatusBadge` w nagłówku pacjenta.
  - przekazuje `premiumValidUntil` do `PatientAssignmentCard`.
  - licznik „Aktywnych zestawów” opiera na resolverze zamiast surowego `status === 'active'`.
- `src/app/(dashboard)/exercise-sets/[id]/page.tsx`
  - lista pacjentów przy zestawie używa tego samego resolvera (bez premium).

### Warstwa backend (fizjo-app)

- `backend/FizjoApp.Api/Models/Enums/AssignmentStatus.cs`
  - dodanie `Expired` do enuma i mapowania `ToDbValue/TryParseDbValue`.
- `backend/FizjoApp.Api/Services/SetExpirationBackgroundService.cs`
  - reconciliation dla zaległych rekordów: wszystkie `EndDate <= now` z `status in ('assigned','active')` są domykane do `expired`.
  - deduplikacja notyfikacji `SetExpired` pozostaje zachowana.

## Testy

### Admin

- `src/features/patients/utils/__tests__/assignmentDisplayStatus.test.ts`
  - wygasły po dacie,
  - status `expired`,
  - `paused`,
  - „wygasa za 2 dni”,
  - aktywny + premium,
  - aktywny + brak premium.

### Backend

- `backend/FizjoApp.Api.Tests/Models/AssignmentStatusTests.cs`
  - mapowanie `Expired <-> "expired"`.
- `backend/FizjoApp.Api.Tests/Services/SetExpirationBackgroundServiceTests.cs`
  - stale wygasłe przypisanie przechodzi do `expired`,
  - notyfikacja `SetExpired` jest tworzona dla brakującego przypadku historycznego.

## Data-testid

- `patient-assignment-status-badge-{id}`
- `patient-assignment-premium-hint-{id}`

## Changelog

### 2026-05-26

- Dodano resolver „effective display status” dla przypisań pacjenta.
- Dodano sygnał „Brak Premium” jako pomocniczy badge.
- Ujednolicono etykiety statusu na profilu pacjenta i na stronie detalu zestawu.
- Dodano backendowy reconcile statusu `expired`.
