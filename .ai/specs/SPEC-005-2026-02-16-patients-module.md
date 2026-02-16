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

- Shadow patients: `CREATE_SHADOW_PATIENT_MUTATION`, `ACTIVATE_SHADOW_PATIENT_MUTATION`, `UPDATE_SHADOW_PATIENT_MUTATION`
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

## Changelog

### 2026-02-16

- Utworzenie specyfikacji na podstawie istniejącej implementacji
