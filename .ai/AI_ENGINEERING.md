# AI_ENGINEERING.md

Zasady utrzymania AI Agentic Engineering w FiziYo Admin.

## Warstwy systemu

```text
AGENTS.md                      -> glowny router zadan i workflow
.ai/specs/                     -> spec-first dla zmian nietrywialnych
.ai/skills/                    -> canonical source of truth dla skills
.ai/{ECOSYSTEM,DOMAIN_MODEL,DATA_FLOWS,STRUCTURE}.md -> kontekst domenowy
.ai/lessons.md                 -> pamiec regresji i zasad zapobiegawczych
.cursor/rules/*.mdc            -> lekkie reguly runtime dla Cursora
.cursor/skills/, .agents/skills/ -> lokalne kopie generowane z `.ai/skills/`
```

## Source of truth

- Edytuj skille tylko w `.ai/skills/`.
- Synchronizuj obie kopie przez `npm run skills:sync`, potem `npm run skills:check`.
- Trzymaj runtime rules w `.cursor/rules/*.mdc`.
- Zmiany kontraktowe oceniaj przez `BACKWARD_COMPATIBILITY.md`.

## Standard pracy agenta

- Zaczynaj od `AGENTS.md` i Task Routera.
- Dla zadan nietrywialnych pracuj spec-first.
- Przed implementacją wyszukaj słowa zadania przez `rg` w `.ai/lessons.md`.
- Zmieniaj minimalnie, testuj proporcjonalnie do ryzyka.
- Po istotnej korekcie dopisuj nowy lesson, jesli problem moze sie powtorzyc.

## Weryfikacja setupu AI

- Po zmianach w skillach: `skills:lint`, `skills:sync`, `skills:check`; zmiany synchronizatora sprawdź też przez `skills:test`.
- Po zmianach architektonicznych sprawdz spojnosci:
  - `AGENTS.md`
  - `.cursor/rules/*.mdc`
  - `.ai/skills/README.md`
  - `BACKWARD_COMPATIBILITY.md`, jesli zmiana dotyka kontraktu

## Dodawanie skilla

1. Utworz folder w `.ai/skills/<nazwa>/`.
2. Dodaj `SKILL.md` z frontmatter (`name`, `description`).
3. Zaktualizuj `.ai/skills/README.md`.
4. Jesli skill ma byc routowany globalnie, dopisz wpis w `AGENTS.md`.
5. Zaktualizuj manifest i uruchom `npm run skills:lint`, `npm run skills:sync`, `npm run skills:check`.

## Dodawanie rule

1. Dodaj plik `.cursor/rules/<nazwa>.mdc`.
2. Trzymaj rule krotko: runtime hint, nie dokumentacja.
3. Szczegoly domenowe trzymaj w `.ai/*`.
4. Po zmianie sprawdz spojność z `AGENTS.md`.

Runy, handoff, role i dowody cross-repo: [workflow](../docs/architecture/agent-workflow.md).
