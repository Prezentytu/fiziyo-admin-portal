# Funkcjonalności Fizjoterapeuty - Kompletny Opis dla Admin Portalu Webowego

## 🎯 Wprowadzenie

Ten dokument opisuje **wszystkie funkcjonalności dostępne dla fizjoterapeuty** w aplikacji mobilnej Fizjo. Admin portal webowy musi zapewnić **identyczne możliwości** poprzez interfejs webowy, korzystając z tego samego backendu GraphQL (.NET Core 9.0 + HotChocolate).

---

## 📋 Spis Treści

1. [Zarządzanie Pacjentami](#1-zarządzanie-pacjentami)
2. [Zarządzanie Ćwiczeniami](#2-zarządzanie-ćwiczeniami)
3. [Zarządzanie Zestawami Ćwiczeń](#3-zarządzanie-zestawami-ćwiczeń)
4. [Przypisywanie Zestawów do Pacjentów](#4-przypisywanie-zestawów-do-pacjentów)
5. [Harmonogram Wizyt](#5-harmonogram-wizyt)
6. [Raporty i Statystyki](#6-raporty-i-statystyki)
7. [Zarządzanie Organizacją](#7-zarządzanie-organizacją)
8. [Zarządzanie Gabinetami](#8-zarządzanie-gabinetami)
9. [Zarządzanie Zasobami](#9-zarządzanie-zasobami)
10. [Profil i Ustawienia](#10-profil-i-ustawienia)

---

## 1. Zarządzanie Pacjentami

### 1.1 Lista Pacjentów

**Funkcjonalność:** Wyświetlanie listy wszystkich pacjentów przypisanych do fizjoterapeuty.

**Szczegóły:**

- Lista pacjentów z podstawowymi informacjami (imię, nazwisko, email, telefon, adres)
- Wskaźnik "Shadow User" dla pacjentów bez konta (tymczasowi pacjenci)
- Filtrowanie: Wszyscy / Aktywni / Nieaktywni
- Wyszukiwanie po: imieniu, emailu, telefonie, adresie
- Sortowanie alfabetyczne
- Pull-to-refresh dla odświeżania danych
- Karty pacjentów z awatarem (inicjały) i statusem

**GraphQL Query:**

```graphql
GET_THERAPIST_PATIENTS_QUERY
- therapistId: String!
- organizationId: String!
- where: { therapistId: { eq: $therapistId }, organizationId: { eq: $organizationId }, status: { eq: "active" } }
```

**Zwracane dane:**

- `id`, `therapistId`, `patientId`, `organizationId`
- `assignedAt`, `status`, `notes`
- `contextType`, `contextLabel`, `contextColor`, `relationType`
- `startDate`, `endDate`
- `patient { id, clerkId, fullname, email, image, isShadowUser, organizationIds, personalData { firstName, lastName }, contactData { phone, address } }`
- `therapist { id, fullname }`

### 1.2 Dodawanie Nowego Pacjenta

**Funkcjonalność:** Tworzenie nowego pacjenta i automatyczne przypisanie do fizjoterapeuty.

**Szczegóły:**

- Formularz z polami: Imię i Nazwisko (wymagane), Email (opcjonalne), Telefon (opcjonalne)
- Wymagane: przynajmniej email LUB telefon
- Automatyczne tworzenie "Shadow User" jeśli pacjent nie ma konta
- Automatyczne przypisanie do fizjoterapeuty po utworzeniu

**GraphQL Mutation:**

```graphql
ASSIGN_PATIENT_TO_THERAPIST_MUTATION
- therapistId: String!
- patientId: String (opcjonalne - jeśli istnieje)
- organizationId: String!
- fullname: String!
- email: String (opcjonalne)
- phone: String (opcjonalne)
- notes: String (opcjonalne)
```

**Alternatywnie - Shadow User:**

```graphql
CREATE_SHADOW_USER_MUTATION
- fullname: String!
- email: String
- phone: String
- organizationId: String!
```

### 1.3 Przypisywanie Istniejących Pacjentów

**Funkcjonalność:** Przypisywanie pacjentów z organizacji do fizjoterapeuty.

**Szczegóły:**

- Modal z listą wszystkich pacjentów w organizacji
- Filtrowanie i wyszukiwanie pacjentów
- Multi-select (możliwość wyboru wielu pacjentów jednocześnie)
- Wyświetlanie już przypisanych pacjentów (disabled)
- Możliwość dodania notatek do przypisania

**GraphQL Mutation:**

```graphql
ASSIGN_PATIENTS_TO_THERAPIST_MUTATION
- therapistId: String!
- patientIds: [String!]!
- organizationId: String!
- notes: String (opcjonalne)
```

### 1.4 Szczegóły Pacjenta

**Funkcjonalność:** Wyświetlanie pełnych informacji o pacjencie.

**Szczegóły:**

- Profil pacjenta: imię, nazwisko, avatar (inicjały)
- Informacje kontaktowe: email (klikalny - mailto), telefon (klikalny - tel), adres
- Status: Aktywny / Nieaktywny (z wizualnym wskaźnikiem)
- Data przypisania do fizjoterapeuty
- Lista przypisanych zestawów ćwiczeń (z możliwością przejścia do szczegółów)
- Notatki (jeśli istnieją)
- Wskaźnik Shadow User (jeśli pacjent nie ma konta)

**Akcje dostępne:**

- **Raport aktywności** - przejście do raportu postępów pacjenta
- **Przypisz zestaw** - przypisanie nowego zestawu ćwiczeń
- **Aktywuj/Dezaktywuj** - zmiana statusu pacjenta
- **Odepnij od mojej listy** - usunięcie przypisania (pacjent pozostaje w organizacji)
- **Usuń z organizacji** - tylko dla Owner/Admin (całkowite usunięcie)

**GraphQL Queries:**

```graphql
GET_THERAPIST_PATIENTS_QUERY (filtrowanie po patientId)
GET_PATIENT_EXERCISE_SETS_QUERY (przypisane zestawy)
```

**GraphQL Mutations:**

```graphql
UPDATE_PATIENT_STATUS_MUTATION (aktywacja/dezaktywacja)
REMOVE_PATIENT_FROM_THERAPIST_MUTATION (odepnięcie)
REMOVE_MEMBER_MUTATION (usunięcie z organizacji - tylko Owner/Admin)
```

### 1.5 Edycja Statusu Pacjenta

**Funkcjonalność:** Zmiana statusu pacjenta (aktywny/nieaktywny).

**Szczegóły:**

- Potwierdzenie przed zmianą statusu
- Alert z informacją o powodzeniu/błędzie
- Automatyczne odświeżenie danych

**GraphQL Mutation:**

```graphql
UPDATE_PATIENT_STATUS_MUTATION
- therapistId: String!
- patientId: String!
- organizationId: String!
- status: "active" | "inactive"
```

---

## 2. Zarządzanie Ćwiczeniami

### 2.1 Biblioteka Ćwiczeń

**Funkcjonalność:** Przeglądanie i zarządzanie biblioteką ćwiczeń organizacji.

**Szczegóły:**

- Dwie zakładki: **Ćwiczenia** i **Tagi**
- Wyszukiwarka ćwiczeń (po nazwie, opisie)
- Filtrowanie po tagach (multi-select)
- Wyświetlanie popularnych tagów
- Aktywne tagi (możliwość usunięcia filtra)
- Kolejka ćwiczeń (dodawanie do kolejki przed utworzeniem zestawu)
- Podgląd wybranych ćwiczeń przed utworzeniem zestawu

**GraphQL Queries:**

```graphql
GET_EXERCISES_QUERY
GET_EXERCISES_WITH_FILTER_QUERY
GET_EXERCISE_TAGS_BY_ORGANIZATION_QUERY
GET_TAG_CATEGORIES_BY_ORGANIZATION_QUERY
```

### 2.2 Tworzenie Ćwiczenia

**Funkcjonalność:** Dodawanie nowego ćwiczenia do biblioteki organizacji.

**Szczegóły:**

- **Podstawowe informacje:**
  - Nazwa (wymagane)
  - Opis (wymagane)
  - Typ ćwiczenia: `reps` (powtórzeniowe) lub `time` (czasowe)
- **Parametry ćwiczenia:**
  - **Dla typu `reps`:**
    - Serie (sets) - wymagane
    - Powtórzenia (reps) - wymagane
    - Czas wykonania jednego powtórzenia (executionTime) - opcjonalne
  - **Dla typu `time`:**
    - Serie (sets) - wymagane
    - Powtórzenia (reps) - wymagane
    - Czas trwania jednego powtórzenia (duration) - wymagane (w sekundach)
- **Dodatkowe parametry (opcjonalne):**
  - Przerwa między seriami (restSets)
  - Przerwa między powtórzeniami (restReps)
  - Czas przygotowania (preparationTime)
  - Notatki (notes)
  - Strona ćwiczenia (exerciseSide): `left`, `right`, `both`, `none`
- **Multimedia:**
  - URL obrazka (imageUrl)
  - Tablica obrazków (images)
  - URL wideo (videoUrl)
  - URL GIF (gifUrl)
- **Tagi:**
  - Główne tagi (mainTags) - multi-select
  - Dodatkowe tagi (additionalTags) - multi-select
  - Możliwość tworzenia nowych tagów w trakcie
- **Zakres widoczności (scope):**
  - `PERSONAL` - tylko dla twórcy
  - `ORGANIZATION` - dla całej organizacji (domyślnie)
  - `GLOBAL` - publiczne (jeśli dozwolone)

**GraphQL Mutation:**

```graphql
CREATE_EXERCISE_MUTATION
- organizationId: String!
- scope: ExerciseScope! (PERSONAL | ORGANIZATION | GLOBAL)
- name: String!
- description: String!
- type: String! ("reps" | "time")
- sets: Decimal
- reps: Decimal
- duration: Decimal (tylko dla type="time")
- restSets: Decimal
- restReps: Decimal
- preparationTime: Decimal
- executionTime: Decimal
- videoUrl: String
- gifUrl: String
- imageUrl: String
- images: [String!]
- notes: String
- exerciseSetId: String (opcjonalne - jeśli dodawane do zestawu)
- isActive: Boolean
- exerciseSide: String
- mainTags: [String!]
- additionalTags: [String!]
```

### 2.3 Edycja Ćwiczenia

**Funkcjonalność:** Modyfikacja istniejącego ćwiczenia.

**Szczegóły:**

- Wszystkie pola jak przy tworzeniu
- Możliwość zmiany typu ćwiczenia
- Aktualizacja tagów
- Zmiana zakresu widoczności (jeśli dozwolone)

**GraphQL Mutation:**

```graphql
UPDATE_EXERCISE_MUTATION
- exerciseId: String!
- organizationId: String!
- (wszystkie pola jak w CREATE_EXERCISE_MUTATION)
```

### 2.4 Usuwanie Ćwiczenia

**Funkcjonalność:** Usunięcie ćwiczenia z biblioteki.

**Szczegóły:**

- Potwierdzenie przed usunięciem
- Sprawdzenie czy ćwiczenie nie jest używane w zestawach
- Soft delete (oznaczenie jako nieaktywne) lub hard delete

**GraphQL Mutation:**

```graphql
DELETE_EXERCISE_MUTATION
- exerciseId: String!
- organizationId: String!
```

### 2.5 Zarządzanie Tagami Ćwiczeń

**Funkcjonalność:** Tworzenie i zarządzanie tagami do kategoryzacji ćwiczeń.

**Szczegóły:**

- **Tworzenie tagu:**
  - Nazwa tagu (wymagane)
  - Kategoria tagu (opcjonalne - wybór z listy lub utworzenie nowej)
  - Kolor tagu (opcjonalne)
  - Opis (opcjonalne)
- **Kategorie tagów:**
  - Tworzenie kategorii (np. "Część ciała", "Poziom trudności", "Sprzęt")
  - Przypisywanie tagów do kategorii
  - Edycja i usuwanie kategorii

**GraphQL Mutations:**

```graphql
CREATE_EXERCISE_TAG_MUTATION
UPDATE_TAG_MUTATION
DELETE_TAG_MUTATION
CREATE_TAG_CATEGORY_MUTATION
UPDATE_TAG_CATEGORY_MUTATION
DELETE_TAG_CATEGORY_MUTATION
```

**GraphQL Queries:**

```graphql
GET_EXERCISE_TAGS_BY_ORGANIZATION_QUERY
GET_TAG_CATEGORIES_BY_ORGANIZATION_QUERY
```

---

## 3. Zarządzanie Zestawami Ćwiczeń

### 3.1 Lista Zestawów Ćwiczeń

**Funkcjonalność:** Przeglądanie wszystkich zestawów ćwiczeń w organizacji.

**Szczegóły:**

- Lista zestawów z podstawowymi informacjami
- Miniaturki ćwiczeń (stos 3 obrazków)
- Liczba ćwiczeń w zestawie
- Liczba przypisań do pacjentów
- Filtrowanie: Wszystkie / Przypisane / Nieprzypisane
- Wyszukiwanie po nazwie zestawu
- Sortowanie: najnowsze na górze

**GraphQL Query:**

```graphql
GET_EXERCISE_SETS_QUERY
GET_ORGANIZATION_EXERCISE_SETS_QUERY
- organizationId: String!
```

**Zwracane dane:**

- `id`, `name`, `description`
- `organizationId`, `createdById`
- `_creationTime`, `updatedAt`
- `exerciseMappings` (z relacjami do ćwiczeń)
- `exerciseCount` (obliczane)
- `assignmentCount` (obliczane)

### 3.2 Tworzenie Zestawu Ćwiczeń

**Funkcjonalność:** Tworzenie nowego zestawu ćwiczeń.

**Szczegóły:**

- **Podstawowe informacje:**
  - Nazwa zestawu (wymagane)
  - Opis (opcjonalne)
- **Dodawanie ćwiczeń:**
  - Wybór z biblioteki ćwiczeń (multi-select)
  - Możliwość dodania ćwiczeń z kolejki (jeśli były wybrane wcześniej)
  - Kolejność ćwiczeń (order) - możliwość zmiany kolejności
  - Dla każdego ćwiczenia można ustawić:
    - Custom name (nazwa dla tego zestawu)
    - Custom description (opis dla tego zestawu)
    - Override parametrów (sets, reps, duration) - opcjonalne
- **Zapisywanie:**
  - Automatyczne tworzenie ExerciseSetMappings dla każdego ćwiczenia
  - Ustawienie kolejności (order)
  - Opcjonalne przypisanie do pacjenta od razu

**GraphQL Mutation:**

```graphql
CREATE_EXERCISE_SET_MUTATION
- organizationId: String!
- name: String!
- description: String
- exerciseMappings: [ExerciseMappingInput!]!
  - exerciseId: String!
  - order: Int!
  - customName: String (opcjonalne)
  - customDescription: String (opcjonalne)
  - sets: Decimal (opcjonalne - override)
  - reps: Decimal (opcjonalne - override)
  - duration: Decimal (opcjonalne - override)
```

### 3.3 Szczegóły Zestawu Ćwiczeń

**Funkcjonalność:** Wyświetlanie i edycja szczegółów zestawu.

**Szczegóły:**

- Nagłówek zestawu: nazwa, opis, miniaturka
- Lista ćwiczeń w zestawie (z kolejnością)
- Dla każdego ćwiczenia:
  - Miniaturka obrazka
  - Nazwa (custom lub oryginalna)
  - Parametry (sets × reps lub sets × duration)
  - Wskaźnik customizacji (jeśli ma override)
- Możliwość edycji każdego ćwiczenia
- Możliwość usunięcia ćwiczenia z zestawu
- Możliwość dodania nowego ćwiczenia
- Możliwość zmiany kolejności (drag & drop)

**GraphQL Query:**

```graphql
GET_EXERCISE_SET_BY_ID_QUERY
GET_EXERCISE_SET_MAPPINGS_BY_SET_QUERY
```

**GraphQL Mutations:**

```graphql
UPDATE_EXERCISE_SET_MUTATION
UPDATE_EXERCISE_IN_SET_MUTATION
REMOVE_EXERCISE_FROM_SET_MUTATION
```

### 3.4 Edycja Zestawu Ćwiczeń

**Funkcjonalność:** Modyfikacja istniejącego zestawu.

**Szczegóły:**

- Zmiana nazwy i opisu
- Dodawanie ćwiczeń
- Usuwanie ćwiczeń
- Zmiana kolejności ćwiczeń
- Edycja parametrów ćwiczeń w zestawie (override)

**GraphQL Mutations:**

```graphql
UPDATE_EXERCISE_SET_MUTATION
UPDATE_EXERCISE_IN_SET_MUTATION
REMOVE_EXERCISE_FROM_SET_MUTATION
```

### 3.5 Duplikowanie Zestawu

**Funkcjonalność:** Tworzenie kopii istniejącego zestawu.

**Szczegóły:**

- Kopiowanie wszystkich ćwiczeń
- Kopiowanie parametrów override
- Nowa nazwa (domyślnie: "Kopia [nazwa]")
- Możliwość edycji przed zapisaniem

**GraphQL Mutation:**

```graphql
DUPLICATE_EXERCISE_SET_MUTATION
- exerciseSetId: String!
- organizationId: String!
- newName: String!
```

### 3.6 Usuwanie Zestawu

**Funkcjonalność:** Usunięcie zestawu ćwiczeń.

**Szczegóły:**

- Potwierdzenie przed usunięciem
- Sprawdzenie czy zestaw nie jest przypisany do pacjentów
- Ostrzeżenie jeśli są aktywne przypisania

**GraphQL Mutation:**

```graphql
DELETE_EXERCISE_SET_MUTATION
- exerciseSetId: String!
- organizationId: String!
```

---

## 4. Przypisywanie Zestawów do Pacjentów

### 4.1 Przypisanie Zestawu do Pacjenta

**Funkcjonalność:** Przypisanie zestawu ćwiczeń do pacjenta z określeniem harmonogramu.

**Szczegóły:**

- **Wybór zestawu:**
  - Lista dostępnych zestawów w organizacji
  - Wyszukiwanie zestawów
  - Podgląd ćwiczeń w zestawie
- **Harmonogram (Frequency):**

  - **Okres:**
    - Data rozpoczęcia (startDate)
    - Data zakończenia (endDate) - opcjonalne
  - **Częstotliwość:**
    - Razy dziennie (timesPerDay) - domyślnie 1
    - Przerwa między wykonaniami (breakBetweenSets) - w godzinach
  - **Dni tygodnia:**
    - Poniedziałek (monday) - boolean
    - Wtorek (tuesday) - boolean
    - Środa (wednesday) - boolean
    - Czwartek (thursday) - boolean
    - Piątek (friday) - boolean
    - Sobota (saturday) - boolean
    - Niedziela (sunday) - boolean

- **Dodatkowe opcje:**
  - Notatki dla pacjenta (opcjonalne)
  - Kontekst przypisania (contextType): PRIMARY, SECONDARY, CONSULTATION, FOLLOWUP

**GraphQL Mutation:**

```graphql
ASSIGN_EXERCISE_SET_TO_CLIENT_MUTATION
- exerciseSetId: String!
- userId: String! (patientId)
- organizationId: String!
- assignedById: String! (therapistId)
- startDate: DateTime!
- endDate: DateTime (opcjonalne)
- frequency: FrequencyInput!
  - timesPerDay: Int!
  - breakBetweenSets: Decimal! (w godzinach)
  - monday: Boolean!
  - tuesday: Boolean!
  - wednesday: Boolean!
  - thursday: Boolean!
  - friday: Boolean!
  - saturday: Boolean!
  - sunday: Boolean!
- notes: String (opcjonalne)
- contextType: AssignmentContextType (opcjonalne)
```

### 4.2 Szczegóły Przypisania

**Funkcjonalność:** Wyświetlanie i edycja szczegółów przypisania zestawu do pacjenta.

**Szczegóły:**

- **Nagłówek:**
  - Nazwa zestawu
  - Opis zestawu
  - Status przypisania (Aktywne, W trakcie, Wstrzymane, Zakończone, Nieaktywne)
- **Sekcja "Dla pacjenta":**
  - Imię i nazwisko pacjenta
  - Data przypisania
  - Kto przypisał (fizjoterapeuta)
- **Sekcja "Harmonogram":**
  - Okres (startDate - endDate)
  - Razy dziennie
  - Przerwa między wykonaniami
  - Dni tygodnia (wizualne oznaczenie aktywnych dni)
  - Możliwość edycji harmonogramu
- **Sekcja "Statystyki":**
  - Liczba wykonanych sesji (completionCount)
  - Data ostatniego wykonania (lastCompletedAt)
- **Sekcja "Ćwiczenia":**
  - Lista wszystkich ćwiczeń w zestawie
  - Dla każdego ćwiczenia:
    - Miniaturka obrazka
    - Nazwa (custom lub oryginalna)
    - Parametry (sets × reps lub sets × duration)
    - Wskaźnik customizacji (jeśli ma override per-pacjent)
    - Wskaźnik ukrycia (jeśli ćwiczenie jest ukryte dla pacjenta)
    - Wskaźnik dodatkowego ćwiczenia (jeśli dodane tylko dla tego pacjenta)
  - Możliwość edycji parametrów ćwiczenia per-pacjent
  - Możliwość ukrycia/pokazania ćwiczenia dla pacjenta
  - Możliwość dodania dodatkowego ćwiczenia tylko dla tego pacjenta
  - Możliwość usunięcia ćwiczenia z przypisania

**GraphQL Query:**

```graphql
GET_CLIENT_ASSIGNMENT_BY_ID_QUERY
GET_PATIENT_ASSIGNMENT_DETAILS_QUERY
- assignmentId: String!
```

**Zwracane dane:**

- `id`, `exerciseSetId`, `userId`, `organizationId`
- `assignedById`, `assignedAt`
- `startDate`, `endDate`
- `status`, `completionCount`, `lastCompletedAt`
- `frequency` (pełny obiekt)
- `exerciseOverrides` (JSON z override'ami per-pacjent)
- `exerciseSet` (pełny obiekt z exerciseMappings)
- `patient` (podstawowe dane)
- `therapist` (podstawowe dane)

### 4.3 Edycja Harmonogramu Przypisania

**Funkcjonalność:** Zmiana harmonogramu przypisanego zestawu.

**Szczegóły:**

- Edycja daty rozpoczęcia i zakończenia
- Zmiana częstotliwości (razy dziennie, przerwa)
- Zmiana aktywnych dni tygodnia
- Automatyczne odświeżenie danych

**GraphQL Mutation:**

```graphql
UPDATE_EXERCISE_SET_FREQUENCY_MUTATION
- assignmentId: String!
- startDate: DateTime!
- endDate: DateTime (opcjonalne)
- frequency: FrequencyInput!
```

### 4.4 Edycja Parametrów Ćwiczenia Per-Pacjent

**Funkcjonalność:** Dostosowanie parametrów ćwiczenia dla konkretnego pacjenta.

**Szczegóły:**

- Override parametrów ćwiczenia:
  - Custom name (nazwa dla tego pacjenta)
  - Custom description (opis dla tego pacjenta)
  - Sets (liczba serii)
  - Reps (liczba powtórzeń)
  - Duration (czas trwania - tylko dla type="time")
- Zapis override'ów w `exerciseOverrides` JSON
- Wskaźnik wizualny customizacji (kropka obok nazwy)

**GraphQL Mutation:**

```graphql
UPDATE_PATIENT_EXERCISE_OVERRIDE_MUTATION
- assignmentId: String!
- exerciseMappingId: String!
- exerciseOverrides: JSON! (zaktualizowany)
```

### 4.5 Ukrywanie/Pokazywanie Ćwiczeń

**Funkcjonalność:** Ukrycie ćwiczenia dla pacjenta bez usuwania z zestawu.

**Szczegóły:**

- Soft delete - ćwiczenie pozostaje w zestawie, ale jest ukryte dla pacjenta
- Możliwość przywrócenia (pokazania) ćwiczenia
- Wizualny wskaźnik ukrycia (przekreślona nazwa, ikona eye-off)
- Dla ćwiczeń bazowych: ukrycie (można przywrócić)
- Dla ćwiczeń dodatkowych: permanentne usunięcie

**GraphQL Mutations:**

```graphql
HIDE_EXERCISE_FOR_PATIENT_MUTATION (soft delete)
SHOW_EXERCISE_FOR_PATIENT_MUTATION (przywrócenie)
REMOVE_ADDITIONAL_EXERCISE_MUTATION (hard delete dla dodatkowych)
```

### 4.6 Dodawanie Ćwiczeń do Przypisania

**Funkcjonalność:** Dodanie dodatkowego ćwiczenia tylko dla konkretnego pacjenta.

**Szczegóły:**

- Wybór ćwiczenia z biblioteki organizacji
- Ustawienie parametrów (sets, reps, duration)
- Custom name i description
- Ćwiczenie dodawane tylko do tego przypisania (nie do bazowego zestawu)
- Wskaźnik "dodatkowe ćwiczenie" (badge "+")

**GraphQL Mutation:**

```graphql
ADD_EXERCISE_TO_ASSIGNMENT_MUTATION
- assignmentId: String!
- exerciseId: String!
- exerciseOverrides: JSON! (zaktualizowany z nowym ćwiczeniem)
- order: Int!
- customName: String (opcjonalne)
- customDescription: String (opcjonalne)
- sets: Decimal
- reps: Decimal
- duration: Decimal
```

### 4.7 Usuwanie Przypisania

**Funkcjonalność:** Usunięcie przypisania zestawu do pacjenta.

**Szczegóły:**

- Potwierdzenie przed usunięciem
- Usunięcie wszystkich override'ów i dodatkowych ćwiczeń
- Pacjent traci dostęp do zestawu

**GraphQL Mutation:**

```graphql
REMOVE_EXERCISE_SET_ASSIGNMENT_MUTATION
- assignmentId: String!
- organizationId: String!
```

---

## 5. Harmonogram Wizyt

### 5.1 Kalendarz Wizyt

**Funkcjonalność:** Wyświetlanie harmonogramu wizyt fizjoterapeuty.

**Szczegóły:**

- Widok kalendarza (miesiąc)
- Oznaczenie dat z wizytami (kropki)
- Wybór daty - wyświetlenie wizyt na dany dzień
- Lista wizyt na wybrany dzień:
  - Godzina wizyty
  - Pacjent (imię, nazwisko)
  - Gabinet (jeśli przypisany)
  - Status wizyty
  - Czas trwania
- Możliwość przejścia do szczegółów wizyty
- Możliwość dodania nowej wizyty

**GraphQL Queries:**

```graphql
GET_THERAPIST_APPOINTMENTS_QUERY
GET_APPOINTMENTS_BY_DATE_RANGE_QUERY
- therapistId: String!
- organizationId: String!
- startDate: DateTime!
- endDate: DateTime!
```

### 5.2 Tworzenie Wizyty

**Funkcjonalność:** Dodawanie nowej wizyty do kalendarza.

**Szczegóły:**

- **Podstawowe informacje:**
  - Pacjent (wybór z listy przypisanych pacjentów)
  - Data i godzina wizyty
  - Czas trwania (w minutach)
  - Gabinet (wybór z listy gabinetów organizacji - opcjonalne)
- **Dodatkowe informacje:**
  - Tytuł wizyty (opcjonalne)
  - Opis/Notatki (opcjonalne)
  - Status (domyślnie: "scheduled")
- **Powiadomienia:**
  - Automatyczne powiadomienie pacjenta (jeśli ma konto)

**GraphQL Mutation:**

```graphql
CREATE_APPOINTMENT_MUTATION
- therapistId: String!
- patientId: String!
- organizationId: String!
- clinicId: String (opcjonalne)
- date: DateTime!
- duration: Int! (w minutach)
- status: String! ("scheduled" | "confirmed" | "completed" | "cancelled")
- title: String (opcjonalne)
- description: String (opcjonalne)
```

### 5.3 Szczegóły Wizyty

**Funkcjonalność:** Wyświetlanie i edycja szczegółów wizyty.

**Szczegóły:**

- Informacje o pacjencie
- Data i godzina wizyty
- Czas trwania
- Gabinet (jeśli przypisany)
- Status wizyty
- Tytuł i opis
- Możliwość edycji
- Możliwość zmiany terminu (przeniesienie)
- Możliwość anulowania
- Możliwość oznaczenia jako zakończonej

**GraphQL Query:**

```graphql
GET_APPOINTMENT_BY_ID_QUERY
- appointmentId: String!
```

**GraphQL Mutations:**

```graphql
RESCHEDULE_APPOINTMENT_MUTATION (zmiana terminu)
UPDATE_APPOINTMENT_STATUS_MUTATION (zmiana statusu)
CANCEL_APPOINTMENT_MUTATION (anulowanie)
COMPLETE_APPOINTMENT_MUTATION (zakończenie)
```

### 5.4 Prośby o Wizyty

**Funkcjonalność:** Zarządzanie prośbami o wizyty od pacjentów.

**Szczegóły:**

- Lista próśb o wizyty (status: "pending")
- Dla każdej prośby:
  - Pacjent (imię, nazwisko)
  - Proponowana data i godzina
  - Czas trwania
  - Notatki od pacjenta
- Akcje:
  - **Potwierdzenie** - akceptacja prośby (z możliwością dodania notatek)
  - **Odrzucenie** - odrzucenie prośby (z możliwością podania powodu)
  - **Edycja terminu** - zmiana daty/godziny przed potwierdzeniem

**GraphQL Queries:**

```graphql
GET_APPOINTMENT_REQUESTS_QUERY
- organizationId: String!
- therapistId: String!
- status: "pending"
```

**GraphQL Mutations:**

```graphql
CONFIRM_APPOINTMENT_MUTATION
- appointmentId: String!
- notes: String (opcjonalne)

REJECT_APPOINTMENT_MUTATION
- appointmentId: String!
- reason: String (opcjonalne)
```

---

## 6. Raporty i Statystyki

### 6.1 Raport Aktywności Pacjenta

**Funkcjonalność:** Wyświetlanie szczegółowych raportów aktywności pacjenta.

**Szczegóły:**

- **Filtry:**
  - Okres: Wszystkie / Ostatni miesiąc / Ostatnie 3 miesiące / Ostatnie 6 miesięcy
- **Zakładki:**
  - **Podsumowanie:**
    - KPI: Łączna liczba wykonanych ćwiczeń, Średnia tygodniowa, Najdłuższa seria
    - Trend aktywności (wykres liniowy)
    - Statystyki miesięczne (wykres słupkowy)
  - **Zestawy:**
    - Lista przypisanych zestawów
    - Dla każdego zestawu:
      - Nazwa zestawu
      - Liczba wykonanych sesji
      - Ostatnie wykonanie
      - Procent ukończenia
      - Możliwość przejścia do szczegółów
  - **Ćwiczenia:**
    - Lista wszystkich ćwiczeń z przypisanych zestawów
    - Dla każdego ćwiczenia:
      - Nazwa ćwiczenia
      - Liczba wykonanych powtórzeń/sesji
      - Średnia liczba serii
      - Ostatnie wykonanie
  - **Trendy:**
    - Wykres aktywności w czasie
    - Analiza regularności
    - Identyfikacja trendów (wzrost/spadek)

**GraphQL Query:**

```graphql
GET_PATIENT_ACTIVITY_REPORT_QUERY
- patientId: String!
- organizationId: String!
- periodStart: DateTime (opcjonalne)
- periodEnd: DateTime (opcjonalne)
```

**Zwracane dane:**

- `totalCompletedExercises` - łączna liczba wykonanych ćwiczeń
- `averageWeeklyCompletions` - średnia tygodniowa
- `longestStreak` - najdłuższa seria
- `monthlyStats` - statystyki miesięczne (array)
- `exerciseSetStats` - statystyki per zestaw
- `exerciseStats` - statystyki per ćwiczenie
- `trendData` - dane do wykresów

**UWAGA:** Ta funkcjonalność jest obecnie w budowie w aplikacji mobilnej. Backend GraphQL może wymagać implementacji.

---

## 7. Zarządzanie Organizacją

### 7.1 Przegląd Organizacji

**Funkcjonalność:** Wyświetlanie informacji o organizacji fizjoterapeuty.

**Szczegóły:**

- Logo organizacji (możliwość edycji dla Owner/Admin)
- Nazwa organizacji (możliwość edycji dla Owner/Admin)
- Status organizacji (Aktywna)
- Data utworzenia
- Opis organizacji (jeśli istnieje)
- Rola użytkownika w organizacji (Owner, Admin, Therapist, Staff)

**GraphQL Query:**

```graphql
GET_ORGANIZATION_BY_ID_QUERY
GET_USER_ORGANIZATIONS_QUERY (role użytkownika)
```

### 7.2 Zarządzanie Personel

**Funkcjonalność:** Zarządzanie użytkownikami personelu organizacji.

**Szczegóły:**

- **Lista personelu:**
  - Filtry: Wszyscy / Fizjoterapeuci / Administratorzy / Właściciele
  - Dla każdego użytkownika:
    - Imię i nazwisko
    - Email
    - Rola (Owner, Admin, Therapist, Staff)
    - Status (Aktywny/Nieaktywny)
    - Data dołączenia
- **Dodawanie użytkownika:**
  - Wyszukiwanie po emailu (jeśli użytkownik ma konto)
  - Dodanie bezpośrednie po userId
  - Przypisanie roli (Therapist, Staff, Admin)
- **Edycja roli:**
  - Zmiana roli użytkownika (tylko Owner/Admin)
  - Dostępne role: Therapist, Staff, Admin
- **Usuwanie użytkownika:**
  - Usunięcie z organizacji (tylko Owner/Admin)
  - Potwierdzenie przed usunięciem

**GraphQL Queries:**

```graphql
GET_ORGANIZATION_MEMBERS_QUERY
- organizationId: String!
```

**GraphQL Mutations:**

```graphql
ADD_MEMBER_MUTATION (po emailu)
ADD_DIRECT_MEMBER_MUTATION (po userId)
UPDATE_MEMBER_ROLE_MUTATION
REMOVE_MEMBER_MUTATION
```

### 7.3 Zarządzanie Pacjentami Organizacji

**Funkcjonalność:** Przeglądanie wszystkich pacjentów w organizacji.

**Szczegóły:**

- Lista wszystkich pacjentów w organizacji
- Filtrowanie i wyszukiwanie
- Możliwość przypisania do fizjoterapeuty
- Możliwość usunięcia z organizacji (tylko Owner/Admin)

**GraphQL Query:**

```graphql
GET_ORGANIZATION_MEMBERS_QUERY (filtrowanie po role="patient")
```

### 7.4 Edycja Informacji Organizacji

**Funkcjonalność:** Modyfikacja danych organizacji (tylko Owner/Admin).

**Szczegóły:**

- Zmiana nazwy organizacji
- Zmiana logo organizacji (upload obrazka)
- Zmiana opisu organizacji
- Usunięcie logo

**GraphQL Mutations:**

```graphql
UPDATE_ORGANIZATION_NAME_MUTATION
UPDATE_ORGANIZATION_LOGO_MUTATION
REMOVE_ORGANIZATION_LOGO_MUTATION
```

---

## 8. Zarządzanie Gabinetami

### 8.1 Lista Gabinetów

**Funkcjonalność:** Przeglądanie gabinetów w organizacji.

**Szczegóły:**

- Lista wszystkich gabinetów
- Dla każdego gabinetu:
  - Nazwa gabinetu
  - Adres
  - Liczba przypisanych pacjentów
  - Status (Aktywny/Nieaktywny)
- Możliwość dodania nowego gabinetu
- Możliwość edycji/usunięcia gabinetu (tylko Owner/Admin)

**GraphQL Query:**

```graphql
GET_ORGANIZATION_CLINICS_QUERY
- organizationId: String!
```

### 8.2 Tworzenie Gabinetu

**Funkcjonalność:** Dodawanie nowego gabinetu do organizacji.

**Szczegóły:**

- Nazwa gabinetu (wymagane)
- Adres (wymagane)
- Opis (opcjonalne)
- Status (domyślnie: aktywny)

**GraphQL Mutation:**

```graphql
CREATE_CLINIC_MUTATION
- organizationId: String!
- name: String!
- address: String!
- description: String (opcjonalne)
- isActive: Boolean
```

### 8.3 Przypisywanie Pacjentów do Gabinetu

**Funkcjonalność:** Przypisanie pacjentów do konkretnego gabinetu.

**Szczegóły:**

- Wybór gabinetu
- Multi-select pacjentów z organizacji
- Automatyczne przypisanie

**GraphQL Mutation:**

```graphql
ASSIGN_CLIENTS_TO_CLINIC_MUTATION
- clinicId: String!
- patientIds: [String!]!
- organizationId: String!
```

### 8.4 Edycja i Usuwanie Gabinetu

**Funkcjonalność:** Modyfikacja i usuwanie gabinetu.

**Szczegóły:**

- Edycja nazwy, adresu, opisu
- Zmiana statusu (aktywny/nieaktywny)
- Usunięcie gabinetu (z sprawdzeniem przypisanych pacjentów)

**GraphQL Mutations:**

```graphql
UPDATE_CLINIC_MUTATION
DELETE_CLINIC_MUTATION
```

---

## 9. Zarządzanie Zasobami

### 9.1 Import/Export Ćwiczeń

**Funkcjonalność:** Masowy import i export ćwiczeń do/z pliku CSV.

**Szczegóły:**

- **Export do CSV:**
  - Eksport wszystkich ćwiczeń organizacji
  - Format CSV z wszystkimi polami
  - Możliwość udostępnienia pliku
- **Import z CSV:**
  - Wybór pliku CSV
  - Walidacja formatu
  - Import ćwiczeń z automatycznym tworzeniem tagów
  - Raport z importu (sukcesy/błędy)

**GraphQL Query:**

```graphql
EXPORT_EXERCISES_TO_CSV_QUERY
- organizationId: String!
```

**GraphQL Mutation:**

```graphql
IMPORT_EXERCISES_FROM_CSV_MUTATION
- organizationId: String!
- csvData: String!
```

### 9.2 Import Przykładowych Zestawów

**Funkcjonalność:** Import gotowych przykładowych zestawów ćwiczeń.

**Szczegóły:**

- Kolekcja przykładowych zestawów ćwiczeń
- Automatyczne tworzenie ćwiczeń i zestawów
- Automatyczne tworzenie tagów i kategorii
- Jednorazowy import (flaga w SecureStore)

**GraphQL Mutation:**

```graphql
CREATE_EXAMPLE_EXERCISE_SETS_MUTATION
- organizationId: String!
```

### 9.3 Czyszczenie Danych

**Funkcjonalność:** Usunięcie wszystkich ćwiczeń i zestawów organizacji.

**Szczegóły:**

- Potwierdzenie przed usunięciem (podwójne)
- Usunięcie wszystkich ćwiczeń
- Usunięcie wszystkich zestawów
- Usunięcie wszystkich tagów i kategorii
- **UWAGA:** Nie usuwa przypisań do pacjentów (tylko ćwiczenia i zestawy)

**GraphQL Mutation:**

```graphql
CLEAR_ALL_DATA_MUTATION
- organizationId: String!
```

---

## 10. Profil i Ustawienia

### 10.1 Profil Użytkownika

**Funkcjonalność:** Wyświetlanie i edycja profilu fizjoterapeuty.

**Szczegóły:**

- Imię i nazwisko
- Email
- Avatar (obrazek profilowy)
- Telefon (opcjonalne)
- Adres (opcjonalne)
- Data rejestracji
- Organizacje (lista organizacji użytkownika)

**GraphQL Query:**

```graphql
GET_USER_BY_ID_QUERY
GET_USER_BY_CLERK_ID_QUERY
```

**GraphQL Mutation:**

```graphql
UPDATE_USER_PROFILE_MUTATION
UPDATE_USER_MUTATION
```

### 10.2 Subskrypcja

**Funkcjonalność:** Zarządzanie subskrypcją (jeśli dostępne).

**Szczegóły:**

- Informacje o aktualnej subskrypcji
- Plan subskrypcji
- Data wygaśnięcia
- Możliwość przedłużenia/zmiany planu

**UWAGA:** Szczegóły zależą od implementacji systemu płatności.

---

## 🔐 Autoryzacja i Uprawnienia

### Role w Organizacji

1. **Owner (Właściciel):**

   - Wszystkie uprawnienia Admin
   - Usuwanie organizacji
   - Zmiana właściciela

2. **Admin (Administrator):**

   - Zarządzanie personel
   - Zarządzanie pacjentami organizacji
   - Zarządzanie gabinetami
   - Edycja informacji organizacji
   - Usuwanie członków z organizacji

3. **Therapist (Fizjoterapeuta):**

   - Zarządzanie własnymi pacjentami
   - Tworzenie i edycja ćwiczeń
   - Tworzenie i edycja zestawów
   - Przypisywanie zestawów do pacjentów
   - Zarządzanie harmonogramem wizyt
   - Przeglądanie raportów

4. **Staff (Personel):**
   - Ograniczone uprawnienia (zależne od implementacji)

### Sprawdzanie Uprawnień

**GraphQL Query:**

```graphql
GET_USER_ORGANIZATIONS_QUERY
- Zwraca: organizationId, organizationName, role, joinedAt
- Role: OWNER, ADMIN, THERAPIST, STAFF
```

---

## 📊 Ważne Uwagi Techniczne

### Shadow Users

- Pacjenci mogą być tworzeni jako "Shadow Users" (bez konta Clerk)
- Shadow User ma rekord w `OrganizationMembers` ale nie w `Users`
- Po rejestracji pacjenta webhook Clerk automatycznie "aktywuje" shadow usera
- Fizjoterapeuta może przypisywać zestawy do shadow userów
- Wszystkie przypisania działają automatycznie po aktywacji

### Exercise Overrides

- Każde przypisanie zestawu do pacjenta ma pole `exerciseOverrides` (JSON)
- Override'y pozwalają na:
  - Custom name i description per-pacjent
  - Override parametrów (sets, reps, duration)
  - Ukrycie ćwiczenia (hidden)
  - Dodanie dodatkowych ćwiczeń tylko dla tego pacjenta
- Override'y są zapisywane jako JSON w `ClientAssignment.exerciseOverrides`

### Frequency (Harmonogram)

- `timesPerDay` - ile razy dziennie pacjent powinien wykonać zestaw
- `breakBetweenSets` - przerwa między wykonaniami (w godzinach)
- Dni tygodnia - boolean dla każdego dnia
- `startDate` i `endDate` - okres obowiązywania harmonogramu

### Exercise Types

- **`reps` (powtórzeniowe):**

  - Wymagane: `sets`, `reps`
  - Opcjonalne: `executionTime`
  - Czas całkowity: `sets × reps × executionTime`

- **`time` (czasowe):**
  - Wymagane: `sets`, `reps`, `duration`
  - Czas całkowity: `sets × reps × duration`
  - Przykład: "utrzymaj pozycję 30s, powtórz 3 razy, zrób 2 serie" = 2 × 3 × 30s = 180s

---

## 🎨 UI/UX Wskazówki

### Wspólne Wzorce

1. **Loading States:**

   - ActivityIndicator podczas ładowania danych
   - Skeleton screens dla lepszego UX

2. **Empty States:**

   - Ikona + komunikat
   - Call-to-action (np. "Dodaj pierwszego pacjenta")

3. **Error Handling:**

   - Alert z komunikatem błędu
   - Możliwość ponowienia akcji

4. **Confirmation Dialogs:**

   - Potwierdzenie przed destrukcyjnymi akcjami
   - Wyraźne komunikaty (np. "Ta akcja jest nieodwracalna")

5. **Search & Filter:**

   - Wyszukiwarka z animacją pokazywania/ukrywania
   - Filtry jako chips/tabs
   - Clear filters button

6. **Navigation:**
   - Breadcrumbs dla głębokich ścieżek
   - Back button z kontekstem (np. "Wróć do pacjentów")

---

## 📝 Checklist Implementacji

### Dla każdej funkcjonalności sprawdź:

- [ ] GraphQL Query/Mutation jest dostępne w backendzie
- [ ] Autoryzacja działa poprawnie (@authorize directive)
- [ ] Error handling jest zaimplementowany
- [ ] Loading states są obsłużone
- [ ] Empty states są zaimplementowane
- [ ] Walidacja danych wejściowych
- [ ] Potwierdzenia dla destrukcyjnych akcji
- [ ] Odświeżanie danych po mutacjach
- [ ] Responsywność (mobile + desktop)
- [ ] Accessibility (a11y)

---

## 🔗 Przydatne Linki

- **Backend GraphQL:** `.NET Core 9.0 + HotChocolate`
- **Frontend Mobile:** `React Native + Expo + Apollo Client`
- **Authentication:** `Clerk → Token Exchange → Own JWT`
- **Database:** `PostgreSQL + Entity Framework Core`

---

**Ostatnia aktualizacja:** 2025-01-XX
**Wersja dokumentu:** 1.0
