---
spec: SPEC-022
repo: fiziyo-admin-portal
issues: []
prs: []
board:
---

# SPEC-022 — Unified Exercise Parameters Presentation

## Cel biznesowy

Terapeuta nie może mieć wrażenia, że „parametry ćwiczenia” wyglądają i działają inaczej w kreatorze, edycji szablonu, edycji w zestawie i personalizacji pacjenta. Jedna prezentacja pól + parytet treści (enrichment) między create a edit.

## Architektura

### SSOT prezentacji

| Warstwa            | Plik                           | Rola                                                           |
| ------------------ | ------------------------------ | -------------------------------------------------------------- |
| Etykiety / format  | `displayRegistry.ts`           | labels, tooltips, formatValue                                  |
| Semantyka + sekcje | `fieldContract.ts`             | surfaces, tiers, `PARAMETER_SECTIONS`, `getParameterSections`  |
| Prezentacja        | `ExerciseParametersFields.tsx` | jedyny UI parametrów (badge timera, kafle wyliczane, advanced) |
| Adapter szablonu   | `ExerciseParametersEditor.tsx` | `ExerciseCoreDraft` → Fields                                   |
| Adapter karty      | `ExerciseExecutionCard.tsx`    | expanded panel → Fields (`omitFields: sets/reps`)              |
| Adapter override   | dialogi pacjenta               | Fields + `inheritedValues`                                     |

```mermaid
graph TD
    Registry["displayRegistry"] --> Contract["fieldContract + PARAMETER_SECTIONS"]
    Contract --> Fields["ExerciseParametersFields"]
    Fields --> Editor["ExerciseParametersEditor"]
    Fields --> Card["ExerciseExecutionCard"]
    Fields --> Override["Edit / Add patient dialogs"]
    Content["ExerciseContentSections"] --> Create["CreateExerciseWizard"]
    Content --> Detail["ExerciseEditor"]
```

### Sekcje parametrów (kolejność kanoniczna)

1. **Podstawowe parametry** — sets, reps, executionTime, load, restSets + badge timera + blok czasu wyliczanego (`ExerciseComputedTime`): „Czas ćwiczenia (wyliczany)” jako wartość główna, „Jedna seria” jako linia pomocnicza
2. **Zaawansowane** — Tempo/przerwy/ROM + Pozycja i klasyfikacja (lub inherited)
3. **Treść dla pacjenta** (opt-in) — patientDescription, notes, clinicalDescription, audioCue

`duration` żyje wyłącznie w sekcji zaawansowanej (legacy override czasu serii).

### Podgląd ćwiczenia ↔ edycja parametrów

- Jedna semantyka liczb (KONTRAKT-v3.3): brak klucza albo `null` to „—”, `0` to wartość („0 s”). Pole edycji dla `null` jest puste, dla `0` pokazuje „0”.
- Jeden formatter: `formatValue` z `displayRegistry` (sekundy jako „30 s”); podgląd czyta go wprost, wartości odziedziczone w edycji przez `formatParameterValue`.
- Czas wyliczany liczy `computeExerciseTimeLabels` i pokazuje `ExerciseComputedTime` w obu widokach.
- Treść dla pacjenta w podglądzie to te same sekcje co w edycji (`ExercisePatientContentFields` z `readOnly`): kroki osobno i w całości, wskazówki z fazą, oddech, bezpieczeństwo. Nadpisanie opisu z planu stoi nad nimi.
- Sprzęt rekordu 3.3 pochodzi z `equipment_items` (`resolveExerciseEquipmentText`); ta sama wartość jest punktem odniesienia przy zapisie nadpisania w zestawie, więc nieruszone pole nie zapisuje kopii.

### Parytet treści create ↔ edit

- `ExerciseContentSections` — wspólny stack sekcji enrichment
- `useEnrichmentDraft` — draft enrichment w kreatorze
- `createExerciseSubmit` — `createExercise` → opcjonalnie `updateExercise(enrichmentDataJson)` z degradacją (`toast.warning`)

## Interfejsy

Bez zmian schematu GraphQL. Follow-up: dodać `enrichmentDataJson` do `CREATE_EXERCISE_MUTATION` (backend), aby uniknąć dual-call.

## Verification plan

- Unit: `fieldContract` kompletność sekcji; `parameterSurfaceParity`; `mappingIntegrity`; `createExerciseSubmit`; `exerciseContentSections.parity`
- E2E (fiziyo-tests): create / edit set params / patient override — wspólne etykiety i obecność advanced

## Changelog

### 2026-11-16

- Podgląd ćwiczenia w zestawie i „Edytuj parametry” czytają i formatują parametry tak samo; czas ćwiczenia główny, seria pomocnicza; kroki w podglądzie w całości; sprzęt v3.3 w zestawie (zgłoszenie właściciela 16.11, `przem-fx-7001`)

### 2026-09-15

- Podpowiedź timera siedzi pod polem „Czas powtórzenia”, nie między przerwą a kafelkami wyliczanymi — `#64`
- Badge timera: „Timer wyłączony” / „Timer w aplikacji” + tooltip (zamiast żargonu „BEZ TIMERA”) — `#65`

### 2026-07-28

- Wprowadzenie `PARAMETER_SECTIONS` + `ExerciseParametersFields`
- Przepięcie karty, dialogów pacjenta i edytora szablonu
- Parytet treści w kreatorze przez `ExerciseContentSections` + dwustopniowy zapis enrichment
