# CRO & Psychology of Design — Senior UX/UI reference (fiziyo-admin, web)

Warstwa "10/10" do skilla `product-designer`: redukcja kosztów interakcji + psychologia decyzji.
Czytaj przy KAŻDEJ implementacji lub redesignie UI w `src/components/`, `src/features/`, `src/app/`.

Podstawy wizualne (8pt grid, tokeny semantyczne, typografia, theme-safe) są w `SKILL.md` i `references/component-patterns.md`.
Ten plik dokłada warstwę konwersji i psychologii — stosuj JĄCZNIE z tokenami (`bg-surface`, `text-foreground`, `border-border`), nigdy zamiast nich.

Zasada nadrzędna: senior nie tylko projektuje wygląd — **zarządza uwagą i minimalizuje koszt interakcji** (poznawczy, fizyczny, czasowy). Interfejs ma prowadzić użytkownika i usuwać wątpliwości na każdym kroku.

Kontekst: to B2B MedTech admin (Premium Utility) — hooki e-commerce/subskrypcyjne stosuj tylko tam, gdzie realnie występują (billing kliniki, plany organizacji). Priorytet: gęstość informacji, szybkość, klawiatura, tabele i formularze.

---

## Workflow: Plan-Validate-Execute

- [ ] **Faza 1 — Friction Audit.** Policz koszty interakcji (poznawczy, fizyczny, czasowy); ile kliknięć/decyzji do celu.
- [ ] **Faza 2 — Cognitive Mapping.** Zmapuj UI na 6 zasad: Defaults, Goal Gradient, Reciprocity, IKEA, Loss Aversion, Contrast.
- [ ] **Faza 3 — Visual Refinement.** Label-value hierarchy, tinted shadows, F-pattern, stany hover/focus, kontrast.
- [ ] **Faza 4 — Final Validation.** Przejdź "Senior Excellence Checklist" (na dole) PRZED oddaniem.

Każda zmiana ma obniżyć koszt interakcji LUB wykorzystać bias, nie pogorszyć spójności z design systemem ani theme-safety.

---

## 6 zasad psychologicznych (Cognitive Mapping)

### 1) Smart Defaults — walka z decision fatigue

- Nigdy pusty formularz. Pre-fill najczęstszym/najbezpieczniejszym wyborem (70-90% userów go nie zmienia).
- Admin: nowy plan/protokół z sensownymi wartościami domyślnymi; filtry tabel z domyślnym zakresem; select z pre-selekcją najczęstszej opcji.
- Default bezpieczny i odwracalny — nigdy nie domyślaj się akcji destrukcyjnej.

### 2) Goal Gradient Effect — momentum przez sztuczny start

- Progress/onboarding/konfiguracja organizacji nie startuje od 0% — pokaż "artificial head start" ("Konto utworzone +20%").
- Admin: setup wizard kliniki, kompletność profilu pacjenta, checklisty wdrożeniowe — startuj częściowo wypełnione.

### 3) Reciprocity — najpierw daj wartość

- Daj realną wartość zanim poprosisz o rejestrację/dane/konfigurację — nie "trzymaj wyniku jako zakładnika".
- Admin: pokaż podgląd raportu/statystyk zanim poprosisz o pełne uzupełnienie danych.

### 4) IKEA Effect + Endowment — zaangażowanie przez współtworzenie

- User ceni to, co współtworzył; inwestycja czasu → poczucie własności.
- Admin: pozwól spersonalizować widok/szablon planu/nazwy przed finalnym zapisem.

### 5) Loss Aversion — ramka straty

- Strata boli ~2x mocniej niż zysk. Framuj utrzymanie tego, co user ma ("Ryzykujesz utratę niezapisanych zmian", "Utracisz konfigurację szablonu").
- Billing organizacji (jeśli dotyczy): dozwolone framing straty dostępu/planu — to warstwa B2B, nie konsument.

### 6) Contrast Effect (Von Restorff / anchoring)

- Jedna wizualna dominanta na widok (primary CTA na monochromatycznym tle — kolor marki tylko dla akcji).
- Nie pokazuj kosztu/opcji w izolacji — zestaw obok droższej opcji, żeby wybór wydał się mały (tylko billing B2B).

---

## Procedury techniczne (web)

### A. Visual hierarchy & scanning

- **Label-Value**: wartość liczbowa większa/grubsza/mocniejsza kontrastowo niż etykieta (`text-2xl font-semibold text-foreground` vs `text-xs text-muted-foreground`). User szuka danych.
- **F/Z-pattern**: kontrolki interakcji (radio/checkbox/akcje) po lewej, zgodnie z porządkiem czytania; najważniejsze u góry-lewej.
- **Recognition over recall**: avatary/zdjęcia profilowe zamiast surowych ID/numerów kont — rozpoznanie zamiast przypominania.
- **Hierarchia wagą i kolorem, nie rozmiarem**: `font-semibold text-foreground` > gigantyczne nagłówki; metadane wyciszaj (`text-muted-foreground`).

### B. Tinted shadows & redukcja szumu

- Cień dopasowany kolorem do tła (na kolorowym tle nasycony ciemny odcień tego koloru, nie czysta czerń). Miękki, niski opacity.
- Zabij zbędne ramki — separacja subtelną różnicą tła (`bg-surface` vs `bg-card`), ramki tylko dla inputów i unoszących się warstw.

### C. Konwersja i "sprzedaż" akcji (gdzie dotyczy)

- **Halo / social proof**: badge ("Zalecane", "Najczęściej używane", "Nowe") NAD tytułem elementu — ramuje percepcję.
- **Precyzja danych**: konkretne liczby ("4.9, 221 ocen", "497 użyć") zamiast okrągłych — autentyczność. Tylko realne dane.
- **Visual swatches zamiast dropdownów**: kluczowe wybory eksponuj jako klikalne karty/segmented/radio-cards, nie chowaj w `<select>` — skanowalne wzrokiem.
- **Reasuring micro-interactions**: tooltip na `:hover`/`:focus` w punkcie wahania (opis opcji, skutek akcji).
- **Dynamic selection cards** (billing B2B): boczne karty wyboru zamiast radio; domyślnie zaznacz największą wartość + odznaka "Najczęściej wybierane".
- **Progressive disclosure**: złożone pakiety/opcje zaawansowane ujawniaj po kliknięciu, nie od razu.
- **Financial transparency** (billing/limity): pokaż "stan po zmianie" (saldo, liczba miejsc, limit) PRZED zatwierdzeniem.
- **Transparency bias / timeline** (billing B2B trial): oś czasu Dziś → Dzień 5 (przypomnienie) → Dzień 7 (opłata) buduje zaufanie.

### D. Micro-interactions bez spowalniania

- Animacje 150-200ms, `transition` powiązany z fizyką UI; zero layout-shiftów na `:hover`.
- Każdy klikalny element ma `:hover` i `:focus-visible` (obsługa klawiatury). Stany nie mogą pogarszać czytelności.

---

## Gotchas (błędy "juniora")

- **"Zero" start**: nie "Brak projektów" → "Zacznij zarządzać projektami" + ilustracja + CTA. Empty state nie jest ślepą uliczką.
- **Range trap**: nie pokazuj zakresów ("13–17 zł") — mózg kotwiczy na górnej liczbie. Jedna konkretna wartość.
- **Transactional copy**: unikaj "Zapisz"/"Wyślij"/"OK" na kluczowej akcji → benefit-driven ("Utwórz plan", "Rozpocznij konfigurację").
- **Hidden options / banery**: nie chowaj kluczowej treści za dropdownem/banerem "Odkryj więcej". Eksponuj bezpośrednio.
- **Wiele dominant**: 1 primary CTA na widok; reszta secondary/ghost.
- **Ikony**: tylko powszechnie znane symbole (lupa = szukaj, nie lornetka).
- **Niski kontrast**: nieaktywne ikony/tekst ≥ 3:1; nie opieraj znaczenia tylko na kolorze (dodaj tekst/ikonę).
- **Dekoracyjna animacja**: każdy ruch = feedback lub przejście, nie ozdoba.

---

## Output template (redesign / code review)

```markdown
### <nazwa elementu / widoku>

- **Current Friction Point**: <błąd juniora, np. "progress startuje od 0%">
- **Senior Transformation**: <zoptymalizowany opis UI lub kod z tokenami>
- **Psychological Driver**: <"why", np. "Goal Gradient Effect">
- **Interaction Cost Delta**: <ile kliknięć/decyzji/czasu oszczędza; np. "-2 kliknięcia">
```

---

## Senior Excellence Checklist (Faza 4 — Final Validation)

- [ ] Friction Audit wykonany — koszt interakcji policzony i obniżony (lub uzasadniony)
- [ ] Label-Value: wartość mocniejsza niż etykieta; kontrolki po lewej (F-pattern)
- [ ] Recognition over recall: avatary/zdjęcia zamiast surowych ID
- [ ] 1 primary CTA na widok; hierarchia wagą i kolorem, nie rozmiarem
- [ ] Smart defaults zamiast pustych formularzy (default bezpieczny i odwracalny)
- [ ] Progress/onboarding nie startuje od 0% (artificial head start gdzie sensowne)
- [ ] Empty states edukują + ilustracja + CTA (żadnego gołego "brak")
- [ ] Brak range trap — konkretne wartości; precyzyjne liczby zamiast okrągłych
- [ ] Kluczowe wybory eksponowane (karty/swatche/radio-cards), nie ukryte w select/banerze
- [ ] Microcopy benefit-driven, nie "Zapisz/OK" na kluczowych akcjach
- [ ] Reasuring micro-interactions (tooltip na hover/focus) w punktach wahania
- [ ] Progressive disclosure dla zaawansowanych opcji
- [ ] Financial transparency / timeline gdzie dotyczy billingu B2B
- [ ] Ikony powszechnie znane; cienie tinted pod tło; zbędne ramki usunięte
- [ ] Stany hover/focus-visible zdefiniowane; zero layout-shift; animacje ≤200ms
- [ ] Kontrast WCAG AA (tekst 4.5:1, UI/inactive 3:1); znaczenie nie tylko kolorem
- [ ] Theme-safe (light + dark) na tokenach semantycznych — zero surowych zinc/gray/slate
