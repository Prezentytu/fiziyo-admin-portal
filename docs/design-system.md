# Design system panelu (FiziYo v4)

Jedno źródło wyglądu panelu. Kod: `src/app/globals.css` (wartości) i `src/components/ui/*` (prymitywy).
Projekt referencyjny: canvas „FiziYo v4” (https://claude.ai/artifact/5cs5woGBE6Y3vidK2aQRQy), plansza „Main” = tokeny.
Spec: `.ai/specs/SPEC-029-2026-10-15-design-system-v4.md`. Rodzic: design system aplikacji mobilnej (`fizjo-app/docs/design-system/`).

## Zasady

1. **Kolor tylko z tokenów.** Żadnych hexów w `className`/`style`, żadnych palet Tailwinda (`zinc-500`, `emerald-400`). Pilnuje tego `npm run check:design-tokens` (w `validate`); stary dług jest w `.ai/quality/design-token-baseline.json` i może tylko maleć.
2. **Najpierw prymityw.** `Button`, `Card`, `Input`, `Textarea`, `Select`, `Badge`, `Dialog`, `Tabs`, `Switch`, `Checkbox` z `@/components/ui`. Nie nadpisuj im koloru, promienia ani wysokości w `className`; potrzebny nowy wariant → dodaj go w prymitywie.
3. **Hierarchia tłem, nie ramką.** Szare tło ekranu (`bg-grouped`) → biała karta (`bg-card`) → element w karcie (`bg-grouped-tertiary` albo `bg-fill-tertiary`). Ramka tylko dla pól i kart na tym samym tle. Separator wiersza: `border-t border-separator` (0.5 px: `border-t-[0.5px]`).
4. **Jeden kolor akcji.** Zielony (`tint`) tylko na tym, co się klika albo jest zaznaczone. Statusy zawsze z tekstem, nigdy sam kolor.
5. **Oba motywy od pierwszej wersji.** Ciemny = grafit `#111113`, nie czerń.

## Tokeny kolorów

Utility Tailwind = `bg-*`, `text-*`, `border-*` z nazwą tokenu.

| Token                                  | Jasny                 | Ciemny                     | Do czego                            |
| -------------------------------------- | --------------------- | -------------------------- | ----------------------------------- |
| `grouped`                              | `#F2F2F7`             | `#111113`                  | Tło ekranu, sidebar                 |
| `grouped-secondary` = `card`           | `#FFFFFF`             | `#1F1F22`                  | Karta, sekcja, dialog               |
| `grouped-tertiary`                     | `#F2F2F7`             | `#2B2B2F`                  | Element w karcie, popover           |
| `elevated`                             | `#FFFFFF`             | `#38383D`                  | Aktywny segment `Tabs`              |
| `label` = `foreground`                 | `#000000`             | `#FFFFFF`                  | Tekst główny                        |
| `label-secondary` = `muted-foreground` | `#636366`             | `#A1A1A8`                  | Podtytuł, metadane, nagłówek sekcji |
| `label-tertiary`                       | `#86868B`             | `#97979D`                  | Placeholder, chevron, wyłączone     |
| `fill-tertiary`                        | 12% szarości          | 24% szarości               | Pole formularza, przycisk wtórny    |
| `fill-quaternary`                      | 8%                    | 18%                        | Hover wiersza i przycisku ghost     |
| `separator`                            | `rgba(60,60,67,.29)`  | `rgba(84,84,88,.65)`       | Linia między wierszami              |
| `hairline` = `border`                  | 12%                   | 8% bieli                   | Cicha ramka                         |
| `scrim`                                | 32% czerni            | 56% czerni                 | Tło pod dialogiem                   |
| `tint`                                 | `#266B54`             | `#4BB894`                  | Link, ikona aktywna, tekst akcji    |
| `tint-fill` / `on-tint`                | `#266B54` / biały     | `#307F65` / biały          | Główny przycisk, hero               |
| `tint-muted`                           | 10% tint              | 16% tint                   | Zaznaczenie, przycisk `tinted`      |
| `status-success` / `-muted`            | `#266B54`             | `#6BCBA9`                  | Trening dziś, aktywny               |
| `status-warning` / `-muted`            | `#B53A00`             | `#FFB340`                  | Bez treningu 2–3 dni, wygasa        |
| `status-danger` / `-muted` / `-fill`   | `#D70015`             | `#FF7A72` / fill `#D93636` | Bez treningu 4+ dni, usuwanie       |
| `status-info` / `-muted`               | `#0062CC`             | `#4DA3FF`                  | W weryfikacji, informacja           |
| `avatar` / `avatar-label`              | `#D7F5E8` / `#1C5341` | 16% tint / `#91DDC0`       | Inicjały                            |

Kontrast (WCAG AA) sprawdzony dla każdej pary tekst/tło powyżej; `label-tertiary` nie jest kolorem tekstu do czytania.

### Stare nazwy

`surface`, `surface-light`, `muted-foreground`, `border`, `primary`, `success`, `error`, `warning`, `info` działają jako aliasy na tokeny DS, żeby stare ekrany dostały nowy wygląd. W nowym kodzie używaj nazw DS.

- `text-primary` = `tint` (bezpieczny jako tekst). **Wypełnienie marki to `bg-tint-fill text-on-tint`**, nie `bg-primary`.
- `text-destructive` = `status-danger`. Wypełnienie: `bg-status-danger-fill text-on-tint` (albo `Button variant="destructive"`).

## Typografia

Font systemowy (SF Pro na Apple, Segoe UI na Windows). Skala w px, `tracking-tight` dla tytułów.

| Rola             | Klasy                                            | Gdzie                             |
| ---------------- | ------------------------------------------------ | --------------------------------- |
| Tytuł ekranu     | `text-[28px] leading-[34px] font-bold`           | Jeden na ekran                    |
| Tytuł sekcji     | `text-[20px] leading-[25px] font-semibold`       | Nagłówek karty, dialog            |
| Nagłówek wiersza | `text-[17px] font-semibold`                      | `CardTitle`                       |
| Treść            | `text-[15px] leading-[21px]`                     | Wiersze, pola, przyciski          |
| Pomocniczy       | `text-[13px] text-label-secondary`               | Metadane, etykiety pól            |
| Drobny           | `text-[12px] font-semibold text-label-secondary` | Nagłówki grup nawigacji, liczniki |

Liczby w tabelach i statystykach: `tabular-nums`.

## Promienie, wysokości, cienie

| Token   | Wartość | Klasa             | Gdzie                               |
| ------- | ------- | ----------------- | ----------------------------------- |
| badge   | 6 px    | `rounded-badge`   | Miniatura, mała plakietka           |
| control | 12 px   | `rounded-control` | Pole, mały kafel                    |
| card    | 20 px   | `rounded-card`    | Karta, sekcja                       |
| dialog  | 24 px   | `rounded-dialog`  | Dialog                              |
| sheet   | 28 px   | `rounded-sheet`   | Arkusz, duży kafel z mediami        |
| full    | —       | `rounded-full`    | Przyciski, chipy, plakietki statusu |

Wysokości: przycisk `sm` 32 px, domyślny 44 px, `lg` 52 px; pole 44 px; wiersz listy min. 44 px. Ikona-przycisk 36 px z obszarem kliknięcia 44 px.

Cienie: karty płaskie. `shadow-raised` (aktywny segment, kciuk przełącznika), `shadow-floating` (menu, popover, toast), `shadow-dialog` (dialog).

Odstępy: siatka 4 px (`gap-1` = 4, `gap-2` = 8, `p-4` = 16, `p-6` = 24).

## Prymitywy

| Komponent                          | Warianty                                                                                                                                | Uwagi                                                                                                      |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `Button`                           | `default` (tint-fill), `tinted`, `secondary` (szary), `outline`, `ghost`, `destructive`, `link`; rozmiary `sm`, `default`, `lg`, `icon` | Kapsuła. Jeden `default` na widok.                                                                         |
| `Card`                             | —                                                                                                                                       | `rounded-card bg-card`, bez ramki i cienia                                                                 |
| `Input`, `Textarea`, `Select`      | —                                                                                                                                       | Wypełnienie `bg-input` (= `fill-tertiary`), ring `tint` na focus, ring `status-danger` przy `aria-invalid` |
| `Badge`                            | `default` (tint-muted), `solid`, `secondary`, `success`, `warning`, `destructive`, `info`, `outline`                                    | Kapsuła, zawsze z tekstem                                                                                  |
| `Dialog`, `AlertDialog`            | —                                                                                                                                       | `rounded-dialog`, tło `scrim`; stopka: `Anuluj` po lewej, akcja po prawej (sam przycisk ląduje po prawej)  |
| `Tabs`                             | `activeVariant`: `surface` (segment), `subtle`, `accent`, `success`, `warning`, `destructive`                                           | Kontrolka segmentowa                                                                                       |
| `Switch`, `Checkbox`, `RadioGroup` | —                                                                                                                                       | Zaznaczenie = `tint-fill`                                                                                  |

## Wzorce

- **Ekran:** tytuł 28 px + podtytuł `label-secondary`, akcja główna po prawej; treść w kartach na `bg-grouped`.
- **Lista:** wiersze w jednej karcie, separator `border-t border-separator` między nimi (nie ramka wokół każdego wiersza), hover `bg-fill-quaternary`.
- **Status pacjenta:** kropka + tekst; 0–1 dni `status-success`, 2–3 `status-warning`, 4+ `status-danger` (na górę listy), brak aktywności = pusta szara kropka.
- **Pusty stan:** ikona, jedno zdanie, jedna akcja (`Button default`).
- **Kolejność w stopce dialogu:** `Anuluj` (`secondary`) po lewej, CTA po prawej; `⌘/Ctrl + Enter` = CTA, `Esc` = zamknij.

## Do / Nie

| Do                                            | Nie                                                    |
| --------------------------------------------- | ------------------------------------------------------ |
| `bg-tint-fill text-on-tint`                   | `bg-primary text-white`, `bg-[#266b54]`                |
| `text-label-secondary`                        | `text-zinc-500`, `text-gray-400`                       |
| `bg-status-warning-muted text-status-warning` | `bg-amber-500/20 text-amber-400`                       |
| `border-t border-separator` między wierszami  | `border rounded-xl` wokół każdego wiersza              |
| `<Button variant="secondary">`                | `<Button className="bg-surface-light rounded-lg h-9">` |
| Nowy wariant w `src/components/ui/*`          | Lokalny klon przycisku w feature                       |
