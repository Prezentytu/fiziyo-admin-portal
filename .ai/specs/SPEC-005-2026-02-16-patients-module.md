---
spec: SPEC-005
repo: fiziyo-admin-portal
issues: []
prs: []
board:
---

# SPEC-005: Patients Module

## Cel biznesowy

Moduł pacjentów umożliwia zarządzanie bazą pacjentów fizjoterapeuty - dodawanie, edycja profili, przypisywanie zestawów ćwiczeń, monitorowanie postępów i komunikacja. Wspiera shadow patients (bez konta) i pełnoprawnych użytkowników.

## Architektura

### Komponenty UI (31)

| Komponent                    | Odpowiedzialność                               |
| ---------------------------- | ---------------------------------------------- |
| `PatientForm`                | Formularz danych pacjenta                      |
| `PatientDialog`              | Dialog szczegółów                              |
| `EditPatientDialog`          | Edycja danych pacjenta                         |
| `UnifiedPatientInput`        | Zunifikowany input dodawania pacjenta          |
| `PatientAssignmentCard`      | Karta przypisania zestawu                      |
| `EditExerciseOverrideDialog` | Nadpisywanie parametrów ćwiczenia dla pacjenta |
| `ActivityReport`             | Raport aktywności pacjenta                     |
| `PatientQRCodeDialog`        | Kod QR dla pacjenta (link do aplikacji)        |
| `TherapistBadge`             | Badge terapeuty przypisanego                   |
| `TakeOverDialog`             | Przejęcie pacjenta od innego terapeuty         |
| `ExtendSetDialog`            | Przedłużenie zestawu ćwiczeń                   |
| `PatientQuickStats`          | Szybkie statystyki pacjenta                    |
| `PatientExpandableCard`      | Rozwijana karta pacjenta                       |
| `ExercisePreviewDrawer`      | Drawer podglądu ćwiczenia                      |
| `AddExerciseToPatientDialog` | Dodanie ćwiczenia bezpośrednio do pacjenta     |
| `PremiumStatusBadge`         | Badge statusu premium                          |
| `ActivatePremiumDialog`      | Aktywacja premium dla pacjenta                 |
| `TherapyStatusCard`          | Karta statusu terapii                          |
| `NextStepCard`               | Następne kroki w terapii                       |
| `FeelingsHeatmap`            | Heatmapa samopoczucia pacjenta                 |
| `EventJournal`               | Dziennik zdarzeń                               |
| `EditContextLabelDialog`     | Edycja etykiety kontekstu                      |
| `PatientThumbnail`           | Miniaturka pacjenta                            |

### Interfejsy API (GraphQL)

**Queries:**

- `GET_PATIENT_ASSIGNMENTS_BY_USER_QUERY` - przypisania po user ID
- `FIND_USER_BY_EMAIL_QUERY`, `FIND_USER_BY_PHONE_QUERY` - wyszukiwanie pacjenta
- `GET_USER_BY_ID_QUERY` - dane użytkowników

**Mutations:**

- Shadow patients: `CREATE_SHADOW_PATIENT_MUTATION`, `UPDATE_SHADOW_PATIENT_MUTATION`
- Profile: `UPDATE_USER_MUTATION`, `UPDATE_USER_PROFILE_MUTATION`

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

### 2026-10-09

- Porządki po przeglądzie kodu: usunięto nieużywane komponenty i operacje GraphQL bez konsumenta w panelu; tabele komponentów i listy API pokazują tylko kod, który istnieje.

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
