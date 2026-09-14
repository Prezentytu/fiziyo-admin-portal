---
name: principle-boundary-discipline
description: 'Stosuj przy walidacji, adapterze, typie albo sygnaturze. Guard na granicy, zaufanie do typów w środku, stan nielegalny niereprezentowalny. EN - boundary discipline, type system discipline, parse at the edge.'
---

# Boundary discipline

> **Synchronizacja:** źródło w `fizjo-app/.agents/skills/principle-boundary-discipline/SKILL.md`. Przy zmianie zaktualizuj oba repozytoria.

Walidacja, zwężenie typu i obsługa błędu stoją na granicy systemu (sieć, GraphQL, config, CLI). Wewnątrz ufasz typom. Logika biznesowa zostaje czystą funkcją.

- Dane z zewnątrz są nietypowane, dopóki ich nie sparsujesz.
- Nie reeksportuj typów transportu, storage ani frameworka jako powierzchni domeny.
- `any`, `as` i „to nigdy nie nastąpi” oznaczają za słaby typ. Dopnij go na granicy, zamiast kłamać kompilatorowi.
- Stan nielegalny ma się nie dać zbudować. `{ completed: true; completedAt?: Date }` dopuszcza bezsens. Lepszy jest wariant `open | done`.
- Dwa argumenty tego samego prymitywu o różnym znaczeniu (`userId` vs `organizationId`) branduj.

Przykład z `lessons.md`: strony ćwiczenia normalizujesz na granicy odczytu i testujesz override `none`. Zera dawki nie maskujesz przez `||`. `undefined` z `cache-and-network` to nie `null`.
