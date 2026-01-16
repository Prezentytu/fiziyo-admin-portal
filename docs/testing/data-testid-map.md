# FiziYo Admin - Mapa data-testid dla testów automatycznych

## Konwencja nazewnictwa

**Format:** `[modul]-[komponent]-[element]-[akcja?]`

**Prefiksy modułów:**
- `auth-` - Autentykacja (login, rejestracja, weryfikacja)
- `nav-` - Nawigacja (sidebar, header, menu)
- `dashboard-` - Panel główny
- `exercise-` - Moduł ćwiczeń
- `set-` - Zestawy ćwiczeń
- `patient-` - Pacjenci
- `assign-` - Przypisywanie zestawów
- `ai-` - Funkcje AI
- `org-` - Organizacja
- `billing-` - Rozliczenia Pay-as-you-go
- `settings-` - Ustawienia
- `verification-` - Centrum weryfikacji ćwiczeń (ContentManager)
- `common-` - Wspólne komponenty

**Sufiksy:**
- `-btn` - Przyciski
- `-input` - Pola tekstowe
- `-select` - Selecty/dropdowny
- `-link` - Linki
- `-card` - Karty
- `-item` - Elementy list

---

## Przykłady użycia w Playwright

### Podstawowe operacje

```typescript
// Logowanie
await page.getByTestId('auth-login-btn').click();

// Wyszukiwanie
await page.getByTestId('exercise-search-input').fill('przysiady');

// Kliknięcie karty
await page.getByTestId('exercise-card-abc123').click();

// Menu kontekstowe
await page.getByTestId('exercise-card-abc123-menu-trigger').click();
await page.getByTestId('exercise-card-abc123-edit-btn').click();
```

### Nawigacja

```typescript
// Przejście do sekcji
await page.getByTestId('nav-link-exercises').click();

// Breadcrumbs
await page.getByTestId('nav-breadcrumb-home').click();
```

### Formularze

```typescript
// Wypełnianie formularza
await page.getByTestId('exercise-form-name-input').fill('Nowe ćwiczenie');
await page.getByTestId('exercise-form-type-select').click();
await page.getByTestId('exercise-form-type-option-reps').click();
await page.getByTestId('exercise-form-submit-btn').click();

// Potwierdzenie usunięcia
await page.getByTestId('common-confirm-dialog-confirm-btn').click();
```

### Helper dla testów (opcjonalny)

```typescript
// tests/helpers/testid.ts
export const byTestId = (testId: string) => `[data-testid="${testId}"]`;

// Użycie z page.locator (alternatywa dla getByTestId)
await page.locator(byTestId('auth-login-btn')).click();
```

### Asercje

```typescript
// Sprawdzenie widoczności
await expect(page.getByTestId('dashboard-greeting')).toBeVisible();

// Sprawdzenie tekstu
await expect(page.getByTestId('patient-card-abc123')).toContainText('Jan Kowalski');

// Sprawdzenie liczby elementów
await expect(page.getByTestId(/^exercise-card-/)).toHaveCount(5);
```

---

## Mapa data-testid według modułów

### 1. Autentykacja (auth-)

| data-testid | Element | Plik |
|-------------|---------|------|
| `auth-login-btn` | Przycisk logowania | `login/page.tsx` |
| `auth-register-link-btn` | Link do rejestracji | `login/page.tsx` |
| `auth-register-email-input` | Email w rejestracji | `register/page.tsx` |
| `auth-register-password-input` | Hasło | `register/page.tsx` |
| `auth-register-password-confirm-input` | Potwierdzenie hasła | `register/page.tsx` |
| `auth-register-firstname-input` | Imię | `register/page.tsx` |
| `auth-register-lastname-input` | Nazwisko | `register/page.tsx` |
| `auth-register-phone-input` | Telefon | `register/page.tsx` |
| `auth-register-company-input` | Nazwa firmy | `register/page.tsx` |
| `auth-register-company-edit-btn` | Edytuj nazwę firmy | `register/page.tsx` |
| `auth-register-step-indicator` | Wskaźnik kroków | `register/page.tsx` |
| `auth-register-next-btn` | Przycisk Dalej | `register/page.tsx` |
| `auth-register-submit-btn` | Przycisk Załóż konto | `register/page.tsx` |
| `auth-register-back-btn` | Przycisk Wstecz | `register/page.tsx` |
| `auth-register-login-link` | Link do logowania | `register/page.tsx` |
| `auth-register-error` | Komunikat błędu | `register/page.tsx` |
| `auth-verify-code-input` | Kod weryfikacyjny | `verify/page.tsx` |
| `auth-verify-submit-btn` | Potwierdź kod | `verify/page.tsx` |
| `auth-verify-resend-btn` | Wyślij ponownie | `verify/page.tsx` |

### 2. Nawigacja (nav-)

#### Desktop Sidebar

| data-testid | Element | Plik |
|-------------|---------|------|
| `nav-sidebar` | Główny sidebar | `Sidebar.tsx` |
| `nav-logo-link` | Link logo | `Sidebar.tsx` |
| `nav-collapse-btn` | Zwiń sidebar | `Sidebar.tsx` |
| `nav-expand-btn` | Rozwiń sidebar | `Sidebar.tsx` |

#### Linki nawigacyjne (Sidebar 2.0 - 3 strefy)

**Strefa 1: Klinika**
| data-testid | Element | Plik |
|-------------|---------|------|
| `nav-link-dashboard` | Link: Panel | `Sidebar.tsx` |
| `nav-link-patients` | Link: Pacjenci | `Sidebar.tsx` |
| `nav-link-exercise-sets` | Link: Zestawy | `Sidebar.tsx` |
| `nav-link-exercises` | Link: Ćwiczenia | `Sidebar.tsx` |

**Strefa 2: Smart Tools**
| data-testid | Element | Plik |
|-------------|---------|------|
| `nav-link-import` | Link: Import Dokumentów (AI) | `Sidebar.tsx` |

**Strefa 3: Organizacja (tylko admin/owner)**
| data-testid | Element | Plik |
|-------------|---------|------|
| `nav-link-organization` | Link: Zespół | `Sidebar.tsx` |
| `nav-link-billing` | Link: Rozliczenia | `Sidebar.tsx` |
| `nav-link-settings` | Link: Ustawienia | `Sidebar.tsx` |

#### User Profile Footer (nowy komponent)

| data-testid | Element | Plik |
|-------------|---------|------|
| `nav-user-footer-trigger` | Trigger profilu użytkownika (dół sidebara) | `UserProfileFooter.tsx` |
| `nav-user-footer-profile` | Mój profil (Clerk modal) | `UserProfileFooter.tsx` |
| `nav-user-footer-org-{id}` | Przełącz do organizacji | `UserProfileFooter.tsx` |
| `nav-user-footer-settings` | Ustawienia konta | `UserProfileFooter.tsx` |
| `nav-user-footer-help` | Pomoc / Support | `UserProfileFooter.tsx` |
| `nav-user-footer-logout` | Wyloguj się | `UserProfileFooter.tsx` |

#### Header (kontekst "tu i teraz")

| data-testid | Element | Plik |
|-------------|---------|------|
| `nav-header` | Główny header | `Header.tsx` |
| `nav-mobile-menu-btn` | Menu mobilne | `Header.tsx` |
| `nav-breadcrumbs` | Breadcrumbs | `Header.tsx` |
| `nav-breadcrumb-home` | Home link | `Header.tsx` |
| `nav-breadcrumb-item-{n}` | Element breadcrumb | `Header.tsx` |
| `nav-notifications-btn` | Przycisk powiadomień (dzwoneczek) | `Header.tsx` |

> **Uwaga:** UserMenu został usunięty z Headera. Wszystkie funkcje profilu są teraz w `UserProfileFooter` (lewy dolny róg sidebara) - wzorzec Linear/Slack.

#### Organization Switcher

| data-testid | Element | Plik |
|-------------|---------|------|
| `nav-org-switcher-trigger` | Przełącznik organizacji | `OrganizationSwitcher.tsx` |
| `nav-org-switcher-item-{id}` | Organizacja | `OrganizationSwitcher.tsx` |
| `nav-org-switcher-create` | Utwórz organizację | `OrganizationSwitcher.tsx` |

#### Mobile Sidebar

| data-testid | Element | Plik |
|-------------|---------|------|
| `nav-mobile-sidebar` | Sidebar mobilny | `MobileSidebar.tsx` |
| `nav-mobile-link-dashboard` | Link: Panel (mobile) | `MobileSidebar.tsx` |
| `nav-mobile-link-patients` | Link: Pacjenci (mobile) | `MobileSidebar.tsx` |
| `nav-mobile-link-exercise-sets` | Link: Zestawy (mobile) | `MobileSidebar.tsx` |
| `nav-mobile-link-exercises` | Link: Ćwiczenia (mobile) | `MobileSidebar.tsx` |
| `nav-mobile-link-import` | Link: Import Dokumentów (mobile) | `MobileSidebar.tsx` |
| `nav-mobile-link-organization` | Link: Zespół (mobile) | `MobileSidebar.tsx` |
| `nav-mobile-link-billing` | Link: Rozliczenia (mobile) | `MobileSidebar.tsx` |
| `nav-mobile-link-settings` | Link: Ustawienia (mobile) | `MobileSidebar.tsx` |
| `nav-mobile-user-profile` | Ustawienia profilu (mobile) | `MobileSidebar.tsx` |
| `nav-mobile-switch-org` | Przełącz organizację (mobile) | `MobileSidebar.tsx` |
| `nav-mobile-help` | Pomoc / Support (mobile) | `MobileSidebar.tsx` |
| `nav-mobile-logout-btn` | Wyloguj (mobile) | `MobileSidebar.tsx` |

### 3. Dashboard (dashboard-)

| data-testid | Element | Plik |
|-------------|---------|------|
| `dashboard-greeting` | Powitanie | `page.tsx` |
| `dashboard-hero-assign-set-btn` | Przypisz zestaw (główna akcja) | `page.tsx` |
| `dashboard-create-set-btn` | Utwórz zestaw | `page.tsx` |
| `dashboard-add-patient-btn` | Dodaj pacjenta | `page.tsx` |
| `dashboard-activity-section` | Sekcja "Wymagają uwagi" | `page.tsx` |
| `dashboard-patients-view-all` | Link: Wszyscy pacjenci | `page.tsx` |
| `dashboard-patient-item-{id}` | Element listy pacjentów z aktywnością | `page.tsx` |
| `dashboard-sets-section` | Sekcja "Szybki wybór" | `page.tsx` |
| `dashboard-sets-view-all` | Link: Wszystkie zestawy | `page.tsx` |
| `dashboard-set-item-{id}` | Element listy zestawów | `page.tsx` |
| `dashboard-quick-assign-{id}` | Przycisk szybkiego przypisania zestawu | `page.tsx` |

### 4. Ćwiczenia (exercise-)

| data-testid | Element | Plik |
|-------------|---------|------|
| `exercise-page-title` | Tytuł strony | `exercises/page.tsx` |
| `exercise-search-input` | Wyszukiwarka | `exercises/page.tsx` |
| `exercise-view-grid-btn` | Widok siatki | `exercises/page.tsx` |
| `exercise-view-list-btn` | Widok listy | `exercises/page.tsx` |
| `exercise-create-btn` | Dodaj ćwiczenie | `exercises/page.tsx` |
| `exercise-card-{id}` | Karta ćwiczenia | `ExerciseCard.tsx` |
| `exercise-card-{id}-menu-trigger` | Menu kontekstowe | `ExerciseCard.tsx` |
| `exercise-card-{id}-view-btn` | Podgląd | `ExerciseCard.tsx` |
| `exercise-card-{id}-edit-btn` | Edytuj | `ExerciseCard.tsx` |
| `exercise-card-{id}-add-to-set-btn` | Dodaj do zestawu | `ExerciseCard.tsx` |
| `exercise-card-{id}-delete-btn` | Usuń | `ExerciseCard.tsx` |
| `exercise-form` | Formularz ćwiczenia | `ExerciseForm.tsx` |
| `exercise-form-name-input` | Nazwa ćwiczenia | `ExerciseForm.tsx` |
| `exercise-form-description-input` | Opis | `ExerciseForm.tsx` |
| `exercise-form-type-select` | Typ ćwiczenia | `ExerciseForm.tsx` |
| `exercise-form-type-option-reps` | Opcja: Powtórzenia | `ExerciseForm.tsx` |
| `exercise-form-type-option-time` | Opcja: Czasowe | `ExerciseForm.tsx` |
| `exercise-form-type-option-hold` | Opcja: Utrzymywanie | `ExerciseForm.tsx` |
| `exercise-form-side-select` | Strona ciała | `ExerciseForm.tsx` |
| `exercise-quick-templates` | Sekcja szybkich szablonów | `QuickTemplates.tsx` |
| `exercise-quick-templates-toggle-btn` | Rozwiń/zwiń szablony | `QuickTemplates.tsx` |
| `exercise-quick-template-{id}-btn` | Przycisk szablonu (np. plank, bird-dog) | `QuickTemplates.tsx` |
| `exercise-create-ai-image-btn` | Wygeneruj obraz AI (widoczny od razu) | `CreateExerciseWizard.tsx` |

### 5. Zestawy ćwiczeń (set-)

| data-testid | Element | Plik |
|-------------|---------|------|
| `set-page-title` | Tytuł strony | `exercise-sets/page.tsx` |
| `set-search-input` | Wyszukiwarka | `exercise-sets/page.tsx` |
| `set-tag-filter-btn` | Dropdown filtra tagów | `exercise-sets/page.tsx` |
| `set-filter-all-btn` | Filtr: Wszystkie | `exercise-sets/page.tsx` |
| `set-filter-recent-btn` | Filtr: Ostatnio używane | `exercise-sets/page.tsx` |
| `set-filter-templates-btn` | Filtr: Szablony | `exercise-sets/page.tsx` |
| `set-create-btn` | Utwórz zestaw | `exercise-sets/page.tsx` |
| `set-create-wizard-btn` | Kreator zestawu | `exercise-sets/page.tsx` |
| `set-card-{id}` | Karta zestawu | `SetCard.tsx` |
| `set-card-{id}-assign-btn` | Przypisz do pacjenta | `SetCard.tsx` |
| `set-card-{id}-copy-link-btn` | Kopiuj link publiczny | `SetCard.tsx` |
| `set-card-{id}-menu-trigger` | Menu kontekstowe (3 kropki) | `SetCard.tsx` |
| `set-card-{id}-edit-btn` | Edytuj (w menu) | `SetCard.tsx` |
| `set-card-{id}-duplicate-btn` | Duplikuj (w menu) | `SetCard.tsx` |
| `set-card-{id}-delete-btn` | Usuń (w menu) | `SetCard.tsx` |
| `set-detail-back-btn` | Przycisk wstecz | `exercise-sets/[id]/page.tsx` |
| `set-detail-name` | Nazwa zestawu | `exercise-sets/[id]/page.tsx` |
| `set-detail-menu-trigger` | Menu akcji | `exercise-sets/[id]/page.tsx` |
| `set-detail-edit-btn` | Edytuj zestaw | `exercise-sets/[id]/page.tsx` |
| `set-detail-delete-btn` | Usuń zestaw | `exercise-sets/[id]/page.tsx` |
| `set-detail-add-exercise-btn` | Dodaj ćwiczenie | `exercise-sets/[id]/page.tsx` |
| `set-detail-assign-btn` | Przypisz pacjentom | `exercise-sets/[id]/page.tsx` |
| `set-detail-pdf-btn` | Generuj PDF | `exercise-sets/[id]/page.tsx` |
| `set-exercise-item-{id}` | Ćwiczenie w zestawie | `exercise-sets/[id]/page.tsx` |
| `set-exercise-item-{id}-edit-btn` | Edytuj w zestawie | `exercise-sets/[id]/page.tsx` |
| `set-exercise-item-{id}-remove-btn` | Usuń z zestawu | `exercise-sets/[id]/page.tsx` |
| `set-form` | Formularz zestawu | `SetForm.tsx` |
| `set-form-name-input` | Nazwa zestawu | `SetForm.tsx` |
| `set-form-description-input` | Opis zestawu | `SetForm.tsx` |
| `set-form-submit-btn` | Zapisz | `SetForm.tsx` |
| `set-form-cancel-btn` | Anuluj | `SetForm.tsx` |
| `set-dialog` | Dialog zestawu | `SetDialog.tsx` |
| `set-dialog-title` | Tytuł dialogu | `SetDialog.tsx` |
| `set-wizard` | Kreator zestawu | `CreateSetWizard.tsx` |
| `set-wizard-name-input` | Nazwa w kreatorze | `CreateSetWizard.tsx` |
| `set-wizard-description-input` | Opis zestawu | `CreateSetWizard.tsx` |
| `set-wizard-search-input` | Wyszukaj ćwiczenia | `CreateSetWizard.tsx` |
| `set-wizard-exercise-{id}` | Ćwiczenie do wyboru | `CreateSetWizard.tsx` |
| `set-wizard-selected-{id}` | Wybrane ćwiczenie | `CreateSetWizard.tsx` |
| `set-wizard-next-btn` | Dalej: Ćwiczenia | `CreateSetWizard.tsx` |
| `set-wizard-back-btn` | Wstecz | `CreateSetWizard.tsx` |
| `set-wizard-create-empty-btn` | Utwórz pusty zestaw | `CreateSetWizard.tsx` |
| `set-wizard-create-btn` | Utwórz zestaw (z ćwiczeniami) | `CreateSetWizard.tsx` |
| `set-add-exercise-dialog` | Dialog dodawania | `AddExerciseToSetDialog.tsx` |
| `set-add-exercise-search` | Wyszukaj ćwiczenia | `AddExerciseToSetDialog.tsx` |
| `set-add-exercise-{id}` | Ćwiczenie do dodania | `AddExerciseToSetDialog.tsx` |
| `set-add-exercise-submit-btn` | Dodaj wybrane | `AddExerciseToSetDialog.tsx` |
| `set-edit-exercise-dialog` | Dialog edycji | `EditExerciseInSetDialog.tsx` |
| `set-edit-exercise-sets-input` | Serie | `EditExerciseInSetDialog.tsx` |
| `set-edit-exercise-reps-input` | Powtórzenia | `EditExerciseInSetDialog.tsx` |
| `set-edit-exercise-duration-input` | Czas trwania | `EditExerciseInSetDialog.tsx` |
| `set-edit-exercise-submit-btn` | Zapisz zmiany | `EditExerciseInSetDialog.tsx` |
| `set-frequency-times-per-day` | Razy dziennie | `FrequencyPicker.tsx` |
| `set-frequency-times-per-week` | Razy tygodniowo | `FrequencyPicker.tsx` |
| `set-frequency-day-{day}` | Dzień tygodnia | `FrequencyPicker.tsx` |
| `set-pdf-dialog` | Dialog PDF | `GeneratePDFDialog.tsx` |
| `set-pdf-download-btn` | Pobierz PDF | `GeneratePDFDialog.tsx` |

### 6. Pacjenci (patient-)

| data-testid | Element | Plik |
|-------------|---------|------|
| `patient-page-title` | Tytuł strony | `patients/page.tsx` |
| `patient-search-input` | Wyszukiwarka | `patients/page.tsx` |
| `patient-filter-dropdown` | Dropdown filtra (Collaborative Care) | `PatientFilter.tsx` |
| `patient-filter-option-my` | Opcja: Moi pacjenci | `PatientFilter.tsx` |
| `patient-filter-option-all` | Opcja: Wszyscy | `PatientFilter.tsx` |
| `patient-filter-option-unassigned` | Opcja: Nieprzypisani | `PatientFilter.tsx` |
| `patient-filter-my-btn` | Filtr: Moi (Quick Stats) | `patients/page.tsx` |
| `patient-filter-all-btn` | Filtr: Wszyscy (Quick Stats) | `patients/page.tsx` |
| `patient-filter-unassigned-btn` | Filtr: Nieprzypisani (Quick Stats) | `patients/page.tsx` |
| `patient-create-btn` | Dodaj pacjenta | `patients/page.tsx` |
| `patient-card-{id}` | Karta pacjenta | `PatientCard.tsx` |
| `patient-card-{id}-menu-trigger` | Menu kontekstowe | `PatientCard.tsx` |
| `patient-card-{id}-view-btn` | Podgląd | `PatientCard.tsx` |
| `patient-card-{id}-edit-btn` | Edytuj | `PatientCard.tsx` |
| `patient-card-{id}-assign-btn` | Przypisz zestaw | `PatientCard.tsx` |
| `patient-card-{id}-delete-btn` | Usuń | `PatientCard.tsx` |
| `patient-card-therapist-badge` | Badge fizjoterapeuty | `TherapistBadge.tsx` |
| `patient-card-therapist-badge-unassigned` | Badge nieprzypisany | `TherapistBadge.tsx` |
| `patient-takeover-btn` | Przejmij opiekę (przycisk) | `PatientExpandableCard.tsx` |
| `patient-takeover-dialog` | Dialog przejmowania opieki | `TakeOverDialog.tsx` |
| `patient-takeover-confirm-btn` | Potwierdź przejęcie | `TakeOverDialog.tsx` |
| `patient-expandable-{id}` | Karta rozwijana | `PatientExpandableCard.tsx` |
| `patient-expandable-{id}-assign-btn` | Przypisz zestaw | `PatientExpandableCard.tsx` |
| `patient-expandable-{id}-menu-trigger` | Menu kontekstowe | `PatientExpandableCard.tsx` |
| `patient-detail-back-btn` | Przycisk wstecz | `patients/[id]/page.tsx` |
| `patient-detail-name` | Imię i nazwisko | `patients/[id]/page.tsx` |
| `patient-detail-menu-trigger` | Menu akcji | `patients/[id]/page.tsx` |
| `patient-detail-assign-btn` | Przypisz zestaw | `patients/[id]/page.tsx` |
| `patient-detail-qr-btn` | Kod QR | `patients/[id]/page.tsx` |
| `patient-detail-edit-btn` | Edytuj dane | `patients/[id]/page.tsx` |
| `patient-form` | Formularz pacjenta | `PatientForm.tsx` |
| `patient-form-firstname-input` | Imię | `PatientForm.tsx` |
| `patient-form-lastname-input` | Nazwisko | `PatientForm.tsx` |
| `patient-form-phone-input` | Telefon | `PatientForm.tsx` |
| `patient-form-email-input` | Email | `PatientForm.tsx` |
| `patient-form-context-input` | Etykieta kontekstu | `PatientForm.tsx` |
| `patient-form-submit-btn` | Zapisz | `PatientForm.tsx` |
| `patient-form-cancel-btn` | Anuluj | `PatientForm.tsx` |
| `patient-dialog` | Dialog pacjenta | `PatientDialog.tsx` |
| `patient-dialog-title` | Tytuł dialogu | `PatientDialog.tsx` |
| `patient-assignment-{id}` | Karta przypisania | `PatientAssignmentCard.tsx` |
| `patient-assignment-{id}-edit-btn` | Edytuj harmonogram | `PatientAssignmentCard.tsx` |
| `patient-assignment-{id}-remove-btn` | Usuń przypisanie | `PatientAssignmentCard.tsx` |
| `patient-assignment-{id}-pdf-btn` | Generuj PDF | `PatientAssignmentCard.tsx` |
| `patient-notes-section` | Sekcja notatek | `PatientNotes.tsx` |
| `patient-notes-add-btn` | Dodaj notatkę | `PatientNotes.tsx` |
| `patient-notes-input` | Treść notatki | `PatientNotes.tsx` |
| `patient-note-{id}` | Notatka | `PatientNotes.tsx` |
| `patient-note-{id}-delete-btn` | Usuń notatkę | `PatientNotes.tsx` |
| `patient-qr-dialog` | Dialog QR | `PatientQRCodeDialog.tsx` |
| `patient-qr-download-btn` | Pobierz QR | `PatientQRCodeDialog.tsx` |
| `patient-qr-copy-btn` | Kopiuj link | `PatientQRCodeDialog.tsx` |
| `patient-schedule-dialog` | Dialog harmonogramu | `EditAssignmentScheduleDialog.tsx` |
| `patient-schedule-start-date` | Data rozpoczęcia | `EditAssignmentScheduleDialog.tsx` |
| `patient-schedule-end-date` | Data zakończenia | `EditAssignmentScheduleDialog.tsx` |
| `patient-schedule-submit-btn` | Zapisz harmonogram | `EditAssignmentScheduleDialog.tsx` |
| `patient-override-dialog` | Dialog nadpisania | `EditExerciseOverrideDialog.tsx` |
| `patient-override-sets-input` | Serie | `EditExerciseOverrideDialog.tsx` |
| `patient-override-reps-input` | Powtórzenia | `EditExerciseOverrideDialog.tsx` |
| `patient-override-submit-btn` | Zapisz zmiany | `EditExerciseOverrideDialog.tsx` |
| `patient-context-edit-btn` | Edytuj etykietę | `EditContextLabelDialog.tsx` |
| `patient-context-dialog` | Dialog etykiety | `EditContextLabelDialog.tsx` |
| `patient-context-submit-btn` | Zapisz etykietę | `EditContextLabelDialog.tsx` |
| `patient-premium-badge-{id}` | Badge statusu Premium | `PremiumStatusBadge.tsx` |
| `patient-premium-activate-btn-{id}` | Przycisk aktywacji Premium | `PremiumStatusBadge.tsx` |
| `patient-premium-confirm-dialog` | Dialog potwierdzenia aktywacji | `ActivatePremiumDialog.tsx` |
| `patient-premium-confirm-dialog-title` | Tytuł dialogu aktywacji | `ActivatePremiumDialog.tsx` |
| `patient-premium-confirm-dialog-confirm-btn` | Przycisk potwierdzenia | `ActivatePremiumDialog.tsx` |
| `patient-premium-confirm-dialog-cancel-btn` | Przycisk anulowania | `ActivatePremiumDialog.tsx` |

### 7. Przypisywanie zestawów (assign-)

| data-testid | Element | Plik |
|-------------|---------|------|
| `assign-wizard` | Kreator przypisywania | `AssignmentWizard.tsx` |
| `assign-wizard-step-indicator` | Wskaźnik kroków | `AssignmentWizard.tsx` |
| `assign-wizard-close-btn` | Zamknij kreator | `AssignmentWizard.tsx` |
| `assign-wizard-back-btn` | Wstecz | `AssignmentWizard.tsx` |
| `assign-wizard-next-btn` | Dalej | `AssignmentWizard.tsx` |
| `assign-select-set-search` | Wyszukaj zestaw | `SelectSetStep.tsx` |
| `assign-select-set-{id}` | Zestaw do wyboru | `SelectSetStep.tsx` |
| `assign-select-patients-search` | Wyszukaj pacjenta | `SelectPatientsStep.tsx` |
| `assign-select-patient-{id}` | Pacjent do wyboru | `SelectPatientsStep.tsx` |
| `assign-select-all-btn` | Zaznacz wszystkich | `SelectPatientsStep.tsx` |
| `assign-customize-exercise-{id}` | Ćwiczenie do dostosowania | `CustomizeExercisesStep.tsx` |
| `assign-customize-{id}-sets-input` | Serie | `CustomizeExercisesStep.tsx` |
| `assign-customize-{id}-reps-input` | Powtórzenia | `CustomizeExercisesStep.tsx` |
| `assign-schedule-start-date` | Data rozpoczęcia | `ScheduleStep.tsx` |
| `assign-schedule-end-date` | Data zakończenia | `ScheduleStep.tsx` |
| `assign-schedule-frequency` | Częstotliwość | `ScheduleStep.tsx` |
| `assign-summary` | Podsumowanie | `SummaryStep.tsx` |
| `assign-summary-submit-btn` | Przypisz zestaw | `SummaryStep.tsx` |

### 8. AI Chat (ai-)

| data-testid | Element | Plik |
|-------------|---------|------|
| `ai-chat-panel` | Panel czatu | `AIChatPanel.tsx` |
| `ai-chat-input` | Pole wiadomości | `AIChatPanel.tsx` |
| `ai-chat-send-btn` | Wyślij wiadomość | `AIChatPanel.tsx` |
| `ai-chat-clear-btn` | Wyczyść czat | `AIChatPanel.tsx` |
| `ai-chat-history-btn` | Historia sesji | `AIChatPanel.tsx` |
| `ai-chat-upload-btn` | Prześlij dokument | `AIChatPanel.tsx` |
| `ai-chat-message-{id}` | Wiadomość | `ChatMessage.tsx` |
| `ai-chat-exercise-card-{name}` | Karta ćwiczenia w odpowiedzi AI | `chat/ExerciseCard.tsx` |
| `ai-chat-exercise-add-to-set-btn` | Dodaj ćwiczenie do zestawu | `chat/ExerciseCard.tsx` |
| `ai-chat-sessions-list` | Lista sesji | `ChatSessionsList.tsx` |
| `ai-chat-session-{id}` | Sesja czatu | `ChatSessionsList.tsx` |
| `ai-chat-session-{id}-delete` | Usuń sesję | `ChatSessionsList.tsx` |
| `ai-chat-new-session-btn` | Nowa sesja | `ChatSessionsList.tsx` |
| `ai-voice-btn` | Przycisk mikrofonu | `VoiceMicButton.tsx` |
| `ai-quick-action-{type}` | Szybka akcja | `QuickActions.tsx` |
| `ai-add-to-set-dialog` | Dialog dodania | `AddToSetFromChatDialog.tsx` |
| `ai-add-to-set-select` | Wybór zestawu | `AddToSetFromChatDialog.tsx` |
| `ai-add-to-set-submit-btn` | Dodaj do zestawu | `AddToSetFromChatDialog.tsx` |
| `ai-exercise-card-{id}` | Karta ćwiczenia AI | `chat/ExerciseCard.tsx` |
| `ai-exercise-card-{id}-add-btn` | Dodaj ćwiczenie | `chat/ExerciseCard.tsx` |

### 9. Import dokumentów (import-)

| data-testid | Element | Plik |
|-------------|---------|------|
| `import-page` | Kontener strony | `import/page.tsx` |
| `import-page-title` | Tytuł strony | `import/page.tsx` |
| `import-step-indicator` | Wskaźnik kroków | `import/page.tsx` |
| `import-analyze-btn` | Analizuj dokument | `import/page.tsx` |
| `import-back-btn` | Wstecz | `import/page.tsx` |
| `import-next-btn` | Dalej | `import/page.tsx` |
| `import-execute-btn` | Importuj | `import/page.tsx` |
| `import-dropzone` | Strefa upuszczania | `DocumentDropzone.tsx` |
| `import-dropzone-input` | Input pliku | `DocumentDropzone.tsx` |
| `import-dropzone-clear-btn` | Usuń plik | `DocumentDropzone.tsx` |
| `import-analyze-btn` | Analizuj dokument | `import/page.tsx` |
| `import-exercise-{id}` | Karta ćwiczenia | `ExerciseReviewCard.tsx` |
| `import-exercise-{id}-create-btn` | Utwórz | `ExerciseReviewCard.tsx` |
| `import-exercise-{id}-skip-btn` | Pomiń | `ExerciseReviewCard.tsx` |
| `import-exercise-{id}-match-btn` | Dopasuj | `ExerciseReviewCard.tsx` |
| `import-set-{id}` | Karta zestawu | `SetReviewCard.tsx` |
| `import-set-{id}-create-btn` | Utwórz zestaw | `SetReviewCard.tsx` |
| `import-set-{id}-skip-btn` | Pomiń zestaw | `SetReviewCard.tsx` |
| `import-note-{id}` | Karta notatki | `NoteReviewCard.tsx` |
| `import-note-{id}-create-btn` | Utwórz notatkę | `NoteReviewCard.tsx` |
| `import-bulk-create-all-btn` | Utwórz wszystkie | `BulkActionsToolbar.tsx` |
| `import-bulk-skip-all-btn` | Pomiń wszystkie | `BulkActionsToolbar.tsx` |
| `import-bulk-match-all-btn` | Dopasuj wszystkie | `BulkActionsToolbar.tsx` |
| `import-patient-context` | Panel kontekstu | `PatientContextPanel.tsx` |
| `import-patient-select` | Wybór pacjenta | `PatientContextPanel.tsx` |
| `import-summary` | Podsumowanie | `ImportSummary.tsx` |
| `import-summary-close-btn` | Zamknij | `ImportSummary.tsx` |

### 10. Organizacja (org-)

| data-testid | Element | Plik |
|-------------|---------|------|
| `org-page-title` | Tytuł strony | `organization/page.tsx` |
| `org-tab-team` | Zakładka: Zespół | `organization/page.tsx` |
| `org-tab-clinics` | Zakładka: Placówki | `organization/page.tsx` |
| `org-tab-invitations` | Zakładka: Zaproszenia | `organization/page.tsx` |
| `org-tab-settings` | Zakładka: Ustawienia | `organization/page.tsx` |
| `org-team-section` | Sekcja zespołu | `TeamSection.tsx` |
| `org-team-invite-btn` | Zaproś członka | `TeamSection.tsx` |
| `org-member-{id}` | Karta członka | `MemberCard.tsx` |
| `org-member-{id}-menu` | Menu członka | `MemberCard.tsx` |
| `org-member-{id}-remove-btn` | Usuń członka | `MemberCard.tsx` |
| `org-member-{id}-role-select` | Zmień rolę | `MemberCard.tsx` |
| `org-clinics-section` | Sekcja placówek | `ClinicsSection.tsx` |
| `org-clinics-add-btn` | Dodaj placówkę | `ClinicsSection.tsx` |
| `org-clinic-{id}` | Karta placówki | `ClinicCard.tsx` |
| `org-clinic-{id}-edit-btn` | Edytuj | `ClinicCard.tsx` |
| `org-clinic-{id}-delete-btn` | Usuń | `ClinicCard.tsx` |
| `org-invite-dialog` | Dialog zaproszenia | `InviteMemberDialog.tsx` |
| `org-invite-tab-email` | Zakładka: Email | `InviteMemberDialog.tsx` |
| `org-invite-tab-link` | Zakładka: Link | `InviteMemberDialog.tsx` |
| `org-invite-email-input` | Email | `InviteMemberDialog.tsx` |
| `org-invite-role-select` | Rola | `InviteMemberDialog.tsx` |
| `org-invite-message-input` | Wiadomość | `InviteMemberDialog.tsx` |
| `org-invite-submit-btn` | Wyślij zaproszenie | `InviteMemberDialog.tsx` |
| `org-invite-generate-link-btn` | Generuj link | `InviteMemberDialog.tsx` |
| `org-invite-copy-link-btn` | Kopiuj link | `InviteMemberDialog.tsx` |
| `org-clinic-dialog` | Dialog placówki | `ClinicDialog.tsx` |
| `org-clinic-name-input` | Nazwa placówki | `ClinicDialog.tsx` |
| `org-clinic-address-input` | Adres | `ClinicDialog.tsx` |
| `org-clinic-contact-input` | Kontakt | `ClinicDialog.tsx` |
| `org-clinic-submit-btn` | Zapisz placówkę | `ClinicDialog.tsx` |
| `org-settings-tab` | Ustawienia org. | `SettingsTab.tsx` |
| `org-settings-name-input` | Nazwa organizacji | `SettingsTab.tsx` |
| `org-settings-submit-btn` | Zapisz ustawienia | `SettingsTab.tsx` |
| `org-subscription-card` | Karta subskrypcji | `SubscriptionCard.tsx` |
| `org-subscription-plan` | Aktualny plan | `SubscriptionCard.tsx` |
| `org-subscription-upgrade-btn` | Ulepsz plan | `SubscriptionCard.tsx` |
| `org-invitation-{id}` | Zaproszenie | `InvitationsTab.tsx` |
| `org-invitation-{id}-resend-btn` | Wyślij ponownie | `InvitationsTab.tsx` |
| `org-invitation-{id}-revoke-btn` | Anuluj | `InvitationsTab.tsx` |

### 11. Rozliczenia Pay-as-you-go (billing-)

| data-testid | Element | Plik |
|-------------|---------|------|
| `dashboard-billing-kpi-card` | Karta KPI rozliczeń (Dashboard) | `BillingKpiCard.tsx` |
| `dashboard-billing-status-bar` | Pasek rozliczeń (Dashboard bottom) | `BillingStatusBar.tsx` |
| `billing-summary-widget` | Widget rozliczeń (pełny) | `BillingSummaryWidget.tsx` |
| `billing-active-patients-count` | Liczba aktywnych pacjentów | `BillingSummaryWidget.tsx` |
| `billing-estimated-amount` | Estymowana należność | `BillingSummaryWidget.tsx` |
| `billing-details-btn` | Przycisk szczegółów (compact) | `BillingSummaryWidget.tsx` |
| `billing-therapist-table` | Tabela terapeutów | `TherapistBillingTable.tsx` |
| `billing-therapist-search-input` | Wyszukiwarka terapeutów | `TherapistBillingTable.tsx` |
| `billing-therapist-row-{id}` | Wiersz terapeuty | `TherapistBillingTable.tsx` |

### 12. Ustawienia (settings-)

| data-testid | Element | Plik |
|-------------|---------|------|
| `settings-page-title` | Tytuł strony | `settings/page.tsx` |
| `settings-tab-profile` | Zakładka: Profil | `settings/page.tsx` |
| `settings-tab-organizations` | Zakładka: Organizacje | `settings/page.tsx` |
| `settings-tab-display` | Zakładka: Wygląd | `settings/page.tsx` |
| `settings-tab-organization` | Zakładka: Org. ustawienia | `settings/page.tsx` |
| `settings-profile-form` | Formularz profilu | `ProfileForm.tsx` |
| `settings-profile-firstname` | Imię | `ProfileForm.tsx` |
| `settings-profile-lastname` | Nazwisko | `ProfileForm.tsx` |
| `settings-profile-phone` | Telefon | `ProfileForm.tsx` |
| `settings-profile-submit-btn` | Zapisz profil | `ProfileForm.tsx` |
| `settings-orgs-list` | Lista organizacji | `OrganizationsList.tsx` |
| `settings-org-{id}` | Organizacja | `OrganizationsList.tsx` |
| `settings-org-{id}-switch-btn` | Przełącz | `OrganizationsList.tsx` |
| `settings-accessibility` | Ustawienia dostępności | `AccessibilitySettings.tsx` |
| `settings-accessibility-font-size` | Rozmiar czcionki | `AccessibilitySettings.tsx` |
| `settings-ai-credits` | Panel kredytów AI | `AICreditsPanel.tsx` |
| `settings-ai-credits-balance` | Saldo kredytów | `AICreditsPanel.tsx` |
| `settings-ai-credits-buy-btn` | Kup kredyty | `AICreditsPanel.tsx` |

### 13. Onboarding (onboarding-)

| data-testid | Element | Plik |
|-------------|---------|------|
| `onboarding-wizard` | Kreator onboardingu | `OnboardingWizard.tsx` |
| `onboarding-step-{id}` | Krok onboardingu | `OnboardingWizard.tsx` |
| `onboarding-step-action-btn` | Przycisk akcji kroku | `OnboardingWizard.tsx` |
| `onboarding-skip-btn` | Pomiń onboarding | `OnboardingWizard.tsx` |
| `onboarding-finish-btn` | Rozpocznij pracę (po ukończeniu) | `OnboardingWizard.tsx` |
| `onboarding-reset-btn` | Powtórz tutorial | `OnboardingWizard.tsx` |
| `onboarding-getting-started-card` | Karta rozpoczęcia | `GettingStartedCard.tsx` |
| `onboarding-getting-started-step-{id}` | Krok w karcie | `GettingStartedCard.tsx` |
| `onboarding-dismiss-btn` | Ukryj kartę | `GettingStartedCard.tsx` |

### 14. Moduł kliniczny (clinical-) - na ten moment beta funkcjonalność, na demo chcemy zebrać feedback i rozwijać/usunąć ten element

| data-testid | Element | Plik |
|-------------|---------|------|
| `clinical-editor` | Edytor notatki | `ClinicalNoteEditor.tsx` |
| `clinical-editor-title-input` | Tytuł wizyty | `ClinicalNoteEditor.tsx` |
| `clinical-editor-type-select` | Typ wizyty | `ClinicalNoteEditor.tsx` |
| `clinical-editor-save-btn` | Zapisz | `ClinicalNoteEditor.tsx` |
| `clinical-editor-sign-btn` | Podpisz | `ClinicalNoteEditor.tsx` |
| `clinical-notes-list` | Lista notatek | `ClinicalNotesList.tsx` |
| `clinical-note-{id}` | Notatka | `ClinicalNotesList.tsx` |
| `clinical-note-{id}-edit-btn` | Edytuj | `ClinicalNotesList.tsx` |
| `clinical-note-{id}-view-btn` | Podgląd | `ClinicalNotesList.tsx` |
| `clinical-note-editor` | Kontener edytora | `ClinicalNoteEditor.tsx` |
| `clinical-note-title` | Tytuł (Nowa wizyta/Edytuj) | `ClinicalNoteEditor.tsx` |
| `clinical-note-visit-type-select` | Select typu wizyty | `ClinicalNoteEditor.tsx` |
| `clinical-note-visit-date-input` | Data wizyty | `ClinicalNoteEditor.tsx` |
| `clinical-note-title-input` | Tytuł wizyty | `ClinicalNoteEditor.tsx` |
| `clinical-note-copy-from-last-btn` | Kopiuj z poprzedniej | `ClinicalNoteEditor.tsx` |
| `clinical-note-back-btn` | Wstecz | `StepperFooter.tsx` |
| `clinical-note-next-btn` | Dalej | `StepperFooter.tsx` |
| `clinical-note-save-draft-btn` | Zapisz wersję roboczą | `StepperFooter.tsx` |
| `clinical-note-sign-btn` | Podpisz i zakończ | `StepperFooter.tsx` |
| `clinical-interview-section` | Sekcja wywiadu | `InterviewSectionForm.tsx` |
| `clinical-examination-section` | Sekcja badania | `ExaminationSectionForm.tsx` |
| `clinical-diagnosis-section` | Sekcja diagnozy | `DiagnosisSectionForm.tsx` |
| `clinical-treatment-section` | Sekcja leczenia | `TreatmentPlanSectionForm.tsx` |

### 15. Centrum Weryfikacji (verification-)

#### Ekran powitalny (Intro)

| data-testid | Element | Plik |
|-------------|---------|------|
| `verification-intro-container` | Kontener ekranu powitalnego | `VerificationIntro.tsx` |
| `verification-intro-hero-icon` | Ikona hero | `VerificationIntro.tsx` |
| `verification-intro-status-card` | Karta statusu (wynik scan) | `VerificationIntro.tsx` |
| `verification-intro-load-btn` | Przycisk "Załaduj ćwiczenia" | `VerificationIntro.tsx` |
| `reviewer-achievements-card` | Karta osiągnięć recenzenta (wariant full) | `ReviewerAchievements.tsx` |
| `reviewer-achievements-compact` | Kompaktowy element osiągnięć (wariant compact) | `ReviewerAchievements.tsx` |

#### Widok pełny (z zadaniami)

| data-testid | Element | Plik |
|-------------|---------|------|
| `nav-link-verification` | Link: Centrum Weryfikacji | `Sidebar.tsx` |
| `verification-search-input` | Wyszukiwarka ćwiczeń | `verification/page.tsx` |
| `verification-stats-pending` | Karta statystyk: Oczekujące | `VerificationStatsCards.tsx` |
| `verification-stats-changes` | Karta statystyk: Do poprawy | `VerificationStatsCards.tsx` |
| `verification-stats-approved` | Karta statystyk: Zatwierdzone | `VerificationStatsCards.tsx` |
| `verification-stats-published` | Karta statystyk: Opublikowane | `VerificationStatsCards.tsx` |
| `verification-card-{id}` | Karta zadania weryfikacji | `VerificationTaskCard.tsx` |
| `verification-card-{id}-start-btn` | Przycisk rozpoczęcia weryfikacji | `VerificationTaskCard.tsx` |
| `verification-checklist-clinical` | Checkbox: Poprawność kliniczna | `QualityChecklist.tsx` |
| `verification-checklist-media` | Checkbox: Jakość mediów | `QualityChecklist.tsx` |
| `verification-checklist-description` | Checkbox: Kompletność opisu | `QualityChecklist.tsx` |
| `verification-checklist-tags` | Checkbox: Odpowiednie tagi | `QualityChecklist.tsx` |
| `verification-reject-btn` | Przycisk odrzucenia | `VerificationStickyFooter.tsx` |
| `verification-skip-btn` | Przycisk pominięcia | `VerificationStickyFooter.tsx` |
| `verification-approve-btn` | Przycisk zatwierdzenia | `VerificationStickyFooter.tsx` |
| `verification-reject-dialog` | Dialog odrzucenia | `RejectReasonDialog.tsx` |
| `verification-reject-reason-select` | Dropdown wyboru powodu | `RejectReasonDialog.tsx` |
| `verification-reject-notes-input` | Textarea notatki (wymagana) | `RejectReasonDialog.tsx` |
| `verification-reject-confirm-btn` | Przycisk potwierdzenia odrzucenia | `RejectReasonDialog.tsx` |
| `verification-approve-dialog` | Dialog zatwierdzenia | `ApproveDialog.tsx` |
| `verification-approve-notes-input` | Textarea notatki (opcjonalna) | `ApproveDialog.tsx` |
| `verification-approve-confirm-btn` | Przycisk potwierdzenia zatwierdzenia | `ApproveDialog.tsx` |

#### Inline Editing Components (NEW)

| data-testid | Element | Plik |
|-------------|---------|------|
| `verification-details-panel` | Panel szczegółów ćwiczenia | `ExerciseDetailsPanel.tsx` |
| `verification-details-name` | Inline edit: Nazwa | `ExerciseDetailsPanel.tsx` |
| `verification-details-type` | Inline select: Typ | `ExerciseDetailsPanel.tsx` |
| `verification-details-side` | Inline select: Strona | `ExerciseDetailsPanel.tsx` |
| `verification-details-sets` | Clickable stat: Serie | `ExerciseDetailsPanel.tsx` |
| `verification-details-reps` | Clickable stat: Powtórzenia | `ExerciseDetailsPanel.tsx` |
| `verification-details-duration` | Clickable stat: Czas | `ExerciseDetailsPanel.tsx` |
| `verification-details-rest` | Inline edit: Przerwa | `ExerciseDetailsPanel.tsx` |
| `verification-details-tempo` | Inline edit: Tempo | `ExerciseDetailsPanel.tsx` |
| `verification-details-audiocue` | Inline edit: Audio cue | `ExerciseDetailsPanel.tsx` |
| `verification-details-media-toggle` | Toggle: Media | `ExerciseDetailsPanel.tsx` |
| `verification-details-advanced-toggle` | Toggle: Zaawansowane | `ExerciseDetailsPanel.tsx` |

#### Tag Smart Chips (NEW)

| data-testid | Element | Plik |
|-------------|---------|------|
| `verification-main-tags` | Tagi główne | `TagSmartChips.tsx` |
| `verification-main-tags-ai-btn` | Przycisk AI sugestii (główne) | `TagSmartChips.tsx` |
| `verification-main-tags-add-btn` | Dodaj tag (główne) | `TagSmartChips.tsx` |
| `verification-main-tags-remove-{tag}` | Usuń tag | `TagSmartChips.tsx` |
| `verification-main-tags-ghost-{tag}` | Ghost chip (AI sugestia) | `TagSmartChips.tsx` |
| `verification-additional-tags` | Tagi dodatkowe | `TagSmartChips.tsx` |
| `verification-additional-tags-ai-btn` | Przycisk AI sugestii (dodatkowe) | `TagSmartChips.tsx` |
| `verification-additional-tags-add-btn` | Dodaj tag (dodatkowe) | `TagSmartChips.tsx` |

#### Inline Description (NEW)

| data-testid | Element | Plik |
|-------------|---------|------|
| `verification-description` | Panel opisu | `InlineDescription.tsx` |
| `verification-description-textarea` | Textarea opisu | `InlineDescription.tsx` |
| `verification-description-ai-btn` | Przycisk AI rephrase | `InlineDescription.tsx` |
| `verification-description-ai-accept-btn` | Akceptuj sugestię AI | `InlineDescription.tsx` |
| `verification-description-ai-reject-btn` | Odrzuć sugestię AI | `InlineDescription.tsx` |
| `verification-description-save-btn` | Zapisz opis | `InlineDescription.tsx` |

#### Publish Guardrails (NEW)

| data-testid | Element | Plik |
|-------------|---------|------|
| `verification-guardrails` | Panel walidacji | `PublishGuardrails.tsx` |

#### Changes Summary (NEW)

| data-testid | Element | Plik |
|-------------|---------|------|
| `verification-changes-summary` | Historia zmian | `ChangesSummary.tsx` |

#### Sticky Footer V2 (NEW)

| data-testid | Element | Plik |
|-------------|---------|------|
| `verification-sticky-footer` | Sticky footer | `VerificationStickyFooterV2.tsx` |

#### Relationship Manager - Knowledge Graph (NEW)

| data-testid | Element | Plik |
|-------------|---------|------|
| `verification-relationships` | Panel relacji (Drabina Progresji) | `RelationshipManager.tsx` |
| `verification-relationships-regression-slot` | Slot regresji (łatwiejsze) | `RelationshipManager.tsx` |
| `verification-relationships-progression-slot` | Slot progresji (trudniejsze) | `RelationshipManager.tsx` |
| `verification-relationships-regression-slot-add-btn` | Dodaj regresję | `RelationSlot.tsx` |
| `verification-relationships-progression-slot-add-btn` | Dodaj progresję | `RelationSlot.tsx` |
| `verification-relationships-search-popover` | Popover wyszukiwania | `ExerciseSearchPopover.tsx` |
| `verification-relationships-search-input` | Input wyszukiwania | `ExerciseSearchPopover.tsx` |
| `verification-relationships-search-result-{id}` | Wynik wyszukiwania | `ExerciseSearchPopover.tsx` |
| `verification-relationships-ai-candidate-{id}` | Kandydat AI | `ExerciseSearchPopover.tsx` |

### 16. Wspólne komponenty (common-)

| data-testid | Element | Plik |
|-------------|---------|------|
| `common-confirm-dialog` | Dialog potwierdzenia | `ConfirmDialog.tsx` |
| `common-confirm-dialog-title` | Tytuł dialogu | `ConfirmDialog.tsx` |
| `common-confirm-dialog-confirm-btn` | Przycisk potwierdzenia | `ConfirmDialog.tsx` |
| `common-confirm-dialog-cancel-btn` | Przycisk anulowania | `ConfirmDialog.tsx` |
| `common-search-input` | Pole wyszukiwania | `SearchInput.tsx` |
| `common-search-clear-btn` | Wyczyść wyszukiwanie | `SearchInput.tsx` |
| `common-empty-state` | Stan pusty | `EmptyState.tsx` |
| `common-empty-state-action-btn` | Akcja stanu pustego | `EmptyState.tsx` |
| `common-table` | Tabela danych | `DataTable.tsx` |
| `common-table-row-{id}` | Wiersz tabeli | `DataTable.tsx` |
| `common-table-pagination-prev` | Poprzednia strona | `DataTable.tsx` |
| `common-table-pagination-next` | Następna strona | `DataTable.tsx` |
| `common-table-page-size` | Rozmiar strony | `DataTable.tsx` |
| `common-file-upload` | Upload pliku | `FileUpload.tsx` |
| `common-file-upload-input` | Input pliku | `FileUpload.tsx` |
| `common-feedback-btn` | Przycisk opinii | `FeedbackButton.tsx` |
| `common-feedback-dialog` | Dialog opinii | `FeedbackDialog.tsx` |
| `common-feedback-input` | Treść opinii | `FeedbackDialog.tsx` |
| `common-feedback-submit-btn` | Wyślij opinię | `FeedbackDialog.tsx` |
| `common-limit-warning` | Ostrzeżenie limitu | `LimitWarning.tsx` |
| `common-limit-reached-dialog` | Dialog limitu | `LimitReachedDialog.tsx` |
| `common-limit-reached-upgrade-btn` | Ulepsz plan | `LimitReachedDialog.tsx` |
| `common-stats-{type}` | Karta statystyk | `StatsCard.tsx` |
| `common-loading-state` | Stan ładowania | `LoadingState.tsx` |

---

## Usuwanie data-testid w produkcji

Atrybuty `data-testid` są automatycznie usuwane z buildu produkcyjnego dzięki konfiguracji w `next.config.ts`:

```typescript
const nextConfig: NextConfig = {
  compiler: {
    reactRemoveProperties:
      process.env.NODE_ENV === "production"
        ? { properties: ["^data-testid$"] }
        : false,
  },
};
```

---

## Dobre praktyki

1. **Dynamiczne ID** - Dla elementów list używaj wzorca `{prefix}-{id}`:
   ```tsx
   data-testid={`exercise-card-${exercise.id}`}
   ```

2. **Hierarchia** - Menu items powinny mieć prefix rodzica:
   ```tsx
   data-testid={`exercise-card-${id}-edit-btn`}
   ```

3. **Unikaj duplikatów** - Każdy `data-testid` powinien być unikalny na stronie

4. **Stabilność** - Używaj stabilnych identyfikatorów (ID z bazy), nie indeksów tablicy

---

## Rozszerzanie mapy

Przy dodawaniu nowych komponentów:

1. Użyj odpowiedniego prefiksu modułu
2. Dodaj `data-testid` do interaktywnych elementów
3. Zaktualizuj tę dokumentację
4. Sprawdź unikalność identyfikatorów
