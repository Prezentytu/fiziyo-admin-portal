# Backfill: patient-added exercises → real PATIENT_PLAN mappings

## Context

Historically admin wrote ad-hoc exercises into `PatientAssignment.exerciseOverrides`
under synthetic keys (`patient-added-*` / `isPatientAdded: true`) or mobile used
`__additionalExercises__`. Patients could not see admin-added entries.

As of 2026-07-29, `AddExerciseToPatientDialog` creates a real `ExerciseSetMapping`
on the patient's `PATIENT_PLAN` set.

## Legacy read

- Mobile still reads `__additionalExercises__` via `extractAdditionalExercises`
  (read-only compatibility).
- Dual-read of override keys (`mappingId` then `exerciseId`) covers mixed JSON.

## Optional backfill (run when prod has many legacy rows)

1. Query assignments where `exerciseOverrides` contains `isPatientAdded` or
   `__additionalExercises__`.
2. For each entry without a matching mapping:
   - `addExerciseToExerciseSet` on `assignment.ExerciseSetId` with dosage columns.
   - Remap override entry to the new `mapping.id`.
   - Remove synthetic / `__additionalExercises__` keys.
3. Deploy admin + mobile first; backfill can follow asynchronously.

Scale check before scripting: count distinct assignments with those keys.
