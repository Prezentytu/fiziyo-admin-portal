---
name: skill-creator
description: Scaffold nowego skilla zgodnego z konwencjami FiziYo. Użyj gdy użytkownik prosi - utwórz nowy skill, dodaj skill do projektu, napisz SKILL.md, dodaj umiejętność agenta, zrób szablon skilla, zaktualizuj manifest skilli. EN triggers - create new skill, scaffold skill, add agent capability, SKILL.md template. Wynik to katalog skilla z frontmatter (trigger words PL+EN), wpisem w manifest.json i przejsciem skills:lint.
---

# Skill: Skill Creator (FiziYo)

Tworzy nowe skille w konwencji FiziYo i pilnuje, żeby były auto-triggerowalne.

## Workflow

1. Utwórz katalog `.ai/skills/<skill-name>/`.
2. Dodaj `SKILL.md` z frontmatter:
   - `name`,
   - `description` z trigger words PL+EN i spodziewanym wynikiem.
3. Jeżeli skill ma reguły domenowe, dodaj `references/`.
4. Dodaj skill do `.ai/skills/manifest.json` (właściwy tier).
5. Zaktualizuj `.ai/skills/README.md`.
6. Uruchom:
   - `npm run skills:lint`,
   - `npm run skills:sync`.

## Definition of done

- Skill ma jednoznaczny cel operacyjny (wykonuje pracę, nie tylko opisuje).
- Frontmatter przechodzi walidację manifest/lint.
- Skill jest odkrywalny przez trigger words w obu językach.
