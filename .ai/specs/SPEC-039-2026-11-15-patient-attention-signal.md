---
spec: SPEC-039
repo: cross-repo # fiziyo-admin-portal + fizjo-app (backend i aplikacja)
issues: []
prs: []
board: # eksploracja 15.11.2026, B02
---

# Sygnał kliniczny od pacjenta: jedna reguła „wymaga uwagi”

## Cel biznesowy

Pacjent zgłasza w aplikacji ból, „za trudne” albo notatkę. Fizjoterapeuta ma to zobaczyć tam, gdzie zaczyna dzień: na liście pacjentów, na pulpicie, w czacie i w dzwonku. Dziś (stan `main`, 15.11.2026):

- status „Wymaga uwagi” na liście i pulpicie liczy tylko dni od ostatniego treningu (`src/features/patients/utils/patientActivityStatus.ts`); pacjent ćwiczący codziennie z bólem 5/5 jest zielony i ląduje na końcu listy;
- ból ≥4 i trudność ocenia tylko zakładka aktywności, z 7 dni (`src/lib/therapyStatus.ts`, `calculateTherapyStatus`);
- panel czatu pokazuje średni ból zestawu (`avgPainLevel`), więc pojedyncze 5/5 się rozmywa;
- dzwonek ma licznik na sztywno `0` (`src/components/layout/HeaderActions.tsx`);
- lista ignoruje częstotliwość planu: pacjent z planem 3× w tygodniu jest pomarańczowy w każdy dzień wolny;
- w aplikacji opinia z ekranu podsumowania nie idzie do kolejki offline jak ukończenie; bez sieci pacjent dostaje „Nie zapisano opinii” i zwykle wychodzi bez zapisu (`fizjo-app/app/(tabs)/patient/sets/exercise-summary/[exerciseId].tsx`, `persistFeedbackWithConsent`).

Przeoczony ból to ryzyko kliniczne; pacjent, który ćwiczy, jest w „Czego nie poświęcamy”.

## Reguła (propozycja do decyzji, D-1…D-5)

Reguła żyje w jednym miejscu: backend liczy ją przy `organizationPatients` i oddaje jako nowe pole `attention` (additive). Lista, pulpit, czat i dzwonek czytają to pole; portal nie liczy własnej wersji.

Sygnały, w kolejności ważności (najwyższy wygrywa etykietę, wszystkie trafiają do listy powodów):

| Kod          | Kiedy                                                                      | Ton              |
| ------------ | -------------------------------------------------------------------------- | ---------------- |
| `PAIN`       | dowolne ćwiczenie z bólem ≥ 4/5 w oknie sygnału                            | danger           |
| `DIFFICULTY` | dowolne ćwiczenie z oceną „za trudne” lub „trudne” (≤ 2/5) w oknie sygnału | warning          |
| `NOTE`       | niepusta notatka pacjenta (`patientNotes`) w oknie sygnału                 | warning          |
| `INACTIVE`   | przerwa dłuższa niż plan pozwala (niżej)                                   | warning / danger |

Progi bólu i trudności są już w kodzie portalu (`patientFeedbackScale.ts`: `DISCOMFORT_PAIN_LEVEL = 4`, `HARD_DIFFICULTY_LEVEL = 2`) i przechodzą do backendu bez zmiany wartości. 0 = brak odpowiedzi, nie sygnał.

**Okno sygnału (D-1).** Sygnał od pacjenta liczy się od chwili, gdy fizjoterapeuta ostatnio „przejrzał” pacjenta, nie dłużej niż 14 dni wstecz. „Przejrzane” to jawny przycisk w dzwonku (w karcie pacjenta: następny krok); zapis to nowe pole `OrganizationMember.ClinicalSignalsReviewedAt` na członkostwie pacjenta (additive, nullable; wspólne dla organizacji, bo lista pacjentów też jest wspólna, a pacjent bez przypisanego terapeuty nie ma wiersza `TherapistPatient`) i mutacja `markPatientSignalsReviewed(organizationId, patientId)`. Bez przejrzenia sygnał gaśnie sam po 14 dniach. Alternatywa bez zmiany modelu: stałe okno 7 dni jak dziś w zakładce aktywności, bez przycisku; wtedy dzwonek nie maleje po przeczytaniu.

**Brak treningu względem planu (D-2).** Oczekiwana przerwa z aktywnych przypisań pacjenta (`PatientAssignment.Frequency`), najczęstszy plan wygrywa:

- konkretne dni tygodnia: `warning`, gdy minął zaplanowany dzień (wczoraj lub wcześniej) bez treningu; `danger`, gdy minęły dwa zaplanowane dni z rzędu;
- `TimesPerWeek = n`: dopuszczalna przerwa `ceil(7 / n)` dni; `warning` po jej przekroczeniu, `danger` po dwukrotnym;
- brak częstotliwości albo codziennie: obecne progi (2 dni `warning`, 4 dni `danger`);
- pacjent bez żadnego treningu: `none` jak dziś, chyba że od startu przypisania minęła dopuszczalna przerwa.

**Sortowanie listy (D-3).** `danger` (ból, długa przerwa) → `warning` → bez aktywności → zielony. W obrębie tonu sygnał od pacjenta przed samą nieaktywnością, potem najświeższy sygnał wyżej.

**Dzwonek (D-4).** Licznik = liczba pacjentów organizacji (filtr „moi” dla terapeuty z przypisaniami) z co najmniej jednym sygnałem od pacjenta (`PAIN`, `DIFFICULTY`, `NOTE`). Sama nieaktywność nie dzwoni, bo jest na liście; inaczej dzwonek u gabinetu z 30 pacjentami nigdy nie spada do zera. Rozwinięcie dzwonka: lista pacjentów z powodem i linkiem do karty, przycisk „Przejrzane”.

**Czat (D-5).** Panel kontekstu pacjenta pokazuje maksimum bólu i datę, nie średnią, i ten sam znacznik `attention` co lista. Średnia zostaje tylko w raporcie.

## Kontrakt GraphQL (additive)

```graphql
type PatientAttention {
  tone: String! # success | warning | danger | none
  reasons: [String!]! # PAIN | DIFFICULTY | NOTE | INACTIVE, od najważniejszego
  maxPainLevel: Int # w oknie sygnału
  lastSignalAt: DateTime # najświeższy sygnał od pacjenta
  daysSinceTraining: Int # dni kalendarzowe w strefie pacjenta (User.Timezone, domyślnie Europe/Warsaw)
  expectedGapDays: Int # z planu; null = brak częstotliwości
  reviewedAt: DateTime
  hasPatientSignal: Boolean! # PAIN, DIFFICULTY albo NOTE; to liczy dzwonek
}

extend type OrganizationPatientDto {
  attention: PatientAttention!
}
extend type Mutation {
  markPatientSignalsReviewed(organizationId: String!, patientId: String!): Boolean!
}
```

Reguła czyta tylko przypisania i ukończenia tej organizacji (`PatientAssignment.OrganizationId`): ból zgłoszony w innym gabinecie nie wychodzi poza niego. `lastActivity` zostaje bez zmian (dalej liczone ze wszystkich organizacji, osobny temat). Stare buildy i portal sprzed zmiany nie czytają `attention`. Mutacja wymaga roli Owner/Admin/Therapist i organizacji z tokenu (`RequireScopedOrganizationAccess`); Staff widzi dzwonek, ale nie gasi sygnałów. Kolejność wdrożenia: backend na DEV przed portalem, bo portal pyta o `attention` i bez niego cała lista pacjentów zwraca błąd.

## Etapy

1. **Backend (fizjo-app/backend):** `Services/PatientAttentionRule.cs` jako czysta funkcja (wejście: ukończenia z 14 dni, częstotliwości aktywnych planów, `ClinicalSignalsReviewedAt`, strefa pacjenta, `now`), wołana w `GetOrganizationPatients`; pole, migracja `PatientClinicalSignalsReviewedAt`, mutacja w `Types/PatientAttentionMutation.cs`. Testy xUnit: `PatientAttentionRuleTests`, `OrganizationPatientsQueryTests` (ból 5/5 przy codziennym treningu, izolacja organizacji, przejrzenie, token innej organizacji).
2. **Portal:** `getPatientActivityStatus(lastActivity, now, attention)` czyta regułę serwera (bez `attention` liczy dawnym progiem); lista, pulpit, karta na liście, `PatientContextPanel` (najwyższy ból zamiast średniej), `PatientPeekCard`, `inactivePatients`, `todayAgenda` (dzień wolny w planie to nie przerwa), dzwonek `NotificationsBell` z `selectPatientSignals` i przyciskiem „Przejrzane”. Testy Vitest padające na `main`: pacjent z bólem 5/5 dziś ma `danger` i stoi pierwszy; plan 3×/tydz. w dzień wolny jest zielony; dzwonek liczy tylko sygnały od pacjenta.
3. **Aplikacja:** opinia z podsumowania idzie przez `utils/exerciseFeedbackQueue.ts`: brak sieci albo ukończenie wciąż w kolejce telefonu kolejkuje ją (AsyncStorage per użytkownik), pacjent przechodzi dalej z komunikatem „Zapisano na telefonie”. `useFlushPendingExerciseCompletions` wysyła opinie po ukończeniach tej samej pary przypisanie + ćwiczenie, bo `saveExerciseFeedback` zapisuje w najnowszym ukończonym wierszu. Ograniczenie: dwa wykonania tego samego ćwiczenia offline z dwiema opiniami trafiają do najnowszego wiersza (druga nadpisuje pierwszą); naprawa wymaga `clientCompletionId` w `saveExerciseFeedback` (zmiana kontraktu, osobny krok). Test Jest padający na `main`: błąd sieci nie gubi opinii.

## Verification plan

- Unit: reguła backendu (każdy sygnał, okno, przejrzenie, każdy typ częstotliwości), zapytanie organizacji, portalowe sortowanie i licznik, kolejka opinii w aplikacji.
- E2E: po wdrożeniu na DEV scenariusz w `fiziyo-tests`: pacjent testowy zgłasza ból 5/5 → pacjent pierwszy na liście z „Ból 5/5”, dzwonek 1, „Przejrzane” → dzwonek 0.

## Decyzja

Przemek (właściciel), 15.11.2026, w sesji agenta:

- D-1: okno od przycisku „Przejrzane” (`SignalsReviewedAt`), najdłużej 14 dni.
- D-2: przerwa liczona względem częstotliwości planu, jak wyżej.
- D-4: dzwonek liczy tylko sygnały od pacjenta (ból, trudność, notatka).
- Próg trudności ≤ 2/5, ten sam co w zakładce aktywności.
- D-3 (sortowanie) i D-5 (czat: maksimum bólu zamiast średniej) przyjęte w brzmieniu propozycji, bez osobnego pytania.

## Changelog

### 2026-11-15

- Propozycja reguły i progów, decyzja właściciela, implementacja trzech etapów (PR-y w nagłówku po otwarciu).
