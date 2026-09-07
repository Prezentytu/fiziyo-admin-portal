# SPEC-005: Patients Module

## Cel biznesowy

Moduł pacjentów umożliwia zarządzanie bazą pacjentów fizjoterapeuty - dodawanie, edycja profili, przypisywanie zestawów ćwiczeń, monitorowanie postępów i komunikacja. Wspiera shadow patients (bez konta) i pełnoprawnych użytkowników.

## Architektura

### Komponenty UI (31)

| Komponent                      | Odpowiedzialność                                             |
| ------------------------------ | ------------------------------------------------------------ |
| `PatientCard`                  | Karta pacjenta w liście                                      |
| `PatientForm`                  | Formularz danych pacjenta                                    |
| `PatientDialog`                | Dialog szczegółów                                            |
| `EditPatientDialog`            | Edycja danych pacjenta                                       |
| `SmartPatientLookup`           | Wyszukiwanie pacjenta po email/telefonie z auto-wypełnianiem |
| `UnifiedPatientInput`          | Zunifikowany input dodawania pacjenta                        |
| `PatientAssignmentCard`        | Karta przypisania zestawu                                    |
| `EditAssignmentScheduleDialog` | Edycja harmonogramu przypisania                              |
| `EditExerciseOverrideDialog`   | Nadpisywanie parametrów ćwiczenia dla pacjenta               |
| `ActivityReport`               | Raport aktywności pacjenta                                   |
| `ActivityChart`                | Wykres aktywności                                            |
| `ExerciseStats`                | Statystyki ćwiczeń pacjenta                                  |
| `PatientNotes`                 | Notatki o pacjencie                                          |
| `PatientQRCodeDialog`          | Kod QR dla pacjenta (link do aplikacji)                      |
| `TherapistBadge`               | Badge terapeuty przypisanego                                 |
| `TakeOverDialog`               | Przejęcie pacjenta od innego terapeuty                       |
| `ExtendSetDialog`              | Przedłużenie zestawu ćwiczeń                                 |
| `PatientQuickStats`            | Szybkie statystyki pacjenta                                  |
| `PatientExpandableCard`        | Rozwijana karta pacjenta                                     |
| `ExercisePreviewDrawer`        | Drawer podglądu ćwiczenia                                    |
| `AddExerciseToPatientDialog`   | Dodanie ćwiczenia bezpośrednio do pacjenta                   |
| `PremiumStatusBadge`           | Badge statusu premium                                        |
| `ActivatePremiumDialog`        | Aktywacja premium dla pacjenta                               |
| `TherapyStatusCard`            | Karta statusu terapii                                        |
| `NextStepCard`                 | Następne kroki w terapii                                     |
| `FeelingsHeatmap`              | Heatmapa samopoczucia pacjenta                               |
| `EventJournal`                 | Dziennik zdarzeń                                             |
| `EditContextLabelDialog`       | Edycja etykiety kontekstu                                    |
| `SetFilters`                   | Filtrowanie przypisań                                        |
| `PatientThumbnail`             | Miniaturka pacjenta                                          |
| `PatientFilter`                | Filtrowanie listy pacjentów                                  |

### Interfejsy API (GraphQL)

**Queries:**

- `GET_PATIENT_DASHBOARD_QUERY` - dashboard pacjenta
- `GET_PATIENT_ASSIGNMENTS_QUERY` - przypisania pacjenta
- `GET_PATIENT_ASSIGNMENTS_BY_USER_QUERY` - przypisania po user ID
- `GET_ACTIVE_PATIENT_ASSIGNMENTS_QUERY` - aktywne przypisania
- `GET_PATIENT_ASSIGNMENT_BY_ID_QUERY` - szczegóły przypisania
- `GET_ASSIGNMENTS_WITH_USERS_QUERY` - przypisania z danymi pacjentów
- `FIND_USER_BY_EMAIL_QUERY`, `FIND_USER_BY_PHONE_QUERY` - wyszukiwanie pacjenta
- `GET_USERS_QUERY`, `GET_USER_BY_ID_QUERY` - dane użytkowników
- `GET_ORGANIZATION_THERAPISTS_QUERY` - terapeuci organizacji

**Mutations:**

- Existing patient link: `LINK_EXISTING_PATIENT_TO_CARE_TEAM_MUTATION` (atomowe membership + PRIMARY TPA; SPEC-027)
- Legacy (zachowane): `ADD_DIRECT_MEMBER_MUTATION`, `ASSIGN_PATIENT_TO_THERAPIST_MUTATION`
- Shadow patients: `CREATE_SHADOW_PATIENT_MUTATION` (opcjonalny `therapistId`), `ACTIVATE_SHADOW_PATIENT_MUTATION`, `UPDATE_SHADOW_PATIENT_MUTATION`
- Premium: `ACTIVATE_PATIENT_PREMIUM_MUTATION`
- Profile: `UPDATE_USER_MUTATION`, `UPDATE_USER_PROFILE_MUTATION`
- Progress: `MARK_EXERCISE_COMPLETED_MUTATION`, `START_EXERCISE_SESSION_MUTATION`, `UPDATE_EXERCISE_PROGRESS_MUTATION`
- Feedback: `SAVE_EXERCISE_FEEDBACK_MUTATION`

### Kluczowe typy danych

- `Patient` - id, fullname, email, image, isShadowUser, personalData, contactData, assignmentStatus, contextLabel, contextColor
- `PatientFormValues` - firstName, lastName, phone?, email?, contextLabel?
- `PatientAssignment` - id, userId, exerciseSetId, exerciseId, assignedById, status, startDate, endDate, frequency, exerciseOverrides, completionCount
- `ExerciseProgress` - postępy wykonywania ćwiczeń
- `PatientStats` - statystyki pacjenta (adherence, completion rate)
- `TreatmentContext` - kontekst terapii

### Data-testid

Prefiks: `patient-`

- `patient-card-{id}`
- `patient-form-submit-btn`
- `patient-form-firstname-input`
- `patient-assignment-card-{id}`
- `patient-qr-code-btn`
- `patient-therapy-status-card`
- `patient-therapy-status-badge`
- `patient-next-step-call-btn`
- `patient-next-step-edit-plan-btn`
- `patient-next-step-message-btn`

## Reguły monitoringu adherence

Status terapii jest liczony lokalnie na froncie przez `calculateTherapyStatus` (`src/lib/therapyStatus.ts`) z dedykowaną oceną progów i tonu komunikacji w `src/features/patients/utils/therapyAdherence.ts`.

### Progi i ton komunikacji

| Warunek                                     | Efekt UI          | Zachowanie                                                 |
| ------------------------------------------- | ----------------- | ---------------------------------------------------------- |
| 0-2 dni od ostatniej aktywności             | `W NORMIE`        | Stan pozytywny, brak potrzeby interwencji                  |
| 3-4 dni bez aktywności (plan trwa >= 3 dni) | `MONITORUJ`       | Łagodna informacja, bez alarmowania                        |
| 5-6 dni bez aktywności                      | `UWAGA`           | Mocniejsze przypomnienie i sugestia kontaktu               |
| >= 7 dni bez aktywności                     | `UWAGA`           | Rekomendacja kontaktu telefonicznego i przeglądu planu     |
| `painLevel > 5`                             | `SKONTROLUJ PLAN` | Priorytet dla dyskomfortu; sugestia szybkiej korekty planu |

### Zasada komunikacji

- UI ma model **informuj, nie alarmuj**: nie używamy etykiety `ALARM` dla nieaktywności.
- Rekomendacje są progresywne i oparte o `reason + tone`, a nie o panic-level status.
- Akcje „Napisz” i „Brawo” wyświetlają informację o dostępności funkcji „wkrótce”.

## Changelog

### 2026-09-05

- `UnifiedPatientInput` przepięty na `linkExistingPatientToCareTeam` (fizjo-app SPEC-027). `addDirectMember` + `assignPatientToTherapist` zostają w kontrakcie.
- `SmartPatientLookup` pozostaje deprecated — bez drugiego write-path.
- Rollout: backend → admin → mobile. Rollback: powrót do dwóch starych mutacji.

### 2026-05-28

- Wprowadzono łagodny monitoring aktywności oparty o progi adherence (`therapyAdherence.ts`) i usunięto alarmistyczny język z UI statusu terapii.
- Podpięto akcje z `ActivityReport` do profilu pacjenta: `Zadzwoń` (dialer), `Edytuj plan` (otwarcie edycji aktywnego planu), oraz placeholder komunikacji „wkrótce”.
- Dodano `data-testid` dla nowej karty statusu i przycisków rekomendacji.

### 2026-04-15

- Na profilu pacjenta rozwinięta karta przypisania została przełączona na model modal-first: główne CTA `Edytuj plan` otwiera spójny punkt wejścia do edycji planu pacjenta.
- Punkt wejścia `Edytuj plan` został przepięty bezpośrednio na `AssignmentWizard` w trybie `editMode` (ten sam UX krokowy jak przy przypisywaniu, ale z prefill i aktualizacją istniejącego planu/przypisania).
- Uproszczono expanded state `PatientAssignmentCard` (mniej równorzędnych akcji i czytelniejsza hierarchia), pozostawiając szybkie akcje inline dla ćwiczeń.

### 2026-02-16

- Utworzenie specyfikacji na podstawie istniejącej implementacji
