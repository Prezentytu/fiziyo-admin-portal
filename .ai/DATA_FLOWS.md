# DATA_FLOWS.md — Kluczowe flow biznesowe FiziYo

Diagramy i opisy głównych przepływów danych. Czytaj gdy implementujesz lub modyfikujesz funkcjonalność obejmującą wiele warstw systemu.

---

## 1. Autentykacja (Token Exchange)

```
 Panel / Mobile                  Backend (.NET)               Clerk
 ─────────────                  ──────────────               ─────
       │                              │                        │
       │──── Logowanie UI ──────────────────────────────────→  │
       │                              │                        │
       │  ←─── Clerk JWT ─────────────────────────────────── │
       │                              │                        │
       │──── POST /api/auth/exchange ─→│                        │
       │     (Clerk JWT w body)       │                        │
       │                              │── Walidacja Clerk JWT  │
       │                              │   (OpenID Discovery)   │
       │                              │                        │
       │                              │── Szukanie User w DB   │
       │                              │── Pobranie org + role  │
       │                              │── Generowanie JWT      │
       │                              │   (sub, email,         │
       │                              │    organization_id,    │
       │                              │    role, clerk_id)     │
       │                              │                        │
       │  ←─── Backend JWT ──────────│                        │
       │                              │                        │
       │  Cache: sessionStorage (web) │                        │
       │         SecureStore (mobile)  │                        │
       │  TTL: 10h, auto-refresh      │                        │
```

**Pliki:**

- Admin: `src/graphql/providers/BackendAuthTokenProvider.ts`, `src/services/tokenExchangeService.ts`
- Mobile: `src/graphql/providers/BackendAuthTokenProvider.ts`, `src/services/tokenExchangeService.ts`
- Backend: `Services/TokenExchangeService.cs`

**Pułapki:**

- Zmiana organizacji = nowy token (cache invalidation)
- Race condition protection: tylko jedno wymiana na raz
- 5-minutowy bufor przed wygaśnięciem = auto-refresh

---

## 2. Tworzenie i przypisywanie ćwiczeń (główny flow terapeuty)

```
┌─────────────────────────────────────────────────────────────────┐
│  FAZA 1: Tworzenie ćwiczenia                                   │
│                                                                  │
│  Terapeuta → Panel Admin → CREATE_EXERCISE_MUTATION              │
│  Pola: name, type, side, parametry, opis pacjenta/kliniczny     │
│  Opcjonalnie: media (zdjęcia, GIF), tagi, AI sugestie           │
│  Status początkowy: Draft, Scope: Organization                   │
│                                                                  │
│  Backend: ExerciseMutation.CreateExercise()                      │
│  → Zapis w DB → Subscription "exerciseCreated" → Real-time      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  FAZA 2: Tworzenie zestawu ćwiczeń                              │
│                                                                  │
│  Terapeuta → Panel Admin → CREATE_EXERCISE_SET_MUTATION          │
│  Dodawanie ćwiczeń: ADD_EXERCISE_TO_EXERCISE_SET_MUTATION        │
│  Każde mapowanie (ExerciseSetMapping) może nadpisać parametry    │
│  Opcjonalnie: IsTemplate = true (szablon wielokrotnego użytku)   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  FAZA 3: Assignment Wizard (5 kroków)                           │
│                                                                  │
│  Krok 1: Wybór zestawu (szablon lub nowy)                       │
│  Krok 2: Wybór pacjentów (jeden lub wielu)                      │
│  Krok 3: Personalizacja (nadpisanie parametrów per pacjent)     │
│  Krok 4: Harmonogram (Frequency, StartDate, EndDate)            │
│  Krok 5: Podsumowanie → ASSIGN_EXERCISE_SET_TO_PATIENT_MUTATION │
│                                                                  │
│  Backend: PatientAssignmentMutation.AssignExerciseSetToPatient() │
│  → Zapis PatientAssignment(s) → Subscription → Notyfikacja      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  FAZA 4: Pacjent wykonuje ćwiczenia (aplikacja mobilna)         │
│                                                                  │
│  Pacjent → Mobile App → Dashboard → Zestawy → Player            │
│  Player: RepsExercisePlayer lub TimeExercisePlayer               │
│  Parametry: Assignment overrides → Mapping overrides → Defaults  │
│  Po wykonaniu: ExerciseProgress (seria, powtórzenia, ból, czas) │
│  → MARK_EXERCISE_COMPLETED_MUTATION                              │
│                                                                  │
│  Backend: PatientProgressMutation.MarkExerciseCompleted()        │
│  → Zapis ExerciseProgress → Aktualizacja Assignment stats       │
│  → HealthPoints (gamifikacja)                                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  FAZA 5: Terapeuta monitoruje postępy                           │
│                                                                  │
│  Panel Admin: Profil pacjenta → Zakładka postępy                │
│  GET_EXERCISE_PROGRESS_QUERY, GET_WEEKLY_PROGRESS_QUERY          │
│  Dane: ukończone serie, ból, trudność, regularność               │
└─────────────────────────────────────────────────────────────────┘
```

**Pliki Admin:**

- Ćwiczenia: `src/components/exercises/`
- Zestawy: `src/components/exercise-sets/`
- Assignment Wizard: `src/components/assignment/` (SPEC-001)
- Pacjenci/postępy: `src/components/patients/`

**Pliki Mobile:**

- Player: `app/(tabs)/patient/sets/exercise-player/`
- Podsumowanie: `app/(tabs)/patient/sets/exercise-summary/`
- Historia: `app/(tabs)/patient/history/`

---

## 3. Weryfikacja ćwiczeń globalnych

```
Terapeuta                Panel Admin               Backend               ContentManager
────────                ────────────               ───────               ──────────────
    │                       │                         │                        │
    │── Tworzy ćwiczenie ──→│                         │                        │
    │   (Scope: Org)        │                         │                        │
    │                       │                         │                        │
    │── "Zgłoś do bazy     │                         │                        │
    │    globalnej" ────────→│                         │                        │
    │                       │── SUBMIT_TO_GLOBAL ────→│                        │
    │                       │   Status: PendingReview │                        │
    │                       │                         │                        │
    │                       │                         │──── Notyfikacja ──────→│
    │                       │                         │                        │
    │                       │                         │    ←── Approve/Reject ─│
    │                       │                         │    Status: Approved    │
    │                       │                         │    lub ChangesReq.     │
    │                       │                         │                        │
    │  ←── Powiadomienie ───│←── Subscription ────────│                        │
    │   (zaakceptowane      │                         │                        │
    │    lub odrzucone)     │                         │                        │
```

**Flow Shadow Draft (poprawka do opublikowanego):**

1. ContentManager tworzy Shadow Draft (`ParentPublishedExerciseId` = oryginał)
2. Edycja Shadow Draft bez wpływu na oryginał
3. Zatwierdzenie → Merge z oryginałem (`UpdateMerged`)

---

## 4. Billing (Revenue Share -- aktywny model)

**Kluczowa zasada: fizjo płaci tylko wtedy gdy zarabia.** Brak stałych opłat.

```
  Fizjo                        Panel Admin                    Backend / Stripe
  ────                        ────────────                   ────────────────
    │                              │                               │
    │── Zaznacza klientów ────────→│  (np. 10 pacjentów "premium") │
    │   premium w panelu           │                               │
    │                              │                               │
    │── Podaje dane firmy ────────→│  (NIP, nazwa, adres)          │
    │   do fakturowania            │                               │
    │                              │                               │
    │                              │  Uznajemy że fizjo dostał     │
    │                              │  pieniądze od pacjentów       │
    │                              │                               │
    │                              │── Naliczenie prowizji ───────→│
    │                              │   (~60% z kwoty premium)      │
    │                              │                               │
    │  ←── Faktura ────────────────│←── Stripe / faktura ─────────│
    │                              │                               │
```

> Kwota premium (~39 PLN) i procent prowizji (~60%) nie są jeszcze ustalone.
> Mogą być plany kilkumiesięczne z inną kwotą.

**Struktura subskrypcji (przygotowana, nieaktywna):**
W backendzie istnieje BillingCycle, SubscriptionPlan (Starter/Solo/Pro/Business),
ale nie jest uruchomiona. Może być dodatkowym modelem w przyszłości.

**Revenue Share flow (docelowy z Stripe Connect):**

```
Pacjent płaci za premium (PatientSubscription via Stripe)
         │
         ├── Stripe Fee (~2.9%)
         ├── Platform Fee (FiziYo ~60%)
         └── Reszta → Stripe Connect Transfer → Konto organizacji
```

**Pliki:**

- Admin: `src/components/billing/`, `src/app/(dashboard)/finances/`
- Backend: `Services/BillingService.cs`, `Services/RevenueShareService.cs`, `Services/CommissionService.cs`, `Controllers/StripeController.cs`

---

## 5. AI Features

```
Panel / Mobile                     Backend (.NET)              OpenAI/OpenRouter
──────────────                     ──────────────              ────────────────
      │                                  │                           │
      │── POST /api/chat/simple ────────→│                           │
      │   { sessionId, message }         │── Sprawdź AI Credits ──→ │
      │                                  │── IChatClient.Complete() ─→│
      │                                  │   + function calling:     │
      │                                  │     FindExercises()       │
      │                                  │     FindExerciseSets()    │
      │                                  │     GetExerciseTags()     │
      │                                  │     GetCurrentUser()      │
      │                                  │                           │
      │  ←── AI response ───────────────│←── response ──────────────│
      │                                  │── -1 AI Credit            │
      │                                  │── Log: AICreditsLog       │
      │                                  │── Cache: HybridCache 30m  │
```

**Inne endpointy AI:**

| Endpoint                   | Opis                               | Koszt   |
| -------------------------- | ---------------------------------- | ------- |
| `/api/ai/exercise-suggest` | Sugestie parametrów z nazwy        | kredyty |
| `/api/ai/set-generate`     | Generowanie zestawu z opisu        | kredyty |
| `/api/ai/clinical-notes`   | Asystent notatek klinicznych       | kredyty |
| `/api/ai/voice-parse`      | Głos → struktura ćwiczenia         | kredyty |
| `/api/ai/generate-image`   | Obraz ćwiczenia (Gemini 2.5 Flash) | kredyty |
| `/api/ai/verification/*`   | Sugestie tagów, walidacja          | kredyty |
| `/api/ai/document-analyze` | PDF/Excel → ćwiczenia              | kredyty |

**Pliki:**

- Admin: `src/services/aiService.ts`, `src/services/chatService.ts`, `src/services/verificationAIService.ts`
- Mobile: `src/services/chatService.ts`, `components/AI/`
- Backend: `Controllers/AIController.cs`, `Controllers/ChatController.cs`, `Controllers/DocumentAnalyzerController.cs`

---

## 6. Rejestracja i onboarding

```
┌──────────────────────────────────────────────────────┐
│  Scenariusz 1: Owner zakłada organizację              │
│                                                       │
│  Clerk signup → Webhook user.created → Backend:       │
│  • Tworzy User                                        │
│  • Auto-tworzy Organization (plan: Starter)           │
│  • Auto-tworzy OrganizationMember (IsOwner=true)      │
│  → Mobile/Admin → Onboarding flow                     │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│  Scenariusz 2: Pacjent rejestruje się sam             │
│                                                       │
│  Clerk signup → Webhook → Backend: tworzy User        │
│  NIE tworzy organizacji                               │
│  → Czeka na przypisanie przez fizjo:                  │
│    • QR code (fizjo://connect)                        │
│    • Wyszukanie po email/telefon                      │
│    • Kod zaproszenia                                  │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│  Scenariusz 3: Shadow User (fizjo tworzy pacjenta)    │
│                                                       │
│  Fizjo → "Dodaj pacjenta" → imię, nazwisko, telefon  │
│  Backend: tworzy User (IsShadowUser=true)             │
│  → Fizjo od razu może przypisywać ćwiczenia           │
│  → Opcjonalnie: SMS z linkiem aktywacyjnym            │
│  → Pacjent klika → ustawia hasło → pełne konto       │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│  Scenariusz 4: Zaproszenie pracownika                 │
│                                                       │
│  Owner → "Zaproś" → email + rola                      │
│  Backend: OrganizationInvitation (token 7 dni)        │
│  → Email/link → Nowy user lub istniejący              │
│  → AcceptInvitation → OrganizationMember              │
└──────────────────────────────────────────────────────┘
```

**Plik referencyjny:** `fizjo-app/docs/registration-flows.md`

---

## 7. Real-time (Subscriptions)

```
Panel Admin                     Backend                          PostgreSQL
───────────                     ───────                          ──────────
      │                              │                                │
      │── WebSocket connect ────────→│                                │
      │   (wsLink + auth)            │── LISTEN hotchocolate_*  ─────→│
      │                              │                                │
      │                              │       (inna mutacja)           │
      │                              │── INSERT/UPDATE ──────────────→│
      │                              │                                │
      │                              │←── NOTIFY hotchocolate_* ─────│
      │                              │    (payload: entity ID)        │
      │                              │                                │
      │←── subscription event ──────│                                │
      │   (entity ID only)           │                                │
      │                              │                                │
      │── refetch query ────────────→│                                │
      │   (pełne dane)               │                                │
```

Subskrypcje zwracają **tylko ID** zmienionej encji. Klient musi sam wykonać refetch aby pobrać aktualne dane. To wzorzec cache-invalidation, nie full-data push.

**Dostępne subskrypcje (admin):**

- `exerciseCreated`, `exerciseUpdated`, `exerciseDeleted`
- `exerciseSetCreated`, `exerciseSetUpdated`
- `patientCreated`, `patientUpdated`
- `assignmentCreated`, `assignmentUpdated`
- `clinicalNoteCreated`, `clinicalNoteUpdated`
- `tagCreated`, `tagUpdated`

**Mobile NIE używa subskrypcji** — opiera się na cache Apollo i pull-to-refresh.

---

## 8. Media upload

```
Panel / Mobile                  Backend                    Azure Blob / Vimeo
──────────────                  ───────                    ──────────────────
      │                              │                           │
      │  OBRAZY:                     │                           │
      │── GraphQL mutation ─────────→│                           │
      │   (base64 image)             │── BlobStorageService ────→│ Azure Blob
      │                              │   exercises/{id}/{guid}   │ ($web container)
      │  ←── CDN URL ───────────────│                           │
      │                              │                           │
      │  WIDEO:                      │                           │
      │── POST /api/video/upload ───→│                           │
      │   (TUS protocol)             │── VimeoVideoService ────→│ Vimeo
      │                              │   (TUS upload)            │
      │  ←── Vimeo embed URL ──────│                           │
      │                              │                           │
      │  CDN URL pattern:            │                           │
      │  {AzureStorage:CdnBaseUrl}/exercises/{exerciseId}/{guid}.{ext}
```
