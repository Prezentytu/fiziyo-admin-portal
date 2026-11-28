---
spec: SPEC-067
repo: fiziyo-admin-portal
issues: []
prs: []
board:
---

# SPEC-067: Kalendarz tygodnia w czacie (kilka zestawów na dni tygodnia)

Status: in-progress · 2026-11-28 · Czat: [SPEC-031](SPEC-031-2026-10-30-chat-view.md)

## Cel

Rozmowa 27.11 (Przemek): fizjoterapeuta ma zestawy „1.”–„8.” i chce, żeby pacjent robił je w ciągu tygodnia: „wszystkie na każdy dzień tygodnia, tylko jeden musimy dać razem, bo jest ich 8”. Dziś jedna karta to jeden zestaw, więc osiem zestawów to osiem rozmów i osiem harmonogramów. Kalendarz tygodnia robi to jedną kartą i jednym „Wyślij”: zestaw przy zestawie, przy każdym dni tygodnia, wspólny start i czas trwania.

Miara: zestawy na cały tydzień w jednej prośbie i jednym kliknięciu zamiast N kart.

## Zakres

- Nowa karta modelu `WeekPlan`: pacjent i lista pozycji `{ setId, days }` (do 10 zestawów, każdy raz, dni z zamkniętej listy `monday`…`sunday`). Ten sam zestaw może być w kilku dniach, w jednym dniu może być kilka zestawów.
- Karta w panelu: wiersz na zestaw (nazwa, liczba ćwiczeń, minuty) z przyciskami Pn–Nd, podgląd tygodnia (co w który dzień), wspólny Start i Czas jak w „Gotowe do wysłania”, usunięcie wiersza.
- „Wyślij pacjentowi” zapisuje każdy zestaw tą samą ścieżką co dziś (`sendPlan`: plan pacjenta jako kopia zestawu z `sourceExerciseSetId`, mappingi w kolejności, przypisanie z datami i `frequency` z dniami wiersza). Po kolei; gdy któryś zapis padnie, karta pokazuje, co już wysłane, a ponowne „Wyślij” wysyła tylko resztę.
- Pacjent: jak przy `SetDraft` (alias z rozmowy, a bez aliasu pacjent rozmowy). Bez pacjenta karta pokazuje „Dla kogo?” z pacjentami gabinetu.
- Start i czas: z rozmowy, gdy fizjoterapeuta je podał („od poniedziałku przez 4 tygodnie”), inaczej domyślne z harmonogramu czatu.

Poza zakresem: kilku pacjentów w jednej karcie (karta jest per pacjent, kolejny pacjent to kolejna prośba), edycja ćwiczeń w zestawach z karty (do tego jest `SetDraft`), zestawy złożone z ćwiczeń ad hoc (tylko istniejące zestawy z `FindExerciseSets`/`FindPatientSets`), godziny w ciągu dnia.

## Kontrakt (additive)

`POST /api/chat/dispatch` → `spec`:

```json
{ "component": "WeekPlan", "patientId": "…", "week": [{ "setId": "…", "days": ["monday", "thursday"] }] }
```

- `week` to nowe pole odpowiedzi, puste dla innych kart. Walidator zostawia tylko zestawy organizacji wywołującego, bez powtórzeń, najwyżej `MaxWeekSets = 10`; dni normalizuje (także polskie nazwy) i odrzuca nieznane. Pozycja bez poprawnego dnia zostaje z pustymi dniami: fizjoterapeuta wybiera je na karcie. `WeekPlan` bez żadnego zestawu to `Unsupported`.
- Model: `week` w `ChatViewSpecDraft`; prompt mówi, kiedy `WeekPlan`, a kiedy `SetDraft`, i jak rozłożyć dni, gdy fizjoterapeuta ich nie podał (po kolei od poniedziałku, nadmiar dokłada do najmniej obciążonych dni i mówi to w reply).
- Panel bez tej karty (starszy build) dostaje `component` spoza listy i pokazuje `UNSUPPORTED_SPEC`. Dlatego panel wchodzi pierwszy, backend po nim.
- Bez zmian GraphQL: zapis używa `createExerciseSet`, `addExerciseToExerciseSet`, `assignExerciseSetToPatient` jak dziś.

## Decyzje

- D-1: osobna karta zamiast kilku `SetDraft` w jednej odpowiedzi, bo zasada czatu „tekst plus co najwyżej jedna karta” zostaje.
- D-2: osobne przypisanie na zestaw (każde z własnymi dniami), a nie jeden plan z „dniami zestawów”. Model danych już to umie (`PatientAssignment.Frequency`), a aplikacja pacjenta pokazuje dziś plan dnia z kilku przypisań.
- D-3: karta nie zmienia ćwiczeń ani parametrów zestawów; plan pacjenta to kopia zestawu jak przy „Wyślij” z `SetDraft`.
- D-4: kalendarz tygodnia powstaje tylko z AI; reguły bez AI go nie rozpoznają (decyzja Przemka, 28.11). Ścieżka z reguł zostaje jak dziś: jeden zestaw na kartę z dniami w harmonogramie. To świadomy wyjątek od „każda karta ma ścieżkę w `intentRouter.ts`”.

## UI i data-testid

Prefiks `chat-…-week-plan`:

- `-patient-<id>-btn`: wybór pacjenta, gdy karta przyszła bez niego,
- `-row-<setId>`: wiersz zestawu, w nim `-row-<setId>-days-<day>-btn` (`aria-pressed`) i `-row-<setId>-remove-btn`,
- `-start`, `-weeks`: jak w `SendSummary`,
- `-primary-btn` „Wyślij pacjentowi (N)”, `-cancel-btn`.

Wyślij jest wyłączone, gdy nie ma pacjenta albo któryś wiersz nie ma dnia.

## Verification plan

- Backend: walidator (obce zestawy odpadają, powtórzenia, limit, dni PL/EN, pusty → Unsupported, pacjent rozmowy).
- Panel: `toChatViewSpec` dla `WeekPlan` (Vitest), czysta logika tygodnia w `utils/weekPlan.ts` (podgląd dni, rozkład domyślny, plan wiersza, co zostało do wysłania).
- E2E (`fiziyo-tests`, po merge'u): prośba „zestawy 1–3 dla <pacjent testowy> na pon, śr, pt” → karta z trzema wierszami → Wyślij → trzy przypisania z właściwymi dniami u pacjenta.

## Changelog

### 2026-11-28

- Utworzenie specyfikacji
- D-4 rozstrzygnięte: bez ścieżki z reguł
