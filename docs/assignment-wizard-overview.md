# Wizard Przypisywania Zestawów Ćwiczeń

## Cel biznesowy

Wizard służy do **przypisywania zestawów ćwiczeń pacjentom**. Jest to główny flow pracy fizjoterapeuty w aplikacji - zamiast tworzyć program ćwiczeń od zera dla każdego pacjenta, fizjo może:

1. Wybrać gotowy szablon z biblioteki
2. Dostosować go do potrzeb konkretnego pacjenta
3. Ustawić harmonogram (częstotliwość, okres)
4. Przypisać jednocześnie do wielu pacjentów

**Efekt końcowy:** Pacjent otrzymuje przypisanie zestawu (szablonu lub planu spersonalizowanego) w aplikacji mobilnej.

## Aktualny model decyzyjny (hybryda)

Wizard nie zawsze tworzy nowy plan spersonalizowany. Decyzja zależy od typu zmian:

- **Przypisanie do istniejącego szablonu** (bez tworzenia `PATIENT_PLAN`):
  - zmiana harmonogramu i dat
  - zmiana parametrów wykonania istniejących ćwiczeń (serie, powtórzenia, czas, przerwy, tempo, obciążenie, notatki)
- **Utworzenie nowego planu spersonalizowanego** (`PATIENT_PLAN`):
  - zmiana kolejności ćwiczeń
  - dodanie lub usunięcie ćwiczeń
  - zmiana nazwy planu
  - zmiana nazwy/opisu ćwiczenia
  - włączenie „Zapisz kopię jako mój szablon”

Wariant lekki zapisuje różnice na poziomie `PatientAssignment` (assignment-level customization), dzięki czemu przypisanie pozostaje na oryginalnym szablonie.

---

## Kiedy otwiera się wizard?

Wizard można uruchomić z dwóch miejsc:

| Miejsce                                   | Tryb         | Co jest predefiniowane      |
| ----------------------------------------- | ------------ | --------------------------- |
| **Strona pacjenta** → "Przypisz zestaw"   | from-patient | Pacjent jest już wybrany    |
| **Strona zestawu** → "Przypisz pacjentom" | from-set     | Zestaw jest już wybrany     |
| **Dashboard** → "Przypisz zestaw"         | from-patient | Nic nie jest predefiniowane |

---

## Kroki wizarda

```
┌─────────────────────────────────────────────────────────────────┐
│  KROK 1        KROK 2         KROK 3        KROK 4      KROK 5  │
│  ●────────────○────────────○────────────○────────────○          │
│  Zestaw      Pacjenci    Personalizacja  Harmonogram  Podsumow. │
└─────────────────────────────────────────────────────────────────┘
```

### Krok 1: Wybór zestawu ćwiczeń

**Cel:** Fizjo wybiera zestaw ćwiczeń, który chce przypisać.

**Opcje:**

- **Wybór z biblioteki** - kliknięcie na istniejący szablon
- **Stwórz nowy** - natychmiastowe utworzenie pustego zestawu (bez formularza!)

**Layout:**

```
┌─────────────────────────┬───────────────────────────────────────┐
│  LISTA ZESTAWÓW         │  PODGLĄD / BUILDER                    │
│                         │                                       │
│  [+ Stwórz nowy]        │  Nazwa zestawu                        │
│  ─────────────────      │  ─────────────────────────────────    │
│  Kolano Standard  5ćw.  │  1. Przysiad        3x10              │
│  Plecy Basic      3ćw.  │  2. Martwy ciąg     3x8               │
│  Kręgosłup Pro    8ćw.  │  3. Deska           30s               │
│                         │                                       │
│                         │  Szacowany czas: 12 min               │
└─────────────────────────┴───────────────────────────────────────┘
```

#### Tryby pracy w prawym panelu

**A) Tryb SZABLON** (gdy wybrany zestaw ma ćwiczenia)

- Nazwa zestawu: tylko do odczytu
- Lista ćwiczeń: można tylko **ukrywać** (Eye/EyeOff), nie usuwać
- Brak wyszukiwarki do dodawania
- Przycisk **"Dostosuj"** → tworzy kopię do pełnej edycji

_Dlaczego?_ Szablony to "święte zasoby" - nie chcemy ich przypadkowo zepsuć podczas przypisywania.

**B) Tryb DRAFT** (gdy stworzono nowy lub po "Dostosuj")

- Nazwa zestawu: edytowalna
- Lista ćwiczeń: pełny CRUD (dodaj, usuń)
- **Rapid Builder** - wyszukiwarka z Enter do szybkiego dodawania
- Checkbox "Zapisz jako szablon" w stopce

---

### Krok 2: Wybór pacjentów

**Cel:** Fizjo wybiera pacjentów, którym przypisuje zestaw.

**Funkcje:**

- Wyszukiwanie pacjentów
- Multi-select (można wybrać wielu naraz)
- Widoczność już przypisanych (szare, z badge "Przypisany")
- Możliwość odpisania bezpośrednio z listy

```
┌─────────────────────────┬───────────────────────────────────────┐
│  LISTA PACJENTÓW        │  WYBRANI PACJENCI                     │
│                         │                                       │
│  🔍 Szukaj...           │  ✓ Anna Kowalska                      │
│  ─────────────────      │  ✓ Jan Nowak                          │
│  ☐ Anna Kowalska        │                                       │
│  ☐ Jan Nowak            │  2 pacjentów wybranych                │
│  ☑ Maria Wiśniewska     │                                       │
│    (Przypisany)         │                                       │
└─────────────────────────┴───────────────────────────────────────┘
```

---

### Krok 3: Personalizacja ćwiczeń

**Cel:** Dostosowanie ćwiczeń i określenie, czy przypisanie zostaje na szablonie czy materializuje się jako plan spersonalizowany.

**Co można zmienić:**

- Liczba serii / powtórzeń
- Czas trwania
- Notatki dla pacjenta
- Ukrycie pojedynczych ćwiczeń

Ten krok określa także tryb końcowy:

- brak zmian strukturalnych -> przypisanie do szablonu
- zmiany strukturalne/tożsamościowe -> utworzenie planu spersonalizowanego

---

### Krok 4: Harmonogram

**Cel:** Ustalenie okresu i częstotliwości wykonywania ćwiczeń.

**Pola:**

- **Data rozpoczęcia** (domyślnie: dziś)
- **Data zakończenia** (domyślnie: +30 dni)
- **Częstotliwość:**
  - Ile razy dziennie
  - Które dni tygodnia
  - Przerwy między seriami

```
┌─────────────────────────────────────────────────────────────────┐
│  OKRES                                                          │
│  Od: [22.01.2026]  Do: [22.02.2026]  (30 dni)                   │
│                                                                 │
│  CZĘSTOTLIWOŚĆ                                                  │
│  Razy dziennie: [2]                                             │
│                                                                 │
│  DNI TYGODNIA                                                   │
│  [✓] Pon  [✓] Wt  [✓] Śr  [✓] Czw  [✓] Pt  [○] Sob  [○] Nd    │
└─────────────────────────────────────────────────────────────────┘
```

---

### Krok 5: Podsumowanie

**Cel:** Przegląd wszystkiego przed zatwierdzeniem.

**Zawiera:**

- Wybrany zestaw i liczba ćwiczeń
- Lista wybranych pacjentów
- Okres i częstotliwość
- Przycisk "Przypisz do X pacjentów"

**Po zatwierdzeniu:**

1. Zestaw zostaje przypisany każdemu pacjentowi
2. Pojawia się **dialog sukcesu** z QR kodem do pobrania aplikacji
3. Pacjent widzi ćwiczenia w aplikacji mobilnej

---

## Kluczowe funkcjonalności

### 1. Phantom Set (Natychmiastowe tworzenie)

**Problem:** Fizjo chce stworzyć nowy zestaw, ale nie chce wychodzić z wizarda.

**Rozwiązanie:** Przycisk "Stwórz nowy" natychmiast tworzy pusty zestaw z nazwą:

- `"Terapia dla {Pacjent} - {Data}"` (jeśli pacjent predefiniowany)
- `"Nowy zestaw - {Data}"` (bez pacjenta)

**Smart Draft Logic:** Jeśli pusty szkic z dzisiaj już istnieje → otwiera go zamiast tworzyć duplikat.

---

### 2. Rapid Builder (Szybkie dodawanie)

**Problem:** Fizjo chce szybko zbudować zestaw bez przeklikiwania.

**Rozwiązanie:** Command Bar z wyszukiwarką:

1. Wpisz "Przysiad"
2. Strzałka ↓ do nawigacji
3. Enter → ćwiczenie ląduje na liście z domyślnymi parametrami

**Time Counter:** Na dole widoczny szacowany czas wykonania zestawu.

---

### 3. Template vs Draft Mode

**Problem:** Fizjo przypadkowo edytuje szablon i niszczy go dla wszystkich.

**Rozwiązanie:** Dwa tryby:

| Tryb         | Kiedy                | Co można                             |
| ------------ | -------------------- | ------------------------------------ |
| **Template** | Zestaw z ćwiczeniami | Tylko ukrywanie, przycisk "Dostosuj" |
| **Draft**    | Nowy/pusty zestaw    | Pełna edycja CRUD                    |

**Przycisk "Dostosuj":** Tworzy kopię szablonu do pełnej edycji (Fork). Oryginał zostaje nienaruszony.

---

### 4. Ukrywanie ćwiczeń

**Problem:** Fizjo chce pominąć jedno ćwiczenie dla konkretnego pacjenta, ale nie usuwać go z szablonu.

**Rozwiązanie:** Ikona Eye/EyeOff ukrywa ćwiczenie tylko dla tego przypisania. Szablon zostaje nienaruszony.

---

## Przykładowe scenariusze użycia

### Scenariusz 1: Standardowe przypisanie

1. Fizjo otwiera stronę pacjenta → "Przypisz zestaw"
2. Wybiera szablon "Kolano po operacji"
3. Ukrywa 2 ćwiczenia (za trudne dla tego pacjenta)
4. Ustawia harmonogram: 30 dni, 2x dziennie
5. Zatwierdza → Pacjent dostaje ćwiczenia

**Czas:** ~30 sekund

---

### Scenariusz 2: Tworzenie od zera

1. Fizjo otwiera dashboard → "Przypisz zestaw"
2. Klika "Stwórz nowy"
3. Wpisuje w wyszukiwarkę kolejne ćwiczenia (Enter, Enter, Enter)
4. Zaznacza checkbox "Zapisz jako szablon"
5. Wybiera pacjenta
6. Ustawia harmonogram
7. Zatwierdza

**Efekt:** Pacjent ma ćwiczenia + fizjo ma nowy szablon w bibliotece

---

### Scenariusz 3: Dostosowanie szablonu

1. Fizjo wybiera szablon "Kręgosłup Standard"
2. Chce dodać jedno specjalne ćwiczenie
3. Klika "Dostosuj" → tworzy się kopia
4. Dodaje nowe ćwiczenie przez wyszukiwarkę
5. Przypisuje pacjentowi

**Efekt:** Pacjent ma dostosowany zestaw, oryginalny szablon nienaruszony

---

## Metryki sukcesu

| Metryka                        | Cel         |
| ------------------------------ | ----------- |
| Czas przypisania standardowego | < 30 sekund |
| Czas tworzenia nowego zestawu  | < 60 sekund |
| Liczba kliknięć do przypisania | ≤ 5         |
| Błędy "zniszczenia szablonu"   | 0           |

---

## FAQ dla PO

**Q: Dlaczego nie można edytować szablonów bezpośrednio?**
A: Żeby chronić "bazę wiedzy" fizjoterapeuty. Edycja szablonu w wizardzie zepsuła by go dla wszystkich przyszłych pacjentów.

**Q: Co jeśli fizjo chce zaktualizować szablon?**
A: Musi wejść na stronę zestawu ćwiczeń (poza wizardem) i tam dokonać zmian świadomie.

**Q: Czy ukryte ćwiczenia są trwale usunięte?**
A: Nie. Są tylko "wyłączone" dla tego konkretnego przypisania. Szablon pozostaje pełny.

**Q: Co oznacza checkbox "Zapisz jako szablon"?**
A: Nowo utworzony zestaw zostanie dodany do biblioteki i będzie dostępny do ponownego użycia.
