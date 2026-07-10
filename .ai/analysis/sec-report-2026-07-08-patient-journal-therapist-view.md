# Security Report — Widok fizjo dla PatientJournalEntry (patientSharedJournalEntries)

Data: 2026-07-08
Zakres: nowa query GraphQL `patientSharedJournalEntries` (`backend/FizjoApp.Api/Types/PatientJournalQuery.cs` w repo `fizjo-app`) + nowy read-only komponent frontendowy `PatientJournalNotes` w `fiziyo-admin-portal`.

## Kontekst zmiany

Encja `PatientJournalEntry` (istniejąca, autor = pacjent) ma pole `Visibility` (`Private` | `SharedWithTherapist`). Dotychczasowa query `GetMyJournalEntries` czytała wyłącznie wpisy zalogowanego pacjenta. Ta zmiana dodaje pierwszy resolver, który wystawia notatki pacjenta innemu podmiotowi (fizjoterapeucie/staff organizacji).

## Ocena ryzyk

### 1. Wyciek wpisów `Private` do fizjo — Critical scenariusz, zmitygowane

- **Scenariusz ataku**: fizjo odgaduje/zna `patientId` i próbuje odczytać prywatny dziennik pacjenta.
- **Mitygacja**: filtr `Visibility == PatientJournalVisibility.SharedWithTherapist` jest częścią zapytania LINQ do bazy (`Where(...)`), nie filtrowaniem po stronie UI/klienta. Wpisy `Private` nigdy nie trafiają do wyniku SQL. Zweryfikowano kodem — brak ścieżki zwracającej pełną listę bez filtra.
- **Rezydualne ryzyko**: brak. Severity po mitygacji: **Low**.

### 2. Cross-tenant / cross-patient access — zmitygowane, wzorzec istniejący

- **Scenariusz ataku**: użytkownik z organizacji A próbuje odczytać notatki pacjenta z organizacji B, albo pacjenta nieprzypisanego do jego organizacji.
- **Mitygacja**: `RequireScopedOrganizationAccess(organizationId, Owner, Admin, Therapist, Staff)` wymusza, że `organizationId` z argumentu MUSI zgadzać się z organizacją z tokenu (scope). Dodatkowo filtr `e.OrganizationId == organizationId && e.PatientId == patientId` — wpis istnieje tylko dla organizacji, w której faktycznie został utworzony (`OrganizationId` ustawiane przy tworzeniu z `scope.OrganizationId` pacjenta). Podanie `patientId` z innej organizacji przy własnym `organizationId` zwróci pustą listę (brak takiej kombinacji w danych).
- **Uwaga (nie regresja, wzorzec istniejący)**: brak dodatkowej weryfikacji relacji terapeuta-pacjent (np. `TherapistPatientAssignment`) — każdy staff/therapist/admin/owner organizacji może odczytać notatki KAŻDEGO pacjenta tej organizacji, analogicznie do `ClinicalNoteQuery.GetPatientClinicalNotes`. To ustalony, świadomy wzorzec w tej bazie kodu (widoczność w ramach całej organizacji, nie per-terapeuta) — nie jest to nowa dziura wprowadzona tą zmianą.
- Severity: **Low** (zgodność z istniejącym modelem uprawnień).

### 3. Nadmiarowa ekspozycja GraphQL (over-fetching nawigacji)

- **Scenariusz**: model `PatientJournalEntry` ma publiczne właściwości nawigacyjne `Patient` i `Organization`. Frontend nie zapytuje o te pola, ale HotChocolate domyślnie eksponuje publiczne properties, więc technicznie klient GraphQL mógłby zapytać `patientSharedJournalEntries { patient { ... } }`.
- **Ocena**: fizjo ma już legalny dostęp do pełnego rekordu pacjenta przez `GET_USER_BY_ID_QUERY` w ramach tej samej organizacji — brak nowej klasy danych do których zyskuje dostęp. Ryzyko nie jest nowe (ten sam model jest już używany przez `GetMyJournalEntries`), zmienia się tylko odbiorca.
- Severity: **Low**. Rekomendacja (nie blokująca): rozważyć w kolejnej iteracji `[GraphQLIgnore]` na nawigacjach `Patient`/`Organization` dla wszystkich resolverów `PatientJournalEntry`, jeśli te pola nigdy nie są potrzebne w GraphQL.

### 4. Autoryzacja / rola — poprawność implementacji

- `[Authorize]` wymaga zalogowanego użytkownika; `RequireScopedOrganizationAccess` odrzuca brak aktywnego membershipu i sprawdza role. Brak roli w `allowedRoles` (Owner/Admin/Therapist/Staff) rzuca wyjątek `UnauthorizedAccessException`. Pacjent (rola `Patient`/brak wymienionej roli) nie przejdzie tego guardu — pacjent NIE może użyć tej query do podglądu cudzych notatek.
- Severity: brak ryzyka.

### 5. Input validation

- `patientId`/`organizationId` to `string!` (wymagane w GraphQL) — brak dodatkowej walidacji formatu, ale brak ryzyka injection (EF Core parametryzuje zapytania). Puste/nieistniejące ID zwracają pustą listę, nie wyjątek — bezpieczne zachowanie domyślne.

### 6. PII / logging

- Resolver nie loguje treści notatek ani identyfikatorów w sposób ujawniający PII poza standardowym error handlingiem frameworka. Brak nowych logów wprowadzonych tą zmianą.

## Podsumowanie

| Kategoria                       | Severity                 | Status                     |
| ------------------------------- | ------------------------ | -------------------------- |
| Wyciek `Private` wpisów         | Low (zmitygowane)        | OK                         |
| Cross-tenant access             | Low (istniejący wzorzec) | OK                         |
| Over-fetching nawigacji GraphQL | Low                      | Rekomendacja na przyszłość |
| Autoryzacja roli                | brak ryzyka              | OK                         |
| Input validation                | brak ryzyka              | OK                         |

**Wniosek**: Zmiana bezpieczna do merge. Brak nowych krytycznych/wysokich ryzyk. Jedyna rekomendacja nieblokująca: `[GraphQLIgnore]` na nawigacjach modelu `PatientJournalEntry` w przyszłej iteracji porządkującej.

## Next steps — go deeper

- Jeśli w kolejnej iteracji dojdzie wymaganie "tylko przypisany terapeuta widzi notatki swojego pacjenta" (węższe niż cała organizacja), trzeba dodać sprawdzenie `TherapistPatientAssignment` analogicznie w `ClinicalNoteQuery` i `PatientJournalQuery` jednocześnie (spójność modelu uprawnień).
- Rozważyć subskrypcję real-time dla nowych udostępnionych wpisów (poza zakresem tej iteracji).

## Similar hotspots

- `backend/FizjoApp.Api/Types/ClinicalNoteQuery.cs` — ten sam wzorzec org-wide access bez per-terapeuta scoping; jeśli model uprawnień się zaostrzy, zmienić w obu miejscach.
- `backend/FizjoApp.Api/Types/PatientJournalMutation.cs` — mutacje pacjenta (`UpdateMyJournalEntry`/`DeleteMyJournalEntry`) poprawnie odrzucają dostęp do cudzych wpisów (`entry.PatientId == scope.UserId`); żadna mutacja fizjo nie istnieje dla tej encji — zgodnie z planem (read-only dla fizjo).
