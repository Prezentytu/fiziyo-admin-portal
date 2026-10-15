---
spec: SPEC-029
repo: fiziyo-admin-portal
issues: []
prs: []
board:
---

# Design system v4 w panelu

## Cel biznesowy

Panel ma wyglądać jak projekt z canvasu „FiziYo v4” i dzielić język wizualny z aplikacją mobilną (design system FiziYo z `fizjo-app/docs/design-system/`). Nowe komponenty mają brać wygląd z jednego miejsca, żeby spójność nie zależała od pamięci autora.

Źródło wyglądu: canvas https://claude.ai/artifact/5cs5woGBE6Y3vidK2aQRQy (plansza „Main” = specyfikacja tokenów, plansze ekranów = docelowy układ).

## Architektura

Trzy warstwy, jak w design systemie mobile:

1. **Tokeny** (`src/app/globals.css`): wartości dla motywu ciemnego w `:root`, jasnego w `.light-theme`. Nazwy DS (`grouped`, `label-secondary`, `fill-tertiary`, `separator`, `tint`, `tint-fill`, `status-*`) są nowe; stare nazwy semantyczne (`surface`, `muted-foreground`, `border`, `primary`…) zostają jako aliasy na te same wartości, więc istniejące ekrany dostają nowy wygląd bez zmian w plikach (additive-first).
2. **Prymitywy** (`src/components/ui/*`): `Button` (kapsuła, 44 px), `Card` (promień 20, płasko, bez ramki), `Input`/`Textarea`/`Select` (wypełnienie `fill-tertiary`, promień 12, 44 px), `Badge` (plakietka statusu), `Dialog` (promień 24, stopka Anuluj po lewej), `Tabs`.
3. **Powłoka** (`src/app/(dashboard)/layout.tsx`, `Sidebar`): nawigacja i treść na tle `grouped`, karty `card` na nim (inset grouped). Arkusz `card` z marginesem 8 px wchodzi razem z przebudową układu ekranów, bo stare ekrany z kartami `bg-surface` zlałyby się z arkuszem.

### Decyzje

| Decyzja                                                     | Dlaczego                                                                                                                                                                                                                                                                                     |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ciemny motyw na grafit `#111113`, nie czerń                 | Czerń na monitorze wygląda jak dziura; ustalone na review dark mode. Mobile (iOS) zostaje przy czerni.                                                                                                                                                                                       |
| `primary` = tekst (`tint`); wypełnienie marki = `tint-fill` | W dark jeden kolor nie daje 4.5:1 jednocześnie dla białego tekstu na przycisku i zielonego tekstu na karcie. Tailwind v4 nie pozwala nadpisać `text-primary` osobno, więc legacy `bg-primary` w dark ma ciemny `primary-foreground`, a nowe wypełnienia używają `bg-tint-fill text-on-tint`. |
| `destructive` = tekst; wypełnienie = `status-danger-fill`   | Ten sam powód co wyżej.                                                                                                                                                                                                                                                                      |
| Font systemowy zamiast Outfit                               | DS FiziYo = SF Pro / system-ui; mniej pobieranych fontów.                                                                                                                                                                                                                                    |
| Ramki ciche, separator 0.5 px osobno                        | DS: hierarchię robi kontrast tła, nie ramki.                                                                                                                                                                                                                                                 |
| Wartości kolorów tylko w `globals.css`                      | Jedno źródło; `npm run check:design-tokens` (w `validate`) blokuje nowe hexy i palety Tailwinda, baza długu może tylko maleć.                                                                                                                                                                |

## Interfejsy

### Komponenty

| Komponent                 | Lokalizacja                    | Opis                                                                                                                                  |
| ------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Tokeny                    | `src/app/globals.css`          | Wartości light/dark + mapowanie `@theme`                                                                                              |
| Button                    | `src/components/ui/button.tsx` | Warianty `default`, `secondary`, `tinted`, `outline`, `ghost`, `destructive`, `link`; rozmiary `sm` 32, `default` 44, `lg` 52, `icon` |
| Card                      | `src/components/ui/card.tsx`   | Płaska karta `rounded-card bg-card`                                                                                                   |
| Input / Textarea / Select | `src/components/ui/*`          | Wypełnione pole 44 px                                                                                                                 |
| Badge                     | `src/components/ui/badge.tsx`  | Statusy `success`, `warning`, `danger`, `info`, `neutral`, `tint`                                                                     |
| Dokumentacja              | `docs/design-system.md`        | Tokeny, komponenty, zasady, do/don't                                                                                                  |

## Data-testid

Bez zmian. Prymitywy przekazują `data-testid` dalej.

## Verification plan

- `npm run validate` (lint, test IDs, type-check, testy, build).
- Render lokalny ekranów Panel, Pacjenci, Karta pacjenta, Zestawy w light i dark; porównanie z canvasem.
- E2E `fiziyo-tests` na PR (gate UI); selektory oparte na `data-testid` nie zmieniają się.

## Plan etapów

1. Fundament: tokeny, font, prymitywy, powłoka, dokumentacja, guard. (ten etap)
2. Ekrany główne wg canvasu: Panel, Pacjenci, Karta pacjenta, Zestawy.
3. Kreator przypisania (4 kroki), dialogi.
4. Pozostałe ekrany i usunięcie martwych tokenów (`violet`, `glow`, `mint`) po migracji.

## Changelog

### 2026-10-15

- Utworzenie specyfikacji; etap 1.
