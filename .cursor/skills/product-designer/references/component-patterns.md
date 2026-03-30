# Component Patterns (FiziYo)

## Preferowana kolejnosc reuzycia

1. `@/components/ui/*` (shadcn primitives)
2. `@/components/shared/*` (wspolne komponenty domenowe)
3. `src/features/*` (lokalne adaptery domenowe)
4. Nowy komponent tylko gdy brak wzorca reuzywalnego

## Wzorce kart i list

- Karty i kontenery buduj na tokenach semantycznych: `bg-card`, `text-foreground`, `border-border`.
- Przyciski glownej akcji musza miec wyrazny kontrast i stan focus.
- Dla list i tabel preferuj istniejace komponenty shared zamiast lokalnych klonow layoutu.

## Wzorce formularzy

- Label bez dopisku "(opcjonalnie)" dla pol optional.
- Komunikaty walidacji musza byc jednoznaczne i zwiazane z polem.
- Sekcje formularza dziel wg celu uzytkownika (nie wg modelu backendu).

## Wzorce dialogow

- Primary action: `Cmd/Ctrl+Enter`.
- Close action: `Escape`.
- Dialog ma byc czytelny w light i dark od pierwszej wersji.

## Dostepnosc (minimum)

- Kontrast tekstu i elementow interaktywnych na poziomie WCAG 2.1 AA.
- Widoczny `focus-visible` dla elementow sterowalnych klawiatura.
- Etykiety i hinty dla pol nie moga byc jedynym nosnikiem informacji przez kolor.
