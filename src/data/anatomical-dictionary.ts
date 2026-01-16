/**
 * Słownik anatomiczny - zamknięta lista tagów dla ćwiczeń
 *
 * Zasada: Ekspert MUSI wybierać z tej listy, nie może wpisywać ręcznie.
 * To zapewnia spójność danych i poprawne filtrowanie w aplikacji.
 *
 * Struktura:
 * - BODY_PARTS: Partie ciała (główne kategorie)
 * - MUSCLES: Konkretne mięśnie
 * - JOINTS: Stawy
 * - EQUIPMENT: Sprzęt
 * - EXERCISE_GOALS: Cele ćwiczenia
 * - DIFFICULTY_LEVELS: Poziomy trudności
 */

// ============================================
// PARTIE CIAŁA (główne kategorie)
// ============================================

export const BODY_PARTS = [
  // Górna część ciała
  "Głowa i szyja",
  "Barki",
  "Ramiona",
  "Przedramiona",
  "Nadgarstki i dłonie",
  "Klatka piersiowa",
  "Plecy górne",
  "Plecy dolne",

  // Tułów
  "Brzuch",
  "Core (mięśnie głębokie)",
  "Kręgosłup",
  "Miednica",

  // Dolna część ciała
  "Biodra",
  "Uda",
  "Kolana",
  "Podudzia",
  "Kostki",
  "Stopy",

  // Ogólne
  "Całe ciało",
] as const;

export type BodyPart = typeof BODY_PARTS[number];

// ============================================
// MIĘŚNIE
// ============================================

export const MUSCLES = [
  // Szyja
  "Mięsień mostkowo-obojczykowo-sutkowy",
  "Mięśnie karku",
  "Mięśnie głębokie szyi",

  // Barki
  "Mięsień naramienny (deltoid)",
  "Mięsień naramienny - przedni",
  "Mięsień naramienny - środkowy",
  "Mięsień naramienny - tylny",
  "Mięsień czworoboczny (trapezius)",
  "Mięsień czworoboczny - górna część",
  "Mięsień czworoboczny - środkowa część",
  "Mięsień czworoboczny - dolna część",
  "Rotatory barku",
  "Mięsień nadgrzebieniowy",
  "Mięsień podgrzebieniowy",
  "Mięsień podłopatkowy",
  "Mięsień obły mniejszy",

  // Ramiona
  "Mięsień dwugłowy ramienia (biceps)",
  "Mięsień trójgłowy ramienia (triceps)",
  "Mięsień ramienny",
  "Mięsień ramienno-promieniowy",

  // Przedramiona
  "Zginacze nadgarstka",
  "Prostowniki nadgarstka",
  "Mięśnie przedramienia",

  // Klatka piersiowa
  "Mięsień piersiowy większy (pectoralis major)",
  "Mięsień piersiowy mniejszy",
  "Mięsień zębaty przedni",

  // Plecy
  "Mięsień najszerszy grzbietu (latissimus dorsi)",
  "Mięsień równoległoboczny (rhomboideus)",
  "Mięsień prostownik grzbietu (erector spinae)",
  "Mięśnie przykręgosłupowe",
  "Mięsień wielodzielny",

  // Core / Brzuch
  "Mięsień prosty brzucha (rectus abdominis)",
  "Mięśnie skośne brzucha",
  "Mięsień skośny zewnętrzny",
  "Mięsień skośny wewnętrzny",
  "Mięsień poprzeczny brzucha",
  "Przepona",
  "Mięśnie dna miednicy",

  // Biodra / Pośladki
  "Mięsień pośladkowy wielki (gluteus maximus)",
  "Mięsień pośladkowy średni (gluteus medius)",
  "Mięsień pośladkowy mały",
  "Mięsień gruszkowaty (piriformis)",
  "Mięsień biodrowo-lędźwiowy (iliopsoas)",
  "Zginacze biodra",
  "Rotatory zewnętrzne biodra",
  "Mięsień naprężacz powięzi szerokiej (TFL)",

  // Uda - przód
  "Mięsień czworogłowy uda (quadriceps)",
  "Mięsień prosty uda",
  "Mięsień obszerny boczny",
  "Mięsień obszerny przyśrodkowy",
  "Mięsień obszerny pośredni",

  // Uda - tył
  "Mięśnie kulszowo-goleniowe (hamstrings)",
  "Mięsień dwugłowy uda",
  "Mięsień półścięgnisty",
  "Mięsień półbłoniasty",

  // Uda - wewnętrzna
  "Przywodziciele (adductors)",
  "Mięsień przywodziciel wielki",
  "Mięsień przywodziciel długi",
  "Mięsień smukły (gracilis)",

  // Uda - zewnętrzna
  "Odwodziciele (abductors)",
  "Pasmo biodrowo-piszczelowe (IT band)",

  // Podudzia
  "Mięsień brzuchaty łydki (gastrocnemius)",
  "Mięsień płaszczkowaty (soleus)",
  "Mięsień piszczelowy przedni",
  "Mięśnie strzałkowe",

  // Stopy
  "Mięśnie wewnętrzne stopy",
  "Mięśnie podeszwy stopy",
] as const;

export type Muscle = typeof MUSCLES[number];

// ============================================
// STAWY
// ============================================

export const JOINTS = [
  "Staw barkowy",
  "Staw łokciowy",
  "Staw nadgarstkowy",
  "Stawy palców ręki",
  "Kręgosłup szyjny",
  "Kręgosłup piersiowy",
  "Kręgosłup lędźwiowy",
  "Staw krzyżowo-biodrowy (SI)",
  "Staw biodrowy",
  "Staw kolanowy",
  "Staw skokowy",
  "Stawy stopy",
] as const;

export type Joint = typeof JOINTS[number];

// ============================================
// SPRZĘT
// ============================================

export const EQUIPMENT = [
  "Bez sprzętu",
  "Mata",
  "Piłka gimnastyczna",
  "Piłka do masażu",
  "Roller (wałek)",
  "Guma oporowa",
  "Taśma oporowa (loop)",
  "Hantle",
  "Kettlebell",
  "Sztanga",
  "TRX / taśmy suspensyjne",
  "Ławka",
  "Stoper / podwyższenie",
  "Ściana",
  "Krzesło",
  "Drążek",
  "Bosu",
  "Balance board",
  "Klocki do jogi",
  "Pasek do jogi",
  "Elastyczna opaska",
  "Ciężarki na kostki",
  "Ekspander",
] as const;

export type Equipment = typeof EQUIPMENT[number];

// ============================================
// CELE ĆWICZENIA
// ============================================

export const EXERCISE_GOALS = [
  // Typ ćwiczenia
  "Rozciąganie",
  "Wzmacnianie",
  "Mobilizacja",
  "Stabilizacja",
  "Oddychanie",
  "Relaksacja",
  "Koordynacja",
  "Równowaga",
  "Propriocepcja",

  // Specyficzne cele
  "Rozgrzewka",
  "Rozluźnienie",
  "Prewencja urazów",
  "Rehabilitacja pourazowa",
  "Poprawa postawy",
  "Redukcja bólu",
  "Zwiększenie zakresu ruchu",
  "Budowanie siły",
  "Wytrzymałość mięśniowa",
] as const;

export type ExerciseGoal = typeof EXERCISE_GOALS[number];

// ============================================
// POZIOMY TRUDNOŚCI
// ============================================

export const DIFFICULTY_LEVELS = [
  "Początkujący",
  "Średniozaawansowany",
  "Zaawansowany",
  "Ekspert",
] as const;

export type DifficultyLevel = typeof DIFFICULTY_LEVELS[number];

// ============================================
// TAGI GŁÓWNE (połączenie najważniejszych)
// ============================================

/**
 * Główne tagi - używane do kategoryzacji ćwiczeń
 * Połączenie: partie ciała + cele + trudność
 */
export const MAIN_TAGS = [
  ...BODY_PARTS,
  ...EXERCISE_GOALS,
  ...DIFFICULTY_LEVELS,
] as const;

export type MainTag = typeof MAIN_TAGS[number];

/**
 * Tagi dodatkowe - bardziej szczegółowe
 * Połączenie: mięśnie + stawy + sprzęt
 */
export const ADDITIONAL_TAGS = [
  ...MUSCLES,
  ...JOINTS,
  ...EQUIPMENT,
] as const;

export type AdditionalTag = typeof ADDITIONAL_TAGS[number];

/**
 * Wszystkie tagi - pełny słownik
 */
export const ALL_TAGS = [
  ...MAIN_TAGS,
  ...ADDITIONAL_TAGS,
] as const;

export type AnyTag = typeof ALL_TAGS[number];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Sprawdza czy tag jest prawidłowy (istnieje w słowniku)
 */
export function isValidTag(tag: string): boolean {
  return ALL_TAGS.includes(tag as AnyTag);
}

/**
 * Sprawdza czy tag jest tagiem głównym
 */
export function isMainTag(tag: string): boolean {
  return MAIN_TAGS.includes(tag as MainTag);
}

/**
 * Sprawdza czy tag jest tagiem dodatkowym
 */
export function isAdditionalTag(tag: string): boolean {
  return ADDITIONAL_TAGS.includes(tag as AdditionalTag);
}

/**
 * Filtruje listę tagów, pozostawiając tylko prawidłowe
 */
export function filterValidTags(tags: string[]): string[] {
  return tags.filter(isValidTag);
}

/**
 * Zwraca kategorię tagu
 */
export function getTagCategory(tag: string): string | null {
  if (BODY_PARTS.includes(tag as BodyPart)) return "Partie ciała";
  if (MUSCLES.includes(tag as Muscle)) return "Mięśnie";
  if (JOINTS.includes(tag as Joint)) return "Stawy";
  if (EQUIPMENT.includes(tag as Equipment)) return "Sprzęt";
  if (EXERCISE_GOALS.includes(tag as ExerciseGoal)) return "Cele";
  if (DIFFICULTY_LEVELS.includes(tag as DifficultyLevel)) return "Trudność";
  return null;
}

/**
 * Grupuje tagi według kategorii
 */
export function groupTagsByCategory(tags: string[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {
    "Partie ciała": [],
    "Mięśnie": [],
    "Stawy": [],
    "Sprzęt": [],
    "Cele": [],
    "Trudność": [],
    "Inne": [],
  };

  for (const tag of tags) {
    const category = getTagCategory(tag);
    if (category) {
      groups[category].push(tag);
    } else {
      groups["Inne"].push(tag);
    }
  }

  return groups;
}

/**
 * Kolor dla kategorii tagu (dla UI)
 */
export function getTagCategoryColor(tag: string): string {
  const category = getTagCategory(tag);
  switch (category) {
    case "Partie ciała":
      return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    case "Mięśnie":
      return "bg-purple-500/10 text-purple-600 border-purple-500/20";
    case "Stawy":
      return "bg-cyan-500/10 text-cyan-600 border-cyan-500/20";
    case "Sprzęt":
      return "bg-zinc-500/10 text-zinc-600 border-zinc-500/20";
    case "Cele":
      return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    case "Trudność":
      return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

/**
 * Wyszukuje tagi pasujące do query
 */
export function searchTags(query: string, source: readonly string[] = ALL_TAGS): string[] {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) return [...source];

  return source.filter((tag) =>
    tag.toLowerCase().includes(normalizedQuery)
  );
}

/**
 * Zwraca sugerowane tagi na podstawie już wybranych
 */
export function getSuggestedTags(selectedTags: string[]): string[] {
  // Prosta logika: jeśli wybrano partię ciała, zasugeruj powiązane mięśnie
  const suggestions: string[] = [];

  for (const tag of selectedTags) {
    if (tag.includes("Biodra") || tag.includes("Pośladki")) {
      suggestions.push(
        "Mięsień pośladkowy wielki (gluteus maximus)",
        "Mięsień pośladkowy średni (gluteus medius)",
        "Mięsień gruszkowaty (piriformis)"
      );
    }
    if (tag.includes("Uda")) {
      suggestions.push(
        "Mięsień czworogłowy uda (quadriceps)",
        "Mięśnie kulszowo-goleniowe (hamstrings)",
        "Przywodziciele (adductors)"
      );
    }
    if (tag.includes("Plecy")) {
      suggestions.push(
        "Mięsień najszerszy grzbietu (latissimus dorsi)",
        "Mięsień prostownik grzbietu (erector spinae)",
        "Mięśnie przykręgosłupowe"
      );
    }
    if (tag.includes("Core") || tag.includes("Brzuch")) {
      suggestions.push(
        "Mięsień prosty brzucha (rectus abdominis)",
        "Mięśnie skośne brzucha",
        "Mięsień poprzeczny brzucha"
      );
    }
    if (tag.includes("Barki")) {
      suggestions.push(
        "Mięsień naramienny (deltoid)",
        "Mięsień czworoboczny (trapezius)",
        "Rotatory barku"
      );
    }
  }

  // Usuń duplikaty i już wybrane
  return [...new Set(suggestions)].filter(s => !selectedTags.includes(s));
}
