---
spec: SPEC-036
repo: fiziyo-admin-portal
issues: []
prs: []
board:
---

# Wydruk i podglądy pokazują instrukcję ćwiczenia v3.3

## Cel biznesowy

Ćwiczenie zapisane w kontrakcie v3.3 (FR-007) nie ma opisu w kolumnie, tylko podsumowanie i kroki. Pacjent nie może dostać wydruku bez instrukcji, a fizjoterapeuta nie może widzieć „Brak opisu ćwiczenia.” przy ćwiczeniu, które instrukcję ma.

## Decyzje

- Jedna czysta funkcja `resolvePatientInstruction` (`src/components/shared/exercise/patientInstruction.ts`) na `readExerciseContent` i `printableInstructionLines`. Kolejność:
  1. nadpisanie opisu z pozycji planu albo przypisania, gdy niepuste,
  2. rekord stary: opis z kolumny,
  3. gdy opisu nie ma, i zawsze dla rekordu 3.3: podsumowanie, potem ponumerowane kroki, każdy w osobnej linii.
     Wynik `text: null` znaczy, że rekord nie ma żadnej z tych treści; tylko wtedy widok mówi o braku opisu.
- Kroki pochodzą z treści po nadpisaniach pozycji i przypisania (SPEC-024), więc wydruk i podgląd pokazują kroki zmienione dla pacjenta.
- Każdy widok zachowuje swoją dotychczasową kolejność nadpisań i podaje funkcji gotowy tekst:
  - wydruk (`toPdfExercise`): `patientDescription` z przypisania albo z `overridesJson` pozycji, potem `customDescription`; nowe pole `patientDescriptionOverride` w `resolveEffectiveExerciseParams` oddaje tę część bez kolumny ćwiczenia,
  - kreator przypisania (`buildExerciseDetailsViewModel`): `customDescription` pozycji,
  - podgląd w planie pacjenta (`ExercisePreviewDrawer`): `customDescription` z przypisania, potem z pozycji,
  - podgląd w zestawie (`ExercisePreviewDialog`): `patientDescriptionOverride` z karty ćwiczenia; pole „Opis dla pacjenta” pokazuje instrukcję.
- Strona zestawu przekazuje kreatorowi przypisania `enrichmentData` ćwiczeń, które już pobiera; bez tego kreator otwarty z zestawu nie miał kroków.
- Zmiana zachowania dla rekordu starego (naprawa tego samego błędu): rekord bez opisu, ale z krokami, pokazuje teraz podsumowanie i kroki zamiast zdania ogólnego na wydruku, „Brak opisu ćwiczenia.” w kreatorze, „Nie ustawiono” w podglądzie zestawu i ukrytej sekcji w planie pacjenta. Rekord stary z opisem i rekord z nadpisaniem wyglądają jak dotąd.
- Puste nadpisanie opisu nie jest nadpisaniem: podgląd w planie pacjenta pokazuje wtedy opis rekordu, a nie pustą sekcję.
- „Przerwij, gdy” nie trafia na wydruk: karta ćwiczenia w PDF nie ma dziś miejsca na tekst bezpieczeństwa, a dodanie go zmienia układ strony.

## Poza zakresem

Układ PDF (osobne linie kroków jako lista, „Przerwij, gdy”, sprzęt), podglądy w wyszukiwarkach ćwiczeń, które nie pobierają dokumentu treści, edycja.

## Znane ograniczenia

- Karta ćwiczenia w podglądzie zestawu nie niesie surowego rekordu, więc wersję rozpoznaje po dokumencie po `toV3`. Dokument 3.3 bez znacznika `$schema` (eksporter zawsze go zapisuje) byłby tam czytany jak stary. Wydruk, kreator i plan pacjenta biorą wersję z rekordu i tego ograniczenia nie mają.
- Podglądy z wyszukiwarki ćwiczeń (lista bez `enrichmentData`) nie mają kroków, dopóki dokument nie jest pobrany.

## Verification plan

- Unit: `src/components/shared/exercise/__tests__/patientInstruction.test.ts`; po jednym pliku na widok: `src/components/pdf/__tests__/toPdfExercise.instruction.test.ts`, `src/features/assignment/exerciseDetailsViewModel.instruction.test.ts`, `src/features/patients/__tests__/ExercisePreviewDrawer.instruction.test.tsx`, `src/components/shared/exercise/__tests__/exercisePreviewDialog.instruction.test.tsx`. Przypadki: stary z opisem, stary bez opisu z krokami, 3.3 z krokami, 3.3 z nadpisaniem, brak treści.
- E2E (`fiziyo-tests`): `data-testid` bez zmian; scenariusz wydruku karty pacjenta dla ćwiczenia 3.3 do dopisania po wdrożeniu danych 3.3 na DEV.

## Changelog

### 2026-11-11

- Wspólna reguła instrukcji dla pacjenta na wydruku i w trzech podglądach.
