# DOMAIN_MODEL.md — Model domenowy FiziYo

Szybka referencja encji, enumów, relacji i struktur JSONB. Używaj tego pliku zamiast czytać kod backendu.

## Enumy

### ExerciseType

| Wartość    | Opis                              |
| ---------- | --------------------------------- |
| `Reps` (0) | Licznik powtórzeń (np. Przysiady) |
| `Time` (1) | Stoper czasowy (np. Plank)        |

### ExerciseSide

| Wartość           | Opis                                |
| ----------------- | ----------------------------------- |
| `None` (0)        | Obustronne — brak podziału          |
| `Left` (1)        | Tylko lewa                          |
| `Right` (2)       | Tylko prawa                         |
| `Both` (3)        | Lewa + prawa po kolei (objętość x2) |
| `Alternating` (4) | Naprzemiennie (np. Dead Bug)        |

### ExerciseScope

| Wartość        | Opis                                      |
| -------------- | ----------------------------------------- |
| `Global`       | Widoczne globalnie (tylko SiteSuperAdmin) |
| `Organization` | Widoczne w organizacji                    |
| `Personal`     | Widoczne tylko dla twórcy                 |

### ContentStatus (cykl życia ćwiczenia)

| Wartość                | Opis                                      |
| ---------------------- | ----------------------------------------- |
| `Draft` (0)            | Robocze                                   |
| `PendingReview` (1)    | W kolejce do weryfikacji                  |
| `ChangesRequested` (2) | Odrzucone z uwagami                       |
| `Approved` (3)         | Zatwierdzone                              |
| `Published` (4)        | Publiczne globalnie                       |
| `ArchivedGlobal` (5)   | Wycofane (soft delete)                    |
| `UpdatePending` (6)    | Shadow Draft — poprawka do opublikowanego |

```
Draft → PendingReview → Approved → Published
                ↓                       ↓
        ChangesRequested          ArchivedGlobal
                ↓                       ↓
              Draft              UpdatePending → Published (merge)
```

### DifficultyLevel

| Wartość       | Opis                  |
| ------------- | --------------------- |
| `Unknown` (0) | Nieokreślony (legacy) |
| `Easy` (1)    | Łatwy                 |
| `Medium` (2)  | Średni                |
| `Hard` (3)    | Trudny                |
| `Expert` (4)  | Ekspert               |

### OrganizationRole

| Wartość     | Opis                             |
| ----------- | -------------------------------- |
| `Owner`     | Pełne uprawnienia                |
| `Admin`     | Prawie wszystkie uprawnienia     |
| `Therapist` | Ćwiczenia, pacjenci, przypisania |
| `Staff`     | Ograniczone uprawnienia          |

### SystemRole

| Wartość          | Opis                   |
| ---------------- | ---------------------- |
| `SiteSuperAdmin` | Pełna kontrola systemu |
| `SiteAdmin`      | Globalne ćwiczenia     |
| `ContentManager` | Weryfikacja (Domo Reh) |

### SubscriptionPlan

> **STATUS: NIEAKTYWNE.** Struktura planów istnieje w backendzie, ale na start
> fizjoterapeuci NIE płacą subskrypcji. Jedyny model to Revenue Share (poniżej).
> Plany mogą być uruchomione w przyszłości jako dodatkowe źródło przychodu.

| Plan           | Cena    | Pacjenci | Fizjo | Gabinety | Kredyty AI/mies. |
| -------------- | ------- | -------- | ----- | -------- | ---------------- |
| `Starter` (0)  | 0 PLN   | 5        | 1     | 1        | 50               |
| `Solo` (1)     | 99 PLN  | 50       | 1     | 1        | 200              |
| `Pro` (2)      | 219 PLN | 200      | 5     | 3        | 500              |
| `Business` (3) | 399 PLN | 500      | 20    | 10       | 2000             |

### CommissionTier (Revenue Share) — AKTYWNY MODEL

Jedyny model monetyzacji na start: fizjo zarabia → my bierzemy prowizję.

Pacjent płaci za dostęp do aplikacji (kwota ustalana, orientacyjnie ~39 PLN/mies., ale zależy
od modelu — może być plan kilkumiesięczny z inną kwotą). Platforma pobiera prowizję
(orientacyjnie ~60%, procenty w trakcie ustalania).

**Kluczowa zasada: fizjo płaci tylko wtedy gdy zarabia.** Brak stałych opłat na start.

| Tier           | Pacjenci     | Prowizja |
| -------------- | ------------ | -------- |
| `Start` (0)    | 0–49         | 40%      |
| `Pro` (1)      | 50–99        | 45%      |
| `Expert` (2)   | 100–299      | 50%      |
| `Elite` (3)    | 300+         | 60%      |
| `Partner` (99) | Stała z kodu | np. 80%  |

> Procenty i progi są orientacyjne — mogą się zmienić przed oficjalnym launczem.

### MediaContext

| Wartość               | Opis                               |
| --------------------- | ---------------------------------- |
| `MainDemo` (0)        | Główna demonstracja (góra playera) |
| `Thumbnail` (1)       | Miniaturka na liście               |
| `CommonMistake` (2)   | „Unikaj błędów"                    |
| `StepByStep` (3)      | Galeria kroków                     |
| `AnatomyView` (4)     | Rycina anatomiczna                 |
| `PatientMaterial` (5) | Materiał z wizyty                  |

### ClinicalNoteStatus

> **STATUS: DO PRZEBUDOWY.** Obecny model ClinicalNote jest zbyt złożony (sekcje kliniczne:
> wywiad, badanie, diagnoza, plan leczenia). Docelowo zastępowany **prostymi notatkami**
> per pacjent — user-friendly, bez struktury klinicznej. Encja i enumy mogą się uprościć.

| Wartość     | Opis              |
| ----------- | ----------------- |
| `Draft`     | Edytowalna        |
| `Completed` | Gotowa do podpisu |
| `Signed`    | Zablokowana       |

### VisitType

> **STATUS: DO PRZEBUDOWY** razem z ClinicalNote.

`Initial` | `Followup` | `Discharge` | `Consultation`

### PatientNotificationType

`NewSetReceived` | `ExercisesPreparing` | `SetComplete` | `SetExpiringSoon` | `SetExpired` | `PremiumActivated` | `PremiumExpiringSoon` | `PremiumExpired`

### PatientSubscriptionStatus

`Active` | `PastDue` | `Canceled` | `Paused` | `Trialing` | `Incomplete` | `Expired`

### BillingCycleStatus

```
Open → Closed → Invoiced → Paid
```

---

## Encje — kluczowe pola

### Exercise

**Identyfikacja:**

- `Id`, `OrganizationId` (null = globalne), `CreatedById`, `ContributorId`

**Treść:**

- `Name` (200), `PatientDescription` (4000), `ClinicalDescription` (4000), `AudioCue` (200)

**Parametry wykonania:**

- `Type` (ExerciseType), `Side` (ExerciseSide)
- `PreparationTime` (sekundy, default: 5)
- `DefaultExecutionTime` (sekundy na jedno powtórzenie)
- `DefaultSets` (default: 3), `DefaultReps`, `DefaultDuration`
- `DefaultRestBetweenSets` (default: 60s), `DefaultRestBetweenReps` (default: 0)
- `Tempo` (np. "3-0-1-0"), `DefaultLoad` (JSONB ExerciseLoad), `RangeOfMotion`

**Weryfikacja:**

- `Scope`, `Status` (ContentStatus), `IsSystem`, `IsPublicTemplate`
- `AdminReviewNotes`, `ReviewNotes`, `ReviewedBy`, `ReviewedAt`
- `PublishedBy`, `PublishedAt`, `ArchivedBy`, `ArchivedAt`

**Shadow Draft:**

- `ParentPublishedExerciseId` — ID oryginału; `UpdateRequestType`, `UpdateRequestedById`

**Media:**

- `Media` (kolekcja ExerciseMedia — nowy system)
- `ThumbnailUrl`, `GifUrl`, `ImageUrl`, `Images[]`, `VideoUrl` (legacy)

**Tagi:**

- `TagMappings` (kolekcja ExerciseTagMapping — nowy)
- `MainTags[]`, `AdditionalTags[]` (legacy)

**Progression:** `ProgressionFamilyId`, `DifficultyLevel`

**Metadata:** `IsActive` (soft delete), `CreatedAt`, `UpdatedAt`

### ExerciseSet

- `Id`, `Name` (100), `Description` (300), `OrganizationId`, `CreatedById`
- `IsActive`, `IsTemplate`, `Frequency` (JSONB)
- Navigation: `ExerciseMappings`, `PatientAssignments`

### ExerciseSetMapping

Pozycja ćwiczenia w zestawie z opcjonalnymi nadpisaniami parametrów:

- `ExerciseSetId`, `ExerciseId`, `Order`
- Nadpisania: `Sets`, `Reps`, `Duration`, `ExecutionTime`, `RestSets`, `RestReps`, `Tempo`, `Load` (JSONB)
- Custom: `Notes`, `CustomName` (200), `CustomDescription` (4000)

### PatientAssignment

Przypisanie zestawu/ćwiczenia do pacjenta:

- `UserId` (pacjent), `ExerciseSetId` (opcjonalne), `ExerciseId` (opcjonalne), `AssignedById`
- Nadpisania parametrów: `AssignedSets`, `AssignedReps`, `AssignedDuration`, `AssignedExecutionTime`, `AssignedRestBetweenSets`, `AssignedRestBetweenReps`, `AssignedTempo`, `AssignedLoad` (JSONB)
- `HasCustomization` — flaga, czy ładować tabelę customizacji
- `Frequency` (JSONB), `StartDate`, `EndDate`
- `Status` ("active"/"completed"/"paused"), `CompletionCount`, `LastCompletedAt`
- Feedback: `PatientRPE` (1–10), `PatientPainLevel` (0–10)

### ExerciseProgress

Zapis pojedynczego wykonania:

- `UserId`, `AssignmentId`, `ExerciseId`, `ExerciseSetId`
- `CompletedAt`, `Status` ("in_progress"/"completed"/"paused")
- `CompletedReps`, `CompletedSets`, `CompletedTime`, `RealDuration`
- Feedback: `DifficultyLevel`, `PainLevel`, `Rating`, `Notes`, `PatientNotes`

### User

- `Id`, `ClerkId` (50), `Username` (50), `Fullname` (100), `Email` (200), `Image`
- `SystemRole`, `DefaultOrganizationId`
- Shadow user: `IsShadowUser`, `HasPassword`, `ActivationToken`, `ActivationTokenExpiry`
- `PersonalData` (JSON: FirstName, LastName), `ContactData` (JSON: Phone, Address)
- `IsActive`, `CreationTime`

### Organization

- `Id`, `Name` (100), `Description` (300), `LogoUrl`
- Kontakt: `Address`, `ContactPhone`, `ContactEmail`, `Website`
- Plan: `SubscriptionPlan`, `SubscriptionExpiresAt`
- Konfiguracja: `AllowPersonalExercises`, `SharedExercisesByDefault`, `AutoSyncExampleExercises`
- Limity: `MaxTherapists`, `MaxPatients`, `MaxClinics` (null = unlimited)
- Stripe Connect: `StripeConnectedAccountId`, `StripeOnboardingComplete`, `FixedCommissionRate`, `PartnerExpiresAt`, `ActiveSubscribersCount`

### ClinicalNote

> **STATUS: DO PRZEBUDOWY.** Obecna struktura jest zbyt kliniczna (sekcje: wywiad, badanie,
> diagnoza, plan leczenia). Docelowo: proste, user-friendly notatki per pacjent bez ciężkiej
> struktury. Poniższe pola opisują OBECNY stan w backendzie, nie docelowy.

- `Id`, `PatientId`, `TherapistId`, `OrganizationId`
- `VisitDate`, `VisitType`, `Status` (ClinicalNoteStatus), `Title`
- `Sections` (JSONB — ClinicalNoteSections), `LinkedExerciseSetId`
- `SignedAt`, `SignedById`

---

## Struktury JSONB

### ExerciseLoad

> **UPROSZCZENIE W TOKU:** Obecna struktura pozwala wpisać dowolny typ obciążenia, co
> prowadzi do bałaganu. Docelowo ograniczamy do **kg** — najprostszy model.

```json
{
  "type": "weight", // weight | band | bodyweight | other — docelowo: tylko "weight"
  "value": 5.0, // wartość liczbowa (dla wykresów)
  "unit": "kg", // kg | lbs | level — docelowo: tylko "kg"
  "text": "5 kg" // wyświetlany tekst
}
```

Używane w: `Exercise.DefaultLoad`, `PatientAssignment.AssignedLoad`, `ExerciseSetMapping.Load`

### Frequency

```json
{
  "timesPerDay": "2",
  "timesPerWeek": "3",
  "minTimesPerWeek": "2",
  "isFlexible": true,
  "monday": false,
  "tuesday": true,
  "wednesday": false,
  "thursday": true,
  "friday": false,
  "saturday": true,
  "sunday": false,
  "breakBetweenSets": "30s"
}
```

Używane w: `ExerciseSet.Frequency`, `PatientAssignment.Frequency`

### ClinicalNoteSections

> **STATUS: DO PRZEBUDOWY.** Ta struktura jest zbyt rozbudowana. Docelowo zostanie
> zastąpiona prostymi notatkami tekstowymi. Poniżej obecny stan w backendzie.

```json
{
  "interview": {
    "mainComplaint": "...",
    "painLocation": ["kolano", "udo"],
    "painIntensity": 7,
    "aggravatingFactors": ["schody", "bieganie"],
    "relievingFactors": ["odpoczynek"],
    "previousTreatment": "...",
    "comorbidities": "...",
    "medications": "..."
  },
  "examination": {
    "posture": "...",
    "rangeOfMotion": [{ "movement": "flexion", "value": 120, "side": "right" }],
    "specialTests": [{ "name": "Lachman", "result": "positive", "notes": "..." }],
    "muscleStrength": "...",
    "palpation": "..."
  },
  "diagnosis": {
    "icd10Codes": [{ "code": "M54.5", "description": "Ból krzyża", "isPrimary": true }],
    "icfCodes": [{ "code": "b7101", "description": "...", "category": "bodyFunction" }],
    "clinicalReasoning": "..."
  },
  "treatmentPlan": {
    "shortTermGoals": "...",
    "longTermGoals": "...",
    "interventions": ["terapia manualna", "ćwiczenia"],
    "visitFrequency": "2x/tydzień",
    "homeRecommendations": "..."
  },
  "visitProgress": {
    "techniques": "...",
    "patientResponse": "...",
    "currentPainLevel": 4,
    "progressComparison": "...",
    "nextSteps": "..."
  }
}
```

---

## Hierarchia nadpisywania parametrów

Parametry ćwiczenia mogą być nadpisane na 3 poziomach. Priorytet (najwyższy → najniższy):

```
PatientAssignment (AssignedSets, AssignedReps...)
       ↓ fallback
ExerciseSetMapping (Sets, Reps...)
       ↓ fallback
Exercise (DefaultSets, DefaultReps...)
```

Player mobilny powinien: sprawdzić Assignment → jeśli null → Mapping → jeśli null → Exercise defaults.

---

## Relacje między encjami

```
Organization
 ├── OrganizationMember ←→ User (role: Owner/Admin/Therapist/Staff)
 ├── Clinic ←→ TherapistClinic ←→ User [STATUS: NIE W PEŁNI ZAIMPLEMENTOWANE]
 ├── Exercise
 │    ├── ExerciseMedia (MainDemo, Thumbnail, StepByStep...)
 │    ├── ExerciseTagMapping ←→ ExerciseTag ←→ TagCategory
 │    ├── ExerciseRelation (Progression/Regression)
 │    └── ExerciseHistory (audit log)
 ├── ExerciseSet
 │    ├── ExerciseSetMapping ←→ Exercise (z nadpisaniami)
 │    └── PatientAssignment ←→ User (pacjent)
 │         ├── AssignmentCustomization (opisy, media)
 │         └── ExerciseProgress (pojedyncze wykonania)
 ├── ClinicalNote ←→ User (pacjent + terapeuta)
 ├── StripeSubscription
 ├── OrganizationAICredits + AICreditsLog
 ├── BillingCycle + OrganizationBillingSettings
 └── OrganizationInvitation
```
